/**
 * Validates that a URL points to a playable audio stream by trying to load it
 * in an Audio element. This catches non-audio URLs, CORS issues, and 404s.
 */
export function validateAudioUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      new URL(url);
    } catch {
      resolve(false);
      return;
    }

    const audio = new Audio();
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      audio.removeEventListener("canplay", onSuccess);
      audio.removeEventListener("error", onError);
      audio.src = "";
      audio.load();
    };
    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onSuccess = () => settle(true);
    const onError = () => settle(false);

    audio.addEventListener("canplay", onSuccess);
    audio.addEventListener("error", onError);
    audio.preload = "metadata";
    audio.src = url;

    // Timeout after 8s
    timeoutId = setTimeout(() => settle(false), 8000);
  });
}
