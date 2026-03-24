export const isDesktopApp =
  typeof window !== "undefined" &&
  (window.lyrictorDesktop?.isDesktop === true ||
    window.navigator.userAgent.toLowerCase().includes("electron"));

export async function openExternalUrl(url: string) {
  if (window.lyrictorDesktop?.openExternal) {
    await window.lyrictorDesktop.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function fetchMediaArrayBuffer(url: string) {
  if (window.lyrictorDesktop?.fetchArrayBuffer) {
    return window.lyrictorDesktop.fetchArrayBuffer(url);
  }

  if (isDesktopApp) {
    throw new Error(
      "Desktop media bridge is unavailable. Restart Electron so the updated preload script is loaded."
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}