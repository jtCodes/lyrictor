import { fetchMediaArrayBuffer, isDesktopApp } from "../../runtime";
import { ProjectDetail } from "../types";
import { ProjectSourcePlugin } from "./types";

function getFileUrl(filePath: string) {
  return encodeURI(`file://${filePath}`);
}

function getMimeType(filePath: string) {
  const lowerFilePath = filePath.toLowerCase();

  if (lowerFilePath.endsWith(".mp3")) return "audio/mpeg";
  if (lowerFilePath.endsWith(".wav")) return "audio/wav";
  if (lowerFilePath.endsWith(".ogg") || lowerFilePath.endsWith(".opus")) return "audio/ogg";
  if (lowerFilePath.endsWith(".m4a") || lowerFilePath.endsWith(".mp4")) return "audio/mp4";
  if (lowerFilePath.endsWith(".webm") || lowerFilePath.endsWith(".weba")) return "audio/webm";

  return "application/octet-stream";
}

export const localFileProjectSourcePlugin: ProjectSourcePlugin = {
  id: "local-file",
  matchesUrl: () => false,
  matchesProject: (projectDetail) =>
    Boolean(projectDetail.isLocalUrl && projectDetail.localAudioFilePath),
  clearProjectMetadata: (projectDetail) => ({
    ...projectDetail,
    localAudioFilePath: undefined,
  }),
  getLoadingMessage: () => "Loading local audio...",
  resolvingMessage: "Loading local audio...",
  resolveProjectDetail: async (projectDetail) => {
    if (!isDesktopApp || !projectDetail.localAudioFilePath) {
      return projectDetail;
    }

    const buffer = await fetchMediaArrayBuffer(getFileUrl(projectDetail.localAudioFilePath));
    const audioBlob = new Blob([buffer], {
      type: getMimeType(projectDetail.localAudioFilePath),
    });

    return {
      ...projectDetail,
      audioFileUrl: URL.createObjectURL(audioBlob),
      audioFileName: projectDetail.audioFileName || projectDetail.localAudioFilePath,
      isLocalUrl: true,
    };
  },
};