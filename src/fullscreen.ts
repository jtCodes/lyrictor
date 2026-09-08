// Native fullscreen when available, with a page-sized fallback for mobile canvases.
let pageFullscreen = false;
let requestVersion = 0;
export const PAGE_FULLSCREEN_CHANGE = "lyrictor-page-fullscreenchange";

export function isDocumentFullscreen() {
  if (typeof document === "undefined") {
    return false;
  }

  const documentAny = document as any;

  return pageFullscreen || Boolean(
    document.fullscreenElement ||
      documentAny.webkitFullscreenElement ||
      documentAny.webkitCurrentFullScreenElement ||
      documentAny.mozFullScreenElement ||
      documentAny.msFullscreenElement ||
      documentAny.webkitIsFullScreen ||
      documentAny.mozFullScreen
  );
}

function isMobileFullscreenDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function requestNativeFullscreen() {
  const elementAny = document.documentElement as any;

  if (elementAny.requestFullscreen) {
    if (isMobileFullscreenDevice()) {
      if (document.fullscreenEnabled === false) throw new Error("Native fullscreen unavailable");
      await elementAny.requestFullscreen({ navigationUI: "hide" });
    } else {
      await elementAny.requestFullscreen();
    }
    return;
  }

  if (elementAny.webkitRequestFullscreen) {
    await elementAny.webkitRequestFullscreen();
    return;
  }

  if (elementAny.webkitRequestFullScreen) {
    await elementAny.webkitRequestFullScreen();
    return;
  }

  if (elementAny.mozRequestFullScreen) {
    await elementAny.mozRequestFullScreen();
    return;
  }

  if (elementAny.msRequestFullscreen) {
    await elementAny.msRequestFullscreen();
    return;
  }
  if (isMobileFullscreenDevice()) throw new Error("Native fullscreen unavailable");
}

async function exitNativeFullscreen() {
  const documentAny = document as any;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (documentAny.webkitExitFullscreen) {
    await documentAny.webkitExitFullscreen();
    return;
  }

  if (documentAny.webkitCancelFullScreen) {
    await documentAny.webkitCancelFullScreen();
    return;
  }

  if (documentAny.mozCancelFullScreen) {
    await documentAny.mozCancelFullScreen();
    return;
  }

  if (documentAny.msExitFullscreen) {
    await documentAny.msExitFullscreen();
  }
}

function onEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && pageFullscreen) void exitDocumentFullscreen();
}

export async function requestDocumentFullscreen() {
  if (isDocumentFullscreen()) return;
  const version = ++requestVersion;
  try {
    await requestNativeFullscreen();
    if (version !== requestVersion && isDocumentFullscreen()) await exitNativeFullscreen();
  } catch (error) {
    if (version !== requestVersion) return;
    if (!isMobileFullscreenDevice()) throw error;
    // The preview already covers the viewport. Leave document scrolling alone:
    // locking html/body can interfere with Safari's automatic toolbar collapse.
    pageFullscreen = true;
    document.addEventListener("keydown", onEscape);
    document.dispatchEvent(new Event(PAGE_FULLSCREEN_CHANGE));
  }
}

export async function exitDocumentFullscreen() {
  requestVersion++;
  if (pageFullscreen) {
    pageFullscreen = false;
    document.removeEventListener("keydown", onEscape);
    document.dispatchEvent(new Event(PAGE_FULLSCREEN_CHANGE));
    return;
  }
  if (isDocumentFullscreen()) await exitNativeFullscreen();
}

/** Route changes clear only the mobile fallback/pending entry, not desktop fullscreen. */
export function resetMobilePageFullscreen() {
  if (!isMobileFullscreenDevice()) return;
  requestVersion++;
  if (pageFullscreen) void exitDocumentFullscreen();
}
