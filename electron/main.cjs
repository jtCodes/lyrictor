const path = require("node:path");
const crypto = require("node:crypto");
const { access, readFile, stat } = require("node:fs/promises");
const { fileURLToPath } = require("node:url");
const { app, BrowserWindow, ipcMain, protocol, shell } = require("electron");
const {
  MEDIA_PROTOCOL,
  getYouTubeCacheDirectory,
  resolveYouTubeAudio,
} = require("./youtubeResolver.cjs");

const devServerUrl = process.env.LYRICTOR_ELECTRON_DEV_SERVER_URL;
const rendererBuildDir = "build-desktop";
const GOOGLE_AUTH_PROTOCOL = "lyrictor";
const GOOGLE_AUTH_CALLBACK_HOST = "auth";
const GOOGLE_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

let mainWindow = null;
let pendingGoogleAuth = null;
let queuedGoogleAuthUrl = null;

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createOAuthState() {
  return toBase64Url(crypto.randomBytes(24));
}

function findProtocolUrl(argv) {
  return argv.find((value) =>
    typeof value === "string" && value.startsWith(`${GOOGLE_AUTH_PROTOCOL}://`)
  );
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
}

function cleanupPendingGoogleAuth() {
  if (!pendingGoogleAuth) {
    return;
  }

  if (pendingGoogleAuth.timeoutId) {
    clearTimeout(pendingGoogleAuth.timeoutId);
  }

  pendingGoogleAuth = null;
}

async function redeemGoogleAuthCode(authBaseUrl, code, state) {
  const redeemUrl = new URL("/desktop-auth/redeem", authBaseUrl);
  const response = await fetch(redeemUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, state }),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Desktop auth redeem failed: ${response.status} ${response.statusText}`
    );
  }

  const idToken =
    payload?.idToken || payload?.id_token || payload?.tokens?.id_token || null;

  if (typeof idToken !== "string" || idToken.length === 0) {
    throw new Error("Desktop auth redeem response did not include a Google ID token.");
  }

  return { idToken };
}

function completePendingGoogleAuth(urlString) {
  let callbackUrl;

  try {
    callbackUrl = new URL(urlString);
  } catch {
    return false;
  }

  if (
    callbackUrl.protocol !== `${GOOGLE_AUTH_PROTOCOL}:` ||
    callbackUrl.hostname !== GOOGLE_AUTH_CALLBACK_HOST
  ) {
    return false;
  }

  if (!pendingGoogleAuth) {
    queuedGoogleAuthUrl = urlString;
    return true;
  }

  const { state, authBaseUrl, resolve, reject } = pendingGoogleAuth;
  const returnedClientState =
    callbackUrl.searchParams.get("client_state") ||
    callbackUrl.searchParams.get("desktop_state");
  const returnedState = callbackUrl.searchParams.get("state");
  const code = callbackUrl.searchParams.get("code");
  const error = callbackUrl.searchParams.get("error");

  cleanupPendingGoogleAuth();
  focusMainWindow();

  if (error) {
    reject(new Error(error));
    return true;
  }

  if (returnedClientState && returnedClientState !== state) {
    reject(new Error("Desktop auth returned an invalid client state."));
    return true;
  }

  if (!returnedState) {
    reject(new Error("Desktop auth callback did not include a state."));
    return true;
  }

  if (!code) {
    reject(new Error("Desktop auth callback did not include a redeem code."));
    return true;
  }

  redeemGoogleAuthCode(authBaseUrl, code, returnedState)
    .then(resolve)
    .catch(reject);

  return true;
}

function registerProtocolClient() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(GOOGLE_AUTH_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }

  app.setAsDefaultProtocolClient(GOOGLE_AUTH_PROTOCOL);
}

async function signInWithGoogleDesktop(authBaseUrl) {
  if (!authBaseUrl) {
    throw new Error("Missing desktop auth backend URL.");
  }

  if (pendingGoogleAuth) {
    throw new Error("Google sign-in is already in progress.");
  }

  let normalizedAuthBaseUrl;

  try {
    normalizedAuthBaseUrl = new URL(authBaseUrl).toString();
  } catch {
    throw new Error("Desktop auth backend URL is invalid.");
  }

  const state = createOAuthState();
  const startUrl = new URL("/desktop-auth/start", normalizedAuthBaseUrl);
  startUrl.searchParams.set("client_state", state);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanupPendingGoogleAuth();
      reject(new Error("Google sign-in timed out waiting for the desktop callback."));
    }, GOOGLE_AUTH_TIMEOUT_MS);

    pendingGoogleAuth = {
      authBaseUrl: normalizedAuthBaseUrl,
      reject,
      resolve,
      state,
      timeoutId,
    };

    if (queuedGoogleAuthUrl) {
      const queuedUrl = queuedGoogleAuthUrl;
      queuedGoogleAuthUrl = null;
      if (completePendingGoogleAuth(queuedUrl)) {
        return;
      }
    }

    shell.openExternal(startUrl.toString()).catch((error) => {
      cleanupPendingGoogleAuth();
      reject(error);
    });
  });
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

app.on("second-instance", (_event, argv) => {
  focusMainWindow();

  const protocolUrl = findProtocolUrl(argv);

  if (protocolUrl) {
    completePendingGoogleAuth(protocolUrl);
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  completePendingGoogleAuth(url);
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function getMediaContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".weba":
    case ".webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

function isPathInsideDirectory(filePath, directoryPath) {
  const normalizedDirectoryPath = path.resolve(directoryPath);
  const normalizedFilePath = path.resolve(filePath);

  return (
    normalizedFilePath === normalizedDirectoryPath ||
    normalizedFilePath.startsWith(`${normalizedDirectoryPath}${path.sep}`)
  );
}

function resolveLocalMediaPath(url) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol === "file:") {
    return fileURLToPath(parsedUrl);
  }

  if (parsedUrl.protocol !== `${MEDIA_PROTOCOL}:`) {
    return undefined;
  }

  if (parsedUrl.hostname !== "youtube-cache") {
    throw new Error(`Unsupported media host: ${parsedUrl.hostname}`);
  }

  const encodedPath = parsedUrl.pathname.startsWith("/")
    ? parsedUrl.pathname.slice(1)
    : parsedUrl.pathname;
  const filePath = decodeURIComponent(encodedPath);
  const cacheDirectory = getYouTubeCacheDirectory();

  if (!isPathInsideDirectory(filePath, cacheDirectory)) {
    throw new Error("Blocked access to media file outside the YouTube cache.");
  }

  return filePath;
}

function parseRangeHeader(rangeHeader, fileSize) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return undefined;
  }

  const [startPart, endPart] = rangeHeader.replace("bytes=", "").split("-");

  if (startPart === "" && endPart === "") {
    return undefined;
  }

  let start;
  let end;

  if (startPart === "") {
    const suffixLength = Number.parseInt(endPart, 10);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return undefined;
    }

    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number.parseInt(startPart, 10);
    end = endPart ? Number.parseInt(endPart, 10) : fileSize - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return undefined;
    }
  }

  if (start < 0 || end < start || start >= fileSize) {
    return { invalid: true };
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
}

async function fetchMediaArrayBuffer(url) {
  const localMediaPath = resolveLocalMediaPath(url);

  if (localMediaPath) {
    const fileBuffer = await readFile(localMediaPath);
    return fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

async function loadDevServerWithRetry(mainWindow, attempts = 20) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mainWindow.loadURL(devServerUrl);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#050505",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(
        `Electron failed to load URL: ${validatedUrl} with error: ${errorDescription} (${errorCode})`
      );
    }
  );

  if (devServerUrl) {
    loadDevServerWithRetry(mainWindow).catch((error) => {
      console.error("Electron could not load the dev server URL", error);
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return mainWindow;
  }

  mainWindow.loadFile(
    path.join(app.getAppPath(), rendererBuildDir, "index.html")
  );
  return mainWindow;
}

ipcMain.handle("shell:openExternal", async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle("media:fetchArrayBuffer", async (_event, url) => {
  return fetchMediaArrayBuffer(url);
});

ipcMain.handle("media:cachedFileExists", async (_event, filePath) => {
  const cacheDirectory = getYouTubeCacheDirectory();

  if (!isPathInsideDirectory(filePath, cacheDirectory)) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("auth:signInWithGoogle", async (_event, authBaseUrl) => {
  const result = await signInWithGoogleDesktop(authBaseUrl);
  app.focus({ steal: true });
  return result;
});

ipcMain.handle("media:resolveYouTubeAudio", async (_event, url) => {
  const result = await resolveYouTubeAudio(url);
  app.focus({ steal: true });
  return result;
});

app.whenReady().then(async () => {
  registerProtocolClient();

  const protocolUrl = findProtocolUrl(process.argv);

  if (protocolUrl) {
    completePendingGoogleAuth(protocolUrl);
  }

  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    try {
      const localMediaPath = resolveLocalMediaPath(request.url);

      if (!localMediaPath) {
        return new Response("Unsupported media URL.", { status: 400 });
      }

      const fileStats = await stat(localMediaPath);
      const rangeHeader = request.headers.get("range");
      const parsedRange = parseRangeHeader(rangeHeader, fileStats.size);

      if (parsedRange?.invalid) {
        return new Response("Requested range not satisfiable.", {
          status: 416,
          headers: {
            "content-range": `bytes */${fileStats.size}`,
            "accept-ranges": "bytes",
            "cache-control": "no-store",
          },
        });
      }

      const fileBuffer = parsedRange
        ? await readFile(localMediaPath).then((buffer) =>
            buffer.subarray(parsedRange.start, parsedRange.end + 1)
          )
        : await readFile(localMediaPath);

      const headers = {
        "accept-ranges": "bytes",
        "cache-control": "no-store",
        "content-type": getMediaContentType(localMediaPath),
      };

      if (parsedRange) {
        headers["content-length"] = String(parsedRange.end - parsedRange.start + 1);
        headers["content-range"] = `bytes ${parsedRange.start}-${parsedRange.end}/${fileStats.size}`;

        return new Response(fileBuffer, {
          status: 206,
          headers,
        });
      }

      return new Response(fileBuffer, {
        headers: {
          ...headers,
          "content-length": String(fileStats.size),
        },
      });
    } catch (error) {
      return new Response(error.message || "Failed to load cached media.", {
        status: 404,
      });
    }
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});