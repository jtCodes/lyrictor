const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
const OPENROUTER_KEY_EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys";
const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

let pendingCodeVerifier: string | null = null;

export type OpenRouterRole = "system" | "user" | "assistant";

export interface OpenRouterTextPart {
  type: "text";
  text: string;
}

export interface OpenRouterImageUrlPart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type OpenRouterMessageContent =
  | string
  | Array<OpenRouterTextPart | OpenRouterImageUrlPart>;

export interface OpenRouterMessage {
  role: OpenRouterRole;
  content: OpenRouterMessageContent;
}

export interface OpenRouterResponseImage {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export interface OpenRouterResponseUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
}

export interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      role: string;
      content: string | null;
      images?: OpenRouterResponseImage[];
    };
  }>;
  usage?: OpenRouterResponseUsage;
}

export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
}

export interface OpenRouterModel {
  id: string;
  pricing?: OpenRouterModelPricing;
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

function getOpenRouterHeaders(apiKey?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "HTTP-Referer": window.location.origin,
    "X-OpenRouter-Title": "Lyrictor",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

async function parseOpenRouterError(response: Response): Promise<string> {
  const body = await response.text();
  return body || `Request failed with status ${response.status}`;
}

export async function createOpenRouterChatCompletion({
  apiKey,
  model,
  messages,
  modalities,
}: {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  modalities?: Array<"text" | "image">;
}): Promise<OpenRouterChatCompletionResponse> {
  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      ...(modalities ? { modalities } : {}),
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseOpenRouterError(response);
    throw new Error(`OpenRouter API error ${response.status}: ${errorMessage}`);
  }

  return response.json();
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: getOpenRouterHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const data: OpenRouterModelsResponse = await response.json();
  return data.data ?? [];
}

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create SHA-256 code challenge from verifier (S256 method)
 */
async function createCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  // base64url encode
  const hashArray = new Uint8Array(hash);
  const base64 = btoa(String.fromCharCode(...hashArray));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Start the OpenRouter OAuth PKCE flow in a popup window.
 * Generates a code verifier, stores it in sessionStorage,
 * and opens OpenRouter's auth page in a new tab.
 * Returns a promise that resolves with the auth code, or null if cancelled.
 */
export async function startOpenRouterAuth(): Promise<string | null> {
  const codeVerifier = generateCodeVerifier();
  pendingCodeVerifier = codeVerifier;

  const codeChallenge = await createCodeChallenge(codeVerifier);
  const callbackUrl = window.location.origin + "/auth/callback";

  const authUrl =
    `${OPENROUTER_AUTH_URL}?callback_url=${encodeURIComponent(callbackUrl)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  return new Promise((resolve) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      "openrouter-auth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      resolve(null);
      return;
    }

    let resolved = false;

    function cleanup() {
      window.removeEventListener("storage", onStorage);
      clearInterval(closedCheck);
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== "openrouter-auth-code") return;
      if (resolved) return;
      resolved = true;
      const code = event.newValue || null;
      localStorage.removeItem("openrouter-auth-code");
      cleanup();
      resolve(code);
    }

    window.addEventListener("storage", onStorage);

    // If the user closes the popup without completing auth
    const closedCheck = setInterval(() => {
      if (popup.closed && !resolved) {
        // Give the storage event a moment to fire
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            localStorage.removeItem("openrouter-auth-code");
            cleanup();
            resolve(null);
          }
        }, 500);
      }
    }, 500);
  });
}

/**
 * Exchange the authorization code (from URL params) for a user API key.
 * Returns the API key string, or null if the exchange fails.
 */
export async function exchangeCodeForKey(
  code: string
): Promise<string | null> {
  const codeVerifier = pendingCodeVerifier;
  if (!codeVerifier) {
    console.error("OpenRouter: Missing code_verifier");
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_KEY_EXCHANGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        code_challenge_method: "S256",
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter: Key exchange failed", response.status);
      return null;
    }

    const { key } = await response.json();
    pendingCodeVerifier = null;
    return key ?? null;
  } catch (error) {
    console.error("OpenRouter: Key exchange error", error);
    return null;
  }
}

export async function authenticateWithOpenRouter(): Promise<string | null> {
  const code = await startOpenRouterAuth();
  if (!code) {
    return null;
  }

  return exchangeCodeForKey(code);
}
