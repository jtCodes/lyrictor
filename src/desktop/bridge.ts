type DesktopBridge = NonNullable<Window["lyrictorDesktop"]>;

function requireDesktopBridge(): DesktopBridge {
  if (!window.lyrictorDesktop) {
    throw new Error(
      "Desktop bridge is unavailable. Restart Electron so the updated preload script is loaded."
    );
  }

  return window.lyrictorDesktop;
}

export async function openDesktopExternalUrl(url: string) {
  await requireDesktopBridge().openExternal(url);
}

export async function fetchDesktopMediaArrayBuffer(url: string) {
  return requireDesktopBridge().fetchArrayBuffer(url);
}

export async function signInWithDesktopGoogle(clientId: string) {
  return requireDesktopBridge().signInWithGoogle(clientId);
}

export async function resolveDesktopYouTubeAudio(url: string) {
  return requireDesktopBridge().resolveYouTubeAudio(url);
}