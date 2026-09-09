import type { Project } from "./types";
import { useAuthStore } from "../Auth/store";
import { getSavedProjectSnapshot, useProjectStore } from "./store";
import { loadProjectIntoEditor } from "./loadProjectIntoEditor";
import { resolveProjectForEditing } from "./resolveProjectForEditing";

let request = 0;
export async function openProjectForEditing(project: Project): Promise<boolean> {
  const currentRequest = ++request;
  const state = useProjectStore.getState();
  const uid = useAuthStore.getState().user?.uid;
  const baseline = getSavedProjectSnapshot();
  // Returning from the player must not replace work already in progress.
  if (baseline !== state.savedLyricTextsSnapshot && state.editingProject) {
    if (state.editingProjectId === project.id || (state.editingProject.name === project.projectDetail.name && (!project.uid || project.uid === uid))) return true;
    throw new Error("Save your current edits before opening another project.");
  }
  const target = await resolveProjectForEditing(project, uid);
  if (currentRequest !== request) return false;
  if (getSavedProjectSnapshot() !== baseline) throw new Error("Your editor changed while opening this project. Please try again.");
  return loadProjectIntoEditor(target, { requestAutoPlay: false, isCurrentRequest: () => currentRequest === request });
}
