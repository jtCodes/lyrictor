const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
const OPENROUTER_KEY_EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys";

const CODE_VERIFIER_KEY = "openrouter_code_verifier";

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
 * Start the OpenRouter OAuth PKCE flow.
 * Generates a code verifier, stores it in sessionStorage,
 * and redirects the user to OpenRouter's auth page.
 */
export async function startOpenRouterAuth(): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const codeChallenge = await createCodeChallenge(codeVerifier);
  const callbackUrl = window.location.origin + window.location.pathname;

  const authUrl =
    `${OPENROUTER_AUTH_URL}?callback_url=${encodeURIComponent(callbackUrl)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  window.location.href = authUrl;
}

/**
 * Exchange the authorization code (from URL params) for a user API key.
 * Returns the API key string, or null if the exchange fails.
 */
export async function exchangeCodeForKey(
  code: string
): Promise<string | null> {
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    console.error("OpenRouter: Missing code_verifier in sessionStorage");
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
    sessionStorage.removeItem(CODE_VERIFIER_KEY);
    return key ?? null;
  } catch (error) {
    console.error("OpenRouter: Key exchange error", error);
    return null;
  }
}
