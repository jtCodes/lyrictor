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

    if (window.opener) {
      window.opener.postMessage(
        { type: "openrouter-callback", code },
        window.location.origin
      );
    }
    window.close();
  }, []);

  return <p style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>Completing sign-in…</p>;
}
