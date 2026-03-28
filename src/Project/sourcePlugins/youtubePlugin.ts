import { isDesktopApp } from "../../platform";
import { cachedDesktopFileExists, resolveDesktopYouTubeAudio } from "../../desktop/bridge";
import { ProjectDetail } from "../types";
import { ProjectSourcePlugin } from "./types";

const DESKTOP_MEDIA_PROTOCOL = "lyrictor-media://youtube-cache";
const YOUTUBE_AUDIO_CACHE_STORAGE_KEY = "lyrictorYouTubeAudioCache";

interface YouTubeAudioCacheEntry {
  cachedAudioFilePath: string;
  canonicalUrl?: string;
  videoId?: string;
  durationSeconds?: number;
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isYouTubeUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = normalizeHostname(parsedUrl.hostname);

    return (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

function getProjectSourceUrl(projectDetail: ProjectDetail) {
  return projectDetail.youtubeSourceUrl ?? projectDetail.audioFileUrl;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readYouTubeAudioCache() {
  if (!canUseLocalStorage()) {
    return {} as Record<string, YouTubeAudioCacheEntry>;
  }

  try {
    const rawCache = window.localStorage.getItem(YOUTUBE_AUDIO_CACHE_STORAGE_KEY);

    if (!rawCache) {
      return {} as Record<string, YouTubeAudioCacheEntry>;
    }

    const parsedCache = JSON.parse(rawCache) as Record<string, YouTubeAudioCacheEntry>;
    return parsedCache && typeof parsedCache === "object"
      ? parsedCache
      : ({} as Record<string, YouTubeAudioCacheEntry>);
  } catch {
    return {} as Record<string, YouTubeAudioCacheEntry>;
  }
}

function writeYouTubeAudioCache(cache: Record<string, YouTubeAudioCacheEntry>) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(YOUTUBE_AUDIO_CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function getCacheKeys(projectDetail: ProjectDetail) {
  return Array.from(
    new Set([projectDetail.audioFileUrl, projectDetail.youtubeSourceUrl].filter(Boolean) as string[])
  );
}

function getPersistedCacheEntry(projectDetail: ProjectDetail) {
  const cache = readYouTubeAudioCache();

  for (const key of getCacheKeys(projectDetail)) {
    const entry = cache[key];

    if (entry?.cachedAudioFilePath) {
      return entry;
    }
  }

  return undefined;
}

function persistResolvedProjectDetail(projectDetail: ProjectDetail) {
  const cachedAudioFilePath = projectDetail.cachedAudioFilePath;

  if (!cachedAudioFilePath || !canUseLocalStorage()) {
    return;
  }

  const cache = readYouTubeAudioCache();
  const entry: YouTubeAudioCacheEntry = {
    cachedAudioFilePath,
    canonicalUrl: projectDetail.youtubeSourceUrl,
    videoId: projectDetail.youtubeVideoId,
    durationSeconds: projectDetail.youtubeDurationSeconds,
  };

  for (const key of getCacheKeys(projectDetail)) {
    cache[key] = entry;
  }

  if (projectDetail.youtubeSourceUrl) {
    cache[projectDetail.youtubeSourceUrl] = entry;
  }

  writeYouTubeAudioCache(cache);
}

function clearPersistedProjectDetail(projectDetail: ProjectDetail) {
  if (!canUseLocalStorage()) {
    return;
  }

  const cache = readYouTubeAudioCache();

  for (const key of getCacheKeys(projectDetail)) {
    delete cache[key];
  }

  if (projectDetail.youtubeSourceUrl) {
    delete cache[projectDetail.youtubeSourceUrl];
  }

  writeYouTubeAudioCache(cache);
}

function getCachedAudioUrl(filePath: string) {
  return `${DESKTOP_MEDIA_PROTOCOL}/${encodeURIComponent(filePath)}`;
}

function getCachedAudioFilePathFromUrl(url?: string) {
  if (!url || !url.startsWith(`${DESKTOP_MEDIA_PROTOCOL}/`)) {
    return undefined;
  }

  return decodeURIComponent(url.slice(`${DESKTOP_MEDIA_PROTOCOL}/`.length));
}

function getKnownCachedAudioFilePath(projectDetail: ProjectDetail) {
  return (
    projectDetail.cachedAudioFilePath ??
    getPersistedCacheEntry(projectDetail)?.cachedAudioFilePath ??
    getCachedAudioFilePathFromUrl(projectDetail.playbackAudioFileUrl)
  );
}

function getCachedProjectDetail(projectDetail: ProjectDetail) {
  const knownCachedAudioFilePath = getKnownCachedAudioFilePath(projectDetail);
  const persistedCacheEntry = getPersistedCacheEntry(projectDetail);

  if (!knownCachedAudioFilePath) {
    return undefined;
  }

  return {
    ...projectDetail,
    playbackAudioFileUrl: getCachedAudioUrl(knownCachedAudioFilePath),
    cachedAudioFilePath: knownCachedAudioFilePath,
    youtubeSourceUrl: projectDetail.youtubeSourceUrl ?? persistedCacheEntry?.canonicalUrl,
    youtubeVideoId: projectDetail.youtubeVideoId ?? persistedCacheEntry?.videoId,
    youtubeDurationSeconds:
      projectDetail.youtubeDurationSeconds ?? persistedCacheEntry?.durationSeconds,
    isLocalUrl: false,
  };
}

export const youtubeProjectSourcePlugin: ProjectSourcePlugin = {
  id: "youtube",
  tagLabel: "YouTube",
  tagAppearance: {
    background: "rgba(255, 0, 0, 0.16)",
    borderColor: "rgba(255, 0, 0, 0.34)",
    color: "rgba(255, 214, 214, 0.96)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  },
  matchesUrl: isYouTubeUrl,
  matchesProject: (projectDetail) => isYouTubeUrl(getProjectSourceUrl(projectDetail)),
  clearProjectMetadata: (projectDetail) => ({
    ...projectDetail,
    playbackAudioFileUrl: undefined,
    youtubeSourceUrl: undefined,
    youtubeVideoId: undefined,
    youtubeDurationSeconds: undefined,
    cachedAudioFilePath: undefined,
  }),
  getCachedProjectDetail,
  clearPersistedCache: clearPersistedProjectDetail,
  getPlaybackUrl: (projectDetail) => projectDetail.playbackAudioFileUrl,
  getSourceUrl: getProjectSourceUrl,
  getLoadingMessage: (projectDetail) =>
    getCachedProjectDetail(projectDetail) ? "Loading project..." : "Caching source audio...",
  checkingMessage: "Checking source URL...",
  resolvingMessage: "Caching source audio...",
  resolveProjectDetail: async (projectDetail) => {
    if (!isDesktopApp) {
      return projectDetail;
    }

    const cachedProjectDetail = getCachedProjectDetail(projectDetail);

    if (cachedProjectDetail) {
      const cachedAudioFilePath = cachedProjectDetail.cachedAudioFilePath;

      if (cachedAudioFilePath && (await cachedDesktopFileExists(cachedAudioFilePath))) {
        return cachedProjectDetail;
      }

      clearPersistedProjectDetail(projectDetail);
    }

    const sourceUrl = getProjectSourceUrl(projectDetail);
    const resolved = await resolveDesktopYouTubeAudio(sourceUrl);
    const now = new Date();

    const resolvedProjectDetail = {
      ...projectDetail,
      artistName: projectDetail.artistName || resolved.artistName,
      songName: projectDetail.songName || resolved.title,
      audioFileName:
        projectDetail.audioFileName && projectDetail.audioFileName !== sourceUrl
          ? projectDetail.audioFileName
          : resolved.title,
      audioFileUrl: sourceUrl,
      playbackAudioFileUrl: resolved.audioFileUrl,
      albumArtSrc: projectDetail.albumArtSrc || resolved.thumbnailUrl,
      cachedAudioFilePath: resolved.cachedAudioFilePath,
      youtubeSourceUrl: resolved.canonicalUrl,
      youtubeVideoId: resolved.videoId,
      youtubeDurationSeconds: resolved.durationSeconds,
      isLocalUrl: false,
      updatedDate: now,
    };

    persistResolvedProjectDetail(resolvedProjectDetail);

    return resolvedProjectDetail;
  },
};