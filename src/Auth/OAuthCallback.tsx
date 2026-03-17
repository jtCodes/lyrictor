import { useEffect } from "react";

/**
 * Lightweight route that handles OAuth callback redirects.
 * Reads the `code` param from the URL, sends it back to the
 * opener window via BroadcastChannel, and closes the tab.
 */
export default function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    const channel = new BroadcastChannel("openrouter-auth");
    channel.postMessage({ type: "openrouter-callback", code });
    channel.close();
    window.close();
  }, []);

  return <p style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>Completing sign-in…</p>;
}
