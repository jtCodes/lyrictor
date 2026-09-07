import type { ProjectDetail } from "./types";

export function serializeProjectDetailDates(projectDetail: ProjectDetail) {
  const updatedDate = projectDetail.updatedDate ?? projectDetail.createdDate;
  return {
    ...projectDetail,
    playbackAudioFileUrl: undefined,
    cachedAudioFilePath: undefined,
    createdDate:
      projectDetail.createdDate instanceof Date
        ? projectDetail.createdDate.toISOString()
        : projectDetail.createdDate,
    updatedDate:
      updatedDate instanceof Date ? updatedDate.toISOString() : updatedDate,
  };
}

// Recursively strip undefined values (Firestore rejects them)
export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.filter((item) => item !== undefined).map(sanitizeForFirestore);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}
