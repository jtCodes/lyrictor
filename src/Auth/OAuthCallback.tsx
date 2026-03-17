import { useEffect } from "react";

/**
 * Lightweight route that handles OAuth callback redirects.
 * Reads the `code` param from the URL, sends it back to the
 * opener window via postMessage, and closes the popup.
 */
export default function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    console.log("[OAuthCallback] loaded, code:", code);

    // Write code to localStorage — the opener listens via the 'storage' event.
    // This works even when window.opener is null (Safari strips it after
    // cross-origin redirects through openrouter.ai).
    localStorage.setItem("openrouter-auth-code", code ?? "");
    // Clear immediately — the storage event already captured the value
    localStorage.removeItem("openrouter-auth-code");
    window.close();
  }, []);

  return <p style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>Completing sign-in…</p>;
}
