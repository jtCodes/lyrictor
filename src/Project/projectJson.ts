import type { Project } from "./types";
import { sanitizeForFirestore, serializeProjectDetailDates } from "./projectSerialization";

export function exportProjectJson(project: Project): string {
  return JSON.stringify(sanitizeForFirestore({
    ...project,
    projectDetail: serializeProjectDetailDates(project.projectDetail),
  }), null, 2);
}

function record(value: unknown, path: string): asserts value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
}

function finite(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a number.`);
}

function cameraValues(value: Record<string, any>, path: string) {
  for (const key of ["focalLength", "dollyPosition", "truckPosition", "tilt", "focusDistance", "focusChangeSpeed", "rotation"]) {
    if (value[key] != null) finite(value[key], `${path}.${key}`);
  }
}

export function importProjectJson(json: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(json.replace(/^\uFEFF/, ""), (key, value) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Unsupported key");
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid number");
      return value;
    });
  } catch {
    throw new Error("This file is not valid project JSON.");
  }
  record(data, "Project");
  record(data.projectDetail, "projectDetail");
  const detail = data.projectDetail;
  for (const key of ["name", "audioFileName", "audioFileUrl"]) {
    if (typeof detail[key] !== "string") throw new Error(`projectDetail.${key} must be text.`);
  }
  if (!detail.name.trim()) throw new Error("Project name is required.");
  if (!["free", "static"].includes(detail.editingMode)) throw new Error("Invalid editing mode.");
  if (typeof detail.isLocalUrl !== "boolean") throw new Error("Missing audio source type.");
  for (const key of ["createdDate", "updatedDate"]) {
    if (key === "updatedDate" && detail[key] == null) continue;
    if (typeof detail[key] !== "string" || !Number.isFinite(Date.parse(detail[key]))) throw new Error(`Invalid ${key}.`);
  }
  if (!Array.isArray(data.lyricTexts)) throw new Error("Project must contain a lyricTexts array.");
  const ids = new Set<number>();
  data.lyricTexts.forEach((item: unknown, index: number) => {
    const path = `lyricTexts[${index}]`;
    record(item, path);
    for (const key of ["id", "start", "end", "textX", "textY", "textBoxTimelineLevel"]) finite(item[key], `${path}.${key}`);
    if (ids.has(item.id)) throw new Error(`Duplicate timeline item ID: ${item.id}.`);
    ids.add(item.id);
    if (item.start < 0 || item.end < item.start) throw new Error(`${path} has an invalid time range.`);
    if (typeof item.text !== "string") throw new Error(`${path}.text must be text.`);
    for (const key of ["cameraSettings", "lightSettings", "grainSettings", "particleSettings", "visualizerSettings"]) {
      if (item[key] != null) record(item[key], `${path}.${key}`);
    }
    if (item.cameraSettings) cameraValues(item.cameraSettings, `${path}.cameraSettings`);
    if (item.cameraSettings?.overrides != null) {
      if (!Array.isArray(item.cameraSettings.overrides)) throw new Error(`${path}: camera overrides must be an array.`);
      const overrideIds = new Set<string>();
      item.cameraSettings.overrides.forEach((override: unknown) => {
        record(override, `${path} camera override`);
        if (typeof override.id !== "string" || !override.id || overrideIds.has(override.id)) throw new Error(`${path}: camera override IDs must be unique strings.`);
        overrideIds.add(override.id);
        cameraValues(override, `${path} override`);
        if (override.focusTargetId != null) finite(override.focusTargetId, "Focus target ID");
        finite(override.startOffset, "Override start");
        finite(override.endOffset, "Override end");
        if (override.startOffset < 0 || override.endOffset <= override.startOffset) throw new Error(`${path}: invalid camera override time range.`);
        if (override.preOverride != null) {
          record(override.preOverride, "Override starting state");
          cameraValues(override.preOverride, "Override starting state");
        }
      });
    }
    for (const key of ["textEffects", "ashFadeEffects"]) {
      if (item[key] != null && !Array.isArray(item[key])) throw new Error(`${path}.${key} must be an array.`);
    }
  });
  for (const key of ["images", "generatedImageLog", "promptLog"]) {
    if (data[key] == null) data[key] = [];
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array.`);
    data[key].forEach((item: unknown) => record(item, `${key} entry`));
  }
  for (const image of [...data.images, ...data.generatedImageLog]) {
    if (typeof image.url !== "string") throw new Error("Image entries must have a URL.");
  }
  for (const image of data.generatedImageLog) {
    if (image.prompt != null) record(image.prompt, "Generated image prompt");
  }
  return {
    ...data,
    id: typeof data.id === "string" ? data.id : detail.name,
    projectDetail: {
      ...detail,
      createdDate: new Date(detail.createdDate),
      updatedDate: new Date(detail.updatedDate ?? detail.createdDate),
      playbackAudioFileUrl: undefined,
      cachedAudioFilePath: undefined,
      localAudioFilePath: undefined,
    },
  } as Project;
}
