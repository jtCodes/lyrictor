export const isDesktopApp =
  typeof window !== "undefined" &&
  (window.lyrictorDesktop?.isDesktop === true ||
    window.navigator.userAgent.toLowerCase().includes("electron"));