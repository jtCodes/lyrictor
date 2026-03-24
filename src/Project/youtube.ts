import { isDesktopApp } from "../runtime";
import { ProjectDetail } from "./types";

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

export async function resolveYouTubeProjectDetail(projectDetail: ProjectDetail) {
  const sourceUrl = projectDetail.youtubeSourceUrl ?? projectDetail.audioFileUrl;

  if (!isDesktopApp || !isYouTubeUrl(sourceUrl)) {
    return projectDetail;
  }

  if (!window.lyrictorDesktop?.resolveYouTubeAudio) {
    throw new Error("Desktop YouTube resolution is not available in this build.");
  }

  const resolved = await window.lyrictorDesktop.resolveYouTubeAudio(sourceUrl);
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