import { getDesktopAppInfo } from "./desktop/bridge";
import { openExternalUrl } from "./runtime";

const GITHUB_RELEASES_API_URL = "https://api.github.com/repos/jtCodes/lyrictor/releases/latest";
const GITHUB_RELEASES_PAGE_URL = "https://github.com/jtCodes/lyrictor/releases";

interface GitHubReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

export type UpdateCheckResult =
  | {
      status: "unavailable";
      message: string;
    }
  | {
      status: "up-to-date";
      currentVersion: string;
      latestVersion: string;
    }
  | {
      status: "update-available";
      currentVersion: string;
      latestVersion: string;
      downloadUrl: string;
      openedReleasePage: boolean;
    };

function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "").split("+")[0];
}

function parseSemver(value: string) {
  const normalized = normalizeVersion(value);
  const [corePart, prereleasePart] = normalized.split("-", 2);
  const core = corePart.split(".").map((segment) => Number.parseInt(segment, 10) || 0);
  const prerelease = prereleasePart?.split(".") ?? [];

  return {
    core,
    prerelease,
  };
}

function compareIdentifiers(left: string, right: string) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    return Number.parseInt(left, 10) - Number.parseInt(right, 10);
  }

  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return left.localeCompare(right);
}

function compareSemver(left: string, right: string) {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  const coreLength = Math.max(parsedLeft.core.length, parsedRight.core.length);

  for (let index = 0; index < coreLength; index += 1) {
    const diff = (parsedLeft.core[index] ?? 0) - (parsedRight.core[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  const leftPrerelease = parsedLeft.prerelease;
  const rightPrerelease = parsedRight.prerelease;

  if (leftPrerelease.length === 0 && rightPrerelease.length === 0) {
    return 0;
  }

  if (leftPrerelease.length === 0) {
    return 1;
  }

  if (rightPrerelease.length === 0) {
    return -1;
  }

  const prereleaseLength = Math.max(leftPrerelease.length, rightPrerelease.length);

  for (let index = 0; index < prereleaseLength; index += 1) {
    const leftPart = leftPrerelease[index];
    const rightPart = rightPrerelease[index];

    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const diff = compareIdentifiers(leftPart, rightPart);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function findBestDmgAsset(assets: GitHubReleaseAsset[], arch: string) {
  const dmgAssets = assets.filter(
    (asset) => typeof asset.name === "string" && asset.name.toLowerCase().endsWith(".dmg")
  );

  if (dmgAssets.length === 0) {
    return undefined;
  }

  const normalizedArch = arch.toLowerCase();
  const preferredMatchers =
    normalizedArch === "arm64"
      ? ["arm64", "universal"]
      : normalizedArch === "x64"
        ? ["x64", "universal"]
        : [normalizedArch, "universal"];

  for (const matcher of preferredMatchers) {
    const match = dmgAssets.find((asset) => asset.name?.toLowerCase().includes(matcher));
    if (match) {
      return match;
    }
  }

  return dmgAssets[0];
}

async function fetchLatestRelease() {
  const response = await fetch(GITHUB_RELEASES_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as GitHubRelease;
}

export async function checkForDesktopUpdate(): Promise<UpdateCheckResult> {
  const appInfo = await getDesktopAppInfo();

  if (!appInfo.isPackaged) {
    return {
      status: "unavailable",
      message: "Update checks are only available in the packaged desktop app.",
    };
  }

  const release = await fetchLatestRelease();
  const currentVersion = normalizeVersion(appInfo.version);
  const latestVersion = normalizeVersion(release.tag_name ?? "");

  if (!latestVersion) {
    throw new Error("The latest GitHub release is missing a version tag.");
  }

  if (compareSemver(latestVersion, currentVersion) <= 0) {
    return {
      status: "up-to-date",
      currentVersion,
      latestVersion,
    };
  }

  const asset = findBestDmgAsset(release.assets ?? [], appInfo.arch);
  const downloadUrl = asset?.browser_download_url ?? release.html_url ?? GITHUB_RELEASES_PAGE_URL;

  return {
    status: "update-available",
    currentVersion,
    latestVersion,
    downloadUrl,
    openedReleasePage: !asset?.browser_download_url,
  };
}

export async function openUpdateDownload(url: string) {
  await openExternalUrl(url);
}