import { isDesktopApp } from "../../platform";
import { resolveDesktopYouTubeAudio } from "../../desktop/bridge";
import { ProjectDetail } from "../types";
import { ProjectSourcePlugin } from "./types";

const DESKTOP_MEDIA_PROTOCOL = "lyrictor-media://youtube-cache";

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
    getCachedAudioFilePathFromUrl(projectDetail.audioFileUrl)
  );
}

function getCachedProjectDetail(projectDetail: ProjectDetail) {
  const knownCachedAudioFilePath = getKnownCachedAudioFilePath(projectDetail);

  if (!knownCachedAudioFilePath) {
    return undefined;
  }

  return {
    ...projectDetail,
    audioFileUrl: getCachedAudioUrl(knownCachedAudioFilePath),
    cachedAudioFilePath: knownCachedAudioFilePath,
    isLocalUrl: false,
  };
}

export const youtubeProjectSourcePlugin: ProjectSourcePlugin = {
  id: "youtube",
  matchesUrl: isYouTubeUrl,
  matchesProject: (projectDetail) => isYouTubeUrl(getProjectSourceUrl(projectDetail)),
  clearProjectMetadata: (projectDetail) => ({
    ...projectDetail,
    youtubeSourceUrl: undefined,
    youtubeVideoId: undefined,
    youtubeDurationSeconds: undefined,
    cachedAudioFilePath: undefined,
  }),
  getCachedProjectDetail,
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
      return cachedProjectDetail;
    }

    const sourceUrl = getProjectSourceUrl(projectDetail);
    const resolved = await resolveDesktopYouTubeAudio(sourceUrl);
    const now = new Date();

    return {
      ...projectDetail,
      artistName: projectDetail.artistName || resolved.artistName,
      songName: projectDetail.songName || resolved.title,
      audioFileName:
        projectDetail.audioFileName && projectDetail.audioFileName !== sourceUrl
          ? projectDetail.audioFileName
          : resolved.title,
      audioFileUrl: resolved.audioFileUrl,
      albumArtSrc: projectDetail.albumArtSrc || resolved.thumbnailUrl,
      cachedAudioFilePath: resolved.cachedAudioFilePath,
      youtubeSourceUrl: resolved.canonicalUrl,
      youtubeVideoId: resolved.videoId,
      youtubeDurationSeconds: resolved.durationSeconds,
      isLocalUrl: false,
      updatedDate: now,
    };
  },
};