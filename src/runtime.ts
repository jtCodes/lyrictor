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