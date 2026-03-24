const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { URL } = require("node:url");
const querystring = require("node:querystring");
const { shell } = require("electron");

const googleIssuer = "https://accounts.google.com";
const googleScope = "openid email profile";
const loopbackHost = "localhost";
const authTimeoutMs = 5 * 60 * 1000;
let cachedDotEnv = null;
let cachedGoogleConfiguration = null;

function readDotEnvFile() {
  if (cachedDotEnv !== null) {
    return cachedDotEnv;
  }

  try {
    const envPath = path.join(process.cwd(), ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const parsed = {};

    envContent.split(/\r?\n/).forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        return;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      parsed[key] = value;
    });

    cachedDotEnv = parsed;
  } catch {
    cachedDotEnv = {};
  }

  return cachedDotEnv;
}

function getDesktopClientSecret(providedClientSecret) {
  if (providedClientSecret) {
    return providedClientSecret;
  }

  if (process.env.GOOGLE_DESKTOP_CLIENT_SECRET) {
    return process.env.GOOGLE_DESKTOP_CLIENT_SECRET;
  }

  return readDotEnvFile().GOOGLE_DESKTOP_CLIENT_SECRET || undefined;
}

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair() {
  const codeVerifier = toBase64Url(crypto.randomBytes(96));
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  return { codeChallenge, codeVerifier };
}

function createOAuthState() {
  return toBase64Url(crypto.randomBytes(16));
}

async function getAvailableLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to determine a free loopback port.")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function getGoogleOpenIdConfiguration() {
  if (cachedGoogleConfiguration) {
    return cachedGoogleConfiguration;
  }

  const response = await fetch(`${googleIssuer}/.well-known/openid-configuration`);

  if (!response.ok) {
    throw new Error(`Failed to load Google OpenID configuration: ${response.status} ${response.statusText}`);
  }

  cachedGoogleConfiguration = await response.json();
  return cachedGoogleConfiguration;
}

async function exchangeAuthorizationCode({
  clientId,
  clientSecret,
  code,
  codeVerifier,
  redirectUri,
  tokenEndpoint,
}) {
  const requestBody = {
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };

  if (clientSecret) {
    requestBody.client_secret = clientSecret;
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify(requestBody),
  });

  const responseText = await response.text();
  let responseBody = null;

  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    const normalizedError = responseBody?.error;
    const normalizedDescription = responseBody?.error_description;

    console.error("[google-auth] token exchange failed", {
      status: response.status,
      body: responseBody,
    });

    let message =
      normalizedDescription ||
      normalizedError ||
      response.statusText ||
      "Google token exchange failed.";

    if (
      normalizedError === "invalid_request" &&
      normalizedDescription === "client_secret is missing."
    ) {
      message =
        `Google's token endpoint is requiring a client secret for the configured desktop OAuth client. Set GOOGLE_DESKTOP_CLIENT_SECRET for the Electron main process only. Runtime client ID: ${clientId}`;
    }

    throw new Error(message);
  }

  if (!responseBody?.id_token) {
    throw new Error("Google token response did not include an ID token.");
  }

  return { idToken: responseBody.id_token };
}

async function signInWithGoogleDesktop(clientId, providedClientSecret) {
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_DESKTOP_CLIENT_ID for desktop Google sign-in.");
  }

  const googleRedirectPort = await getAvailableLoopbackPort();
  const googleRedirectUri = `http://${loopbackHost}:${googleRedirectPort}`;
  const clientSecret = getDesktopClientSecret(providedClientSecret);
  const configuration = await getGoogleOpenIdConfiguration();

  return new Promise(async (resolve, reject) => {
    let settled = false;
    let timeoutId = null;
    let callbackServer = null;

    const oauthState = createOAuthState();
    const { codeChallenge, codeVerifier } = createPkcePair();

    const finish = (callback) => (value) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (callbackServer) {
        callbackServer.close();
      }

      callback(value);
    };

    const resolveOnce = finish(resolve);
    const rejectOnce = finish(reject);

    const sendBrowserResponse = (response, statusCode, html) => {
      response.statusCode = statusCode;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(html);
    };

    const handleAuthorizationCallback = async (requestUrl, response) => {
      const callbackUrl = new URL(requestUrl, googleRedirectUri);
      const state = callbackUrl.searchParams.get("state");
      const code = callbackUrl.searchParams.get("code");
      const error = callbackUrl.searchParams.get("error");
      const errorDescription = callbackUrl.searchParams.get("error_description");

      if (!state && !code && !error) {
        sendBrowserResponse(response, 204, "");
        return;
      }

      if (error) {
        sendBrowserResponse(
          response,
          400,
          "Google sign-in was cancelled or failed. You can close this window and return to Lyrictor.",
        );
        rejectOnce(new Error(errorDescription || error || "Google sign-in failed."));
        return;
      }

      if (!code) {
        sendBrowserResponse(
          response,
          400,
          "Google sign-in did not return an authorization code. You can close this window and return to Lyrictor.",
        );
        rejectOnce(new Error("Google sign-in did not return an authorization code."));
        return;
      }

      if (state !== oauthState) {
        sendBrowserResponse(
          response,
          400,
          "Google sign-in returned an invalid state. You can close this window and return to Lyrictor.",
        );
        rejectOnce(new Error("Google sign-in returned an invalid state."));
        return;
      }

      try {
        const tokenResponse = await exchangeAuthorizationCode({
          code,
          clientId,
          clientSecret,
          codeVerifier,
          redirectUri: googleRedirectUri,
          tokenEndpoint: configuration.token_endpoint,
        });

        sendBrowserResponse(
          response,
          200,
          "Sign-in completed. You can close this window and return to Lyrictor.",
        );

        resolveOnce(tokenResponse);
      } catch (tokenError) {
        sendBrowserResponse(
          response,
          500,
          "Google sign-in failed. You can close this window and return to Lyrictor.",
        );
        rejectOnce(tokenError);
      }
    };

    try {
      callbackServer = http.createServer((incomingRequest, response) => {
        const requestUrl = incomingRequest.url || "/";

        handleAuthorizationCallback(requestUrl, response).catch((error) => {
          if (!response.headersSent) {
            sendBrowserResponse(
              response,
              500,
              "Google sign-in failed. You can close this window and return to Lyrictor.",
            );
          }
          rejectOnce(error);
        });
      });

      callbackServer.on("error", (error) => {
        rejectOnce(error);
      });

      await new Promise((serverResolve, serverReject) => {
        callbackServer.once("error", serverReject);
        callbackServer.listen(googleRedirectPort, loopbackHost, () => {
          callbackServer.off("error", serverReject);
          serverResolve();
        });
      });

      timeoutId = setTimeout(() => {
        rejectOnce(new Error("Google sign-in timed out waiting for the browser callback."));
      }, authTimeoutMs);

      const authorizationUrl = new URL(configuration.authorization_endpoint);
      authorizationUrl.searchParams.set("client_id", clientId);
      authorizationUrl.searchParams.set("redirect_uri", googleRedirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", googleScope);
      authorizationUrl.searchParams.set("state", oauthState);
      authorizationUrl.searchParams.set("code_challenge", codeChallenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      authorizationUrl.searchParams.set("prompt", "select_account");

      await shell.openExternal(authorizationUrl.toString());
    } catch (authorizationError) {
      rejectOnce(authorizationError);
    }
  });
}

module.exports = {
  signInWithGoogleDesktop,
};