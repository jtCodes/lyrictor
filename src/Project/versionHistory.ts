import type { Project } from "./types";
export type VersionKind = "manual" | "save" | "publish" | "restore" | "previous";
export interface ProjectVersion {
  id: string;
  name?: string;
  number?: number;
  revision?: string;
  createdAt: string;
  updatedAt?: string;
  kind: VersionKind;
  project: Project;
}
export function snapshotProject(project: Project): Project {
  const { versionHistory, versionId, versionName, versionSequence, versionRevision, previewVersionLabel, publishedAt, username, uid, ...snapshot } = project;
  return JSON.parse(JSON.stringify(snapshot));
}
export function versionName(version: ProjectVersion) { return version.name || (version.number ? `Version ${version.number}` : `Version · ${new Date(version.createdAt).toLocaleString()}`); }
export function createProjectVersion(project: Project, kind: VersionKind = "manual", number = 1): ProjectVersion {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: `Version ${number}`, number, revision: crypto.randomUUID(), createdAt: now, updatedAt: now, kind, project: snapshotProject(project) };
}
export function updateVersion(version: ProjectVersion, project: Project): ProjectVersion {
  return { ...version, revision: crypto.randomUUID(), updatedAt: new Date().toISOString(), project: snapshotProject(project) };
}
export function projectForVersion(project: Project, version: ProjectVersion): Project {
  return { ...snapshotProject(version.project), id: project.id, source: project.source,
    projectDetail: { ...version.project.projectDetail, name: project.projectDetail.name },
    versionId: version.id, versionName: versionName(version), versionRevision: version.revision };
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
  const requested = project.versionId ?? previous?.versionId;
  const current = history.find(item => item.id === requested) ?? (!requested && previous?.versionSequence == null ? newestVersionsFirst(history)[0] : undefined);
  if (requested && !current && history.length && kind !== "manual") throw new Error("This version was deleted. Choose another version or create a new one.");
  const version = kind === "manual" || !current ? createProjectVersion(project, kind ?? "save", sequence + 1) : updateVersion(current, project);
  const saved: Project = { ...projectForVersion(project, version), source: "local",
    versionSequence: Math.max(sequence, version.number ?? 0),
    versionHistory: current && kind !== "manual" ? history.map(item => item.id === current.id ? version : item) : [...history, version] };
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
