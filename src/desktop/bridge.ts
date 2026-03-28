type DesktopBridge = NonNullable<Window["lyrictorDesktop"]>;

function requireDesktopBridge(): DesktopBridge {
  if (!window.lyrictorDesktop) {
    throw new Error(
      "Desktop bridge is unavailable. Restart Electron so the updated preload script is loaded."
    );
  }

  return window.lyrictorDesktop;
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