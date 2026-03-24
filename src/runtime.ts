import { isDesktopApp } from "./platform";

async function loadDesktopBridge() {
  return import("./desktop/bridge");
}

export async function openExternalUrl(url: string) {
  if (isDesktopApp) {
    const { openDesktopExternalUrl } = await loadDesktopBridge();
    await openDesktopExternalUrl(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function fetchMediaArrayBuffer(url: string) {
  if (isDesktopApp) {
    const { fetchDesktopMediaArrayBuffer } = await loadDesktopBridge();
    return fetchDesktopMediaArrayBuffer(url);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

export { isDesktopApp };