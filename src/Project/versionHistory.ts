import type { Project } from "./types";
export type VersionKind = "manual" | "save" | "publish" | "restore" | "previous";
export interface ProjectVersion {
  id: string;
  name?: string;
  number?: number;
  revision?: string;
  createdAt: string;
  updatedAt?: string;
  lockedAt?: string;
  kind: VersionKind;
  project: Project;
}
export function snapshotProject(project: Project): Project {
  const { draftFrom, versionLocked, versionHistory, versionId, versionName, versionSequence, versionRevision, previewVersionLabel, publishedAt, publishedVersion, username, uid, ...snapshot } = project;
  return JSON.parse(JSON.stringify(snapshot));
}
export function versionName(version: ProjectVersion) { return version.name || (version.number ? `Version ${version.number}` : `Version · ${new Date(version.createdAt).toLocaleString()}`); }
export function createProjectVersion(project: Project, kind: VersionKind = "manual", number = 1): ProjectVersion {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: `Version ${number}`, number, revision: crypto.randomUUID(), createdAt: now, updatedAt: now, kind, project: snapshotProject(project) };
}
export function updateVersion(version: ProjectVersion, project: Project): ProjectVersion {
  if (version.lockedAt) throw new Error("Published versions are locked. Edit a copy instead.");
  return { ...version, revision: crypto.randomUUID(), updatedAt: new Date().toISOString(), project: snapshotProject(project) };
}
export function projectForVersion(project: Project, version: ProjectVersion): Project {
  return { ...snapshotProject(version.project), id: project.id, source: project.source,
    projectDetail: { ...version.project.projectDetail, name: project.projectDetail.name },
    versionLocked: !!version.lockedAt, versionId: version.id, versionName: versionName(version), versionRevision: version.revision };
}
export function newestVersionsFirst(versions: ProjectVersion[]): ProjectVersion[] {
  return [...versions].sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) || (b.number ?? 0) - (a.number ?? 0) || b.id.localeCompare(a.id));
}
export function readLocalProject(project: Project): Project | undefined {
  return (JSON.parse(localStorage.getItem("lyrictorProjects") || "[]") as Project[]).find(item => item.projectDetail.name === project.projectDetail.name);
}
function writeLocal(project: Project) {
  const projects: Project[] = JSON.parse(localStorage.getItem("lyrictorProjects") || "[]");
  const index = projects.findIndex(item => item.projectDetail.name === project.projectDetail.name);
  if (index < 0) projects.push(project); else projects[index] = project;
  localStorage.setItem("lyrictorProjects", JSON.stringify(projects));
}
export function saveLocalProjectVersion(project: Project, kind?: "manual"): Project {
  const previous = readLocalProject(project);
  const history = previous?.versionHistory ?? [];
  const sequence = Math.max(previous?.versionSequence ?? 0, ...history.map(item => item.number ?? 0));
  const requested = project.draftFrom ? undefined : project.versionId ?? previous?.versionId;
  const current = history.find(item => item.id === requested) ?? (!project.draftFrom && !requested && previous?.versionSequence == null ? newestVersionsFirst(history)[0] : undefined);
  if (requested && !current && history.length && kind !== "manual") throw new Error("This version was deleted. Choose another version or create a new one.");
  const create = kind === "manual" || !current || !!current.lockedAt || !!project.draftFrom;
  const version = create ? createProjectVersion(project, kind ?? "save", sequence + 1) : updateVersion(current, project);
  const saved: Project = { ...projectForVersion(project, version), source: "local",
    versionSequence: Math.max(sequence, version.number ?? 0),
    versionHistory: current && !create ? history.map(item => item.id === current.id ? version : item) : [...history, version] };
  writeLocal(saved);
  return saved;
}
export function loadLocalProjectHistory(project: Project) {
  const saved = readLocalProject(project);
  return { versions: newestVersionsFirst(saved?.versionHistory ?? []), savedVersionId: saved?.versionId };
}
export function createLocalVersionFromSaved(project: Project): Project {
  const saved = readLocalProject(project);
  if (!saved) throw new Error("Save this project before creating a version.");
  return saveLocalProjectVersion(saved, "manual");
}
export function renameLocalVersion(project: Project, id: string, name: string) {
  const saved = readLocalProject(project);
  if (!saved) throw new Error("Project not found.");
  saved.versionHistory = (saved.versionHistory ?? []).map(version => version.id === id ? { ...version, name: name.trim() || versionName(version) } : version);
  if (saved.versionId === id) saved.versionName = name.trim() || saved.versionName;
  writeLocal(saved);
}
export function deleteLocalVersion(project: Project, id: string) {
  const saved = readLocalProject(project);
  if (!saved) throw new Error("Project not found.");
  saved.versionHistory = (saved.versionHistory ?? []).filter(version => version.id !== id);
  if (saved.versionId === id) { delete saved.versionId; delete saved.versionName; delete saved.versionRevision; }
  writeLocal(saved);
}

export function draftFromVersion(project: Project, version: ProjectVersion): Project {
  return { ...snapshotProject(projectForVersion(project, version)), draftFrom: { id: version.id, name: versionName(version) } };
}

export function lockLocalVersion(project: Project, id: string, revision: string | undefined, lockedAt: string) {
  const saved = readLocalProject(project);
  const version = saved?.versionHistory?.find(item => item.id === id);
  if (!saved || !version || version.revision !== revision) throw new Error("This version changed. Refresh and publish again.");
  if (!version.lockedAt) {
    version.lockedAt = lockedAt;
    if (saved.versionId === id) saved.versionLocked = true;
    writeLocal(saved);
  }
}

/** Prefer ongoing work; otherwise make an unsaved copy of the latest publication. */
export function chooseEditableProject(project: Project, versions: ProjectVersion[], published?: Project): Project {
  const cutoff = Math.max(Date.parse(published?.publishedAt ?? "") || 0, ...versions.map(item => Date.parse(item.lockedAt ?? "") || 0));
  const editable = versions.filter(item => !item.lockedAt && Date.parse(item.updatedAt ?? item.createdAt) >= cutoff && !(published?.versionId === item.id && published.versionRevision === item.revision))
    .sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (editable[0]) return projectForVersion(project, editable[0]);
  if (published) return { ...snapshotProject(published), id: project.id, source: project.source,
    draftFrom: { id: published.versionId ?? published.id, name: published.versionName ?? "Published project" } };
  const locked = versions.filter(item => item.lockedAt).sort((a, b) => Date.parse(b.lockedAt!) - Date.parse(a.lockedAt!))[0];
  return locked ? draftFromVersion(project, locked) : snapshotProject(project);
}
