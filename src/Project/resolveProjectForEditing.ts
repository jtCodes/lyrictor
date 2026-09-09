import type { Project } from "./types";
import { chooseEditableProject, readLocalProject, lockLocalVersion } from "./versionHistory";
import { loadCloudProjectHistory } from "./firestoreProjectService";

/** Shared by card and player Edit actions. Opening an editor never saves a copy. */
export async function resolveProjectForEditing(project: Project, uid?: string): Promise<Project> {
  // Other creators' projects keep the existing read-only/clone access behavior.
  if (project.uid && project.uid !== uid) return project;
  if (project.source === "local") {
    const saved = readLocalProject(project) ?? project;
    const publication = uid ? (await loadCloudProjectHistory(uid, project.projectDetail.name)).publishedProject : undefined;
    const matching = saved.versionHistory?.find(v => v.id === publication?.versionId && v.revision === publication?.versionRevision);
    if (matching && !matching.lockedAt && publication) lockLocalVersion(saved, matching.id, matching.revision, publication.publishedAt ?? new Date().toISOString());
    const current = readLocalProject(project) ?? saved;
    return chooseEditableProject(current, current.versionHistory ?? [], publication);
  }
  if (!uid || (project.source === "demo" && project.uid !== uid)) return project;
  const history = await loadCloudProjectHistory(uid, project.projectDetail.name);
  return chooseEditableProject({ ...(history.savedProject ?? project), source: "cloud" }, history.versions, history.publishedProject);
}
