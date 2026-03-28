import { fetchMediaArrayBuffer, isDesktopApp } from "../../runtime";
import { ProjectDetail } from "../types";
import { ProjectSourcePlugin } from "./types";

type PickedLocalAudioFile = {
  name?: string;
  path?: string;
};

function normalizeLocalAudioPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

export function getPickedLocalAudioPath(file?: PickedLocalAudioFile) {
  return typeof file?.path === "string" ? file.path : undefined;
}

export function getPickedLocalAudioName(file?: PickedLocalAudioFile) {
  return typeof file?.name === "string" ? file.name : undefined;
}

export function hasAbsoluteLocalAudioPath(filePath?: string) {
  if (!filePath) {
    return false;
  }

  const normalizedFilePath = normalizeLocalAudioPath(filePath);

  return (
    normalizedFilePath.startsWith("/") ||
    normalizedFilePath.startsWith("//") ||
    /^[A-Za-z]:\//.test(normalizedFilePath)
  );
}

export function getLocalAudioDisplayName(filePath?: string) {
  if (!filePath) {
    return "";
  }

  const normalizedFilePath = normalizeLocalAudioPath(filePath);
  const fileName = normalizedFilePath.split("/").filter(Boolean).pop();

  return fileName || filePath;
}

export function getPickedLocalAudioDisplayName(file?: PickedLocalAudioFile) {
  return getPickedLocalAudioName(file) || getLocalAudioDisplayName(getPickedLocalAudioPath(file));
}

export function projectNeedsLocalAudioRepick(projectDetail: ProjectDetail) {
  return Boolean(
    projectDetail.isLocalUrl && !hasAbsoluteLocalAudioPath(projectDetail.localAudioFilePath)
  );
}

export function doesPickedLocalAudioMatchProject(
  file: PickedLocalAudioFile | undefined,
  projectDetail: ProjectDetail
) {
  if (!file) {
    return false;
  }

  const expectedAudioFileName = projectDetail.audioFileName;
  const filePath = getPickedLocalAudioPath(file);

  return [getPickedLocalAudioName(file), filePath, getLocalAudioDisplayName(filePath)]
    .filter((value): value is string => Boolean(value))
    .includes(expectedAudioFileName);
}

export function applyPickedLocalAudioToProjectDetail(
  projectDetail: ProjectDetail,
  file: File & PickedLocalAudioFile
) {
  const filePath = getPickedLocalAudioPath(file);

  return {
    ...projectDetail,
    audioFileUrl: URL.createObjectURL(file),
    audioFileName: projectDetail.audioFileName || getPickedLocalAudioDisplayName(file),
    localAudioFilePath: hasAbsoluteLocalAudioPath(filePath) ? filePath : undefined,
    isLocalUrl: true,
  };
}

function getFileUrl(filePath: string) {
  const normalizedFilePath = normalizeLocalAudioPath(filePath);

  if (normalizedFilePath.startsWith("file://")) {
    return normalizedFilePath;
  }

  if (/^[A-Za-z]:\//.test(normalizedFilePath)) {
    return encodeURI(`file:///${normalizedFilePath}`);
  }

  if (normalizedFilePath.startsWith("//")) {
    return encodeURI(`file:${normalizedFilePath}`);
  }

  return encodeURI(`file://${normalizedFilePath}`);
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
    Boolean(projectDetail.isLocalUrl && hasAbsoluteLocalAudioPath(projectDetail.localAudioFilePath)),
  clearProjectMetadata: (projectDetail) => ({
    ...projectDetail,
    localAudioFilePath: undefined,
  }),
  getLoadingMessage: () => "Loading local audio...",
  resolvingMessage: "Loading local audio...",
  resolveProjectDetail: async (projectDetail) => {
    const localAudioFilePath = projectDetail.localAudioFilePath;

    if (!isDesktopApp || !localAudioFilePath || !hasAbsoluteLocalAudioPath(localAudioFilePath)) {
      return projectDetail;
    }

    const buffer = await fetchMediaArrayBuffer(getFileUrl(localAudioFilePath));
    const audioBlob = new Blob([buffer], {
      type: getMimeType(localAudioFilePath),
    });

    return {
      ...projectDetail,
      audioFileUrl: URL.createObjectURL(audioBlob),
      audioFileName: projectDetail.audioFileName || getLocalAudioDisplayName(localAudioFilePath),
      isLocalUrl: true,
    };
  },
};