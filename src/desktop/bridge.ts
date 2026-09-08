type DesktopBridge = NonNullable<Window["lyrictorDesktop"]>;

function requireDesktopBridge(): DesktopBridge {
  let bridge = window.lyrictorDesktop;
  // Version previews run the same app in an isolated frame. Electron preloads
  // belong to the main frame; use its bridge only for our same-origin preview.
  if (!bridge && window.parent !== window) {
    try {
      const query = window.location.hash.includes("?")
        ? window.location.hash.split("?")[1] : window.location.search;
      const previewKey = new URLSearchParams(query).get("versionPreview");
      if (previewKey?.startsWith("lyrictor-version-preview:") &&
          window.parent.location.origin === window.location.origin) {
        bridge = window.parent.lyrictorDesktop;
      }
    } catch { /* A cross-origin frame cannot access the desktop bridge. */ }
  }
  if (!bridge) {
    throw new Error(
      "Desktop bridge is unavailable. Restart Electron so the updated preload script is loaded."
    );
  }

  return bridge;
}

export async function getDesktopAppInfo() {
  return requireDesktopBridge().getAppInfo();
}

export async function openDesktopExternalUrl(url: string) {
  await requireDesktopBridge().openExternal(url);
}

export async function fetchDesktopMediaArrayBuffer(url: string) {
  return requireDesktopBridge().fetchArrayBuffer(url);
}

export async function cachedDesktopFileExists(filePath: string) {
  return requireDesktopBridge().cachedFileExists(filePath);
}

export async function getDesktopYouTubeCacheDirectory() {
  return requireDesktopBridge().getYouTubeCacheDirectory();
}

export async function openDesktopYouTubeCacheDirectory() {
  return requireDesktopBridge().openYouTubeCacheDirectory();
}

export async function signInWithDesktopGoogle(authBaseUrl: string) {
  return requireDesktopBridge().signInWithGoogle(authBaseUrl);
}

export async function resolveDesktopYouTubeAudio(url: string) {
  return requireDesktopBridge().resolveYouTubeAudio(url);
}