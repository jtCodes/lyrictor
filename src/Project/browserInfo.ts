import { isDesktopApp } from "../platform";

export interface BrowserInfo {
  name: string;
  version?: string;
  os: string;
  runtime: "desktop-app" | "browser";
  userAgent: string;
  capturedAt: string;
}

function getNavigatorUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
}

function matchBrowser(userAgent: string) {
  const checks: Array<{ name: string; pattern: RegExp }> = [
    { name: "Edge", pattern: /Edg\/([\d.]+)/i },
    { name: "Opera", pattern: /OPR\/([\d.]+)/i },
    { name: "Chrome", pattern: /(?:Chrome|CriOS)\/([\d.]+)/i },
    { name: "Firefox", pattern: /(?:Firefox|FxiOS)\/([\d.]+)/i },
    { name: "Safari", pattern: /Version\/([\d.]+).*Safari/i },
    { name: "Electron", pattern: /Electron\/([\d.]+)/i },
  ];

  for (const check of checks) {
    const match = userAgent.match(check.pattern);
    if (match) {
      return {
        name: check.name,
        version: match[1],
      };
    }
  }

  return {
    name: "Unknown",
    version: undefined,
  };
}

function detectOs(userAgent: string) {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

export function getCurrentBrowserInfo(): BrowserInfo {
  const userAgent = getNavigatorUserAgent();
  const browser = matchBrowser(userAgent);

  return {
    name: browser.name,
    version: browser.version,
    os: detectOs(userAgent),
    runtime: isDesktopApp ? "desktop-app" : "browser",
    userAgent,
    capturedAt: new Date().toISOString(),
  };
}

export function withSavedBrowserInfo<T extends { savedBrowserInfo?: BrowserInfo }>(
  record: T
): T {
  return {
    ...record,
    savedBrowserInfo: getCurrentBrowserInfo(),
  };
}

export function withPublishedBrowserInfo<
  T extends { publishedBrowserInfo?: BrowserInfo }
>(record: T): T {
  return {
    ...record,
    publishedBrowserInfo: getCurrentBrowserInfo(),
  };
}