import { isDesktopApp } from "../platform";
import { ProjectDetail } from "./types";

const DESKTOP_MEDIA_PROTOCOL = "lyrictor-media://youtube-cache";

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isYouTubeUrl(url: string) {
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

export function hasCachedYouTubeAudio(projectDetail: ProjectDetail) {
  return Boolean(getKnownCachedAudioFilePath(projectDetail));
}

export function getCachedYouTubeProjectDetail(projectDetail: ProjectDetail) {
  const knownCachedAudioFilePath = getKnownCachedAudioFilePath(projectDetail);

  if (!knownCachedAudioFilePath) {
    return projectDetail;
  }

  return {
    ...projectDetail,
    audioFileUrl: getCachedAudioUrl(knownCachedAudioFilePath),
    cachedAudioFilePath: knownCachedAudioFilePath,
    isLocalUrl: false,
  };
}

export function getYouTubeProjectLoadingMessage(projectDetail: ProjectDetail) {
  return hasCachedYouTubeAudio(projectDetail)
    ? "Loading project..."
    : "Caching YouTube audio...";
}

export async function resolveYouTubeProjectDetail(projectDetail: ProjectDetail) {
  const sourceUrl = projectDetail.youtubeSourceUrl ?? projectDetail.audioFileUrl;

  if (!isDesktopApp || !isYouTubeUrl(sourceUrl)) {
    return projectDetail;
  }

  const { resolveDesktopYouTubeAudio } = await import("../desktop/bridge");

  const knownCachedAudioFilePath = getKnownCachedAudioFilePath(projectDetail);

  if (knownCachedAudioFilePath) {
    return getCachedYouTubeProjectDetail(projectDetail);
  }

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
}