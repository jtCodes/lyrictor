import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../Auth/store";
import { getSavedProjectSnapshot, useProjectStore } from "./store";
import { loadProjectIntoEditor } from "./loadProjectIntoEditor";
import { useProjectService } from "./useProjectService";
import { Project } from "./types";
import { saveProjectToFirestore, createCloudVersionFromSaved, loadCloudProjectHistory, deleteCloudVersion, renameCloudVersion, publishSavedVersion } from "./firestoreProjectService";
import { createLocalVersionFromSaved, deleteLocalVersion, loadLocalProjectHistory, newestVersionsFirst, projectForVersion, ProjectVersion, renameLocalVersion, saveLocalProjectVersion, versionName } from "./versionHistory";
import { projectUsesLocalAudioFile } from "./sourcePlugins/localFilePlugin";
import { publishedProjectPath } from "./utils";
import { openExternalUrl } from "../runtime";
import VersionPreview from "./VersionPreview";
import { useAudioPlayer } from "./usePreparedAudioPlayer";
import LyrictorLoadingIndicator from "../components/LyrictorLoadingIndicator";
import "./versionHistory.css";

type History = { versions: ProjectVersion[]; savedVersionId?: string; publishedId?: string; publishedProject?: Project };
type Pending = { action: "edit" | "delete" | "rename"; version: ProjectVersion };
export default function VersionHistoryDialog({ project, onClose, onPublished }: { project: Project; onClose: () => void; onPublished?: () => Promise<void> }) {
  const { pause } = useAudioPlayer();
  const pausedOnOpen = useRef(false);
  useEffect(() => {
    if (pausedOnOpen.current) return;
    pausedOnOpen.current = true;
    pause();
  }, [pause]);
  const user = useAuthStore(state => state.user);
  const username = useAuthStore(state => state.username);
  const editingId = useProjectStore(state => state.activeVersionId);
  const editingProjectId = useProjectStore(state => state.editingProjectId);
  const editingDetail = useProjectStore(state => state.editingProject);
  const editingVersionName = useProjectStore(state => state.activeVersionName);
  const editingSource = useProjectStore(state => state.editingProjectAccess?.source);
  const [saveProject] = useProjectService();
  const navigate = useNavigate();
  const [history, setHistory] = useState<History>();
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Pending>();
  const [name, setName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const confirmationCancelRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(false);
  const local = project.source === "local";
  const isEditingProject = (editingProjectId === project.id || editingDetail?.name === project.projectDetail.name)
    && (editingSource === "local" ? local : editingSource === "cloud" ? !local : true);
  const activeId = isEditingProject ? editingId : undefined;
  const selected = history?.versions.find(item => item.id === selectedId);
  const previewProject = useMemo(() => selected ? projectForVersion(project, selected) : undefined, [project, selected]);
  const published = selected && history?.publishedProject?.versionId === selected.id;
  const publishedCurrent = published && history?.publishedProject?.versionRevision === selected?.revision;
  const cannotPublish = !user ? "Sign in to publish a version." : !username ? "Set a username to publish." : selected && projectUsesLocalAudioFile(selected.project.projectDetail) ? "Versions using a local audio file cannot be published." : "";

  useEffect(() => {
    if (pending?.action === "rename") {
      renameInputRef.current?.focus({ preventScroll: true });
      renameInputRef.current?.select();
      wasRenaming.current = true;
    } else {
      if (wasRenaming.current) actionsRef.current?.focus({ preventScroll: true });
      wasRenaming.current = false;
    }
  }, [pending]);
  useEffect(() => {
    let active = true;
    setError("");
    (async () => {
      let next: History;
      if (local) {
        next = loadLocalProjectHistory(project);
        if (user) {
          try {
            const cloud = await loadCloudProjectHistory(user.uid, project.projectDetail.name);
            next = { ...next, publishedId: cloud.publishedId, publishedProject: cloud.publishedProject };
          } catch { if (active) setNotice("Local versions are available. The published status could not be checked."); }
        }
      } else {
        if (!user) throw new Error("Sign in to see this project's versions.");
        next = await loadCloudProjectHistory(user.uid, project.projectDetail.name);
      }
      next.versions = newestVersionsFirst(next.versions);
      if (active) {
        setHistory(next);
        setSelectedId(current => next.versions.some(item => item.id === current) ? current : (next.versions.find(item => item.id === activeId)?.id ?? next.versions[0]?.id));
      }
    })().catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load versions."); });
    return () => { active = false; };
  }, [project, local, user?.uid, revision]);

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice(""); setMenuOpen(false);
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "Could not complete this action."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function edit(version: ProjectVersion, choice?: "save" | "discard") {
    const state = useProjectStore.getState();
    if (state.editingProject && getSavedProjectSnapshot() !== state.savedLyricTextsSnapshot) {
      if (!choice) { setPending({ action: "edit", version }); return; }
      if (choice === "save" && !await saveProject()) throw new Error("Save your current edits before continuing.");
    }
    const latest = local ? loadLocalProjectHistory(project) : user ? await loadCloudProjectHistory(user.uid, project.projectDetail.name) : undefined;
    const target = latest?.versions.find(item => item.id === version.id);
    if (!target) throw new Error("This version is no longer available.");
    const snapshot = projectForVersion(project, target);
    if (!await loadProjectIntoEditor(snapshot, { requestAutoPlay: false, access: { canSave: true, source: local ? "local" : "cloud", ownerUid: user?.uid, shouldWarnOnLoad: false } })) throw new Error("Another project was opened. Please try again.");
    navigate("/edit"); onClose();
  }
  async function newVersion(duplicate?: ProjectVersion) {
    let saved: Project | undefined;
    if (duplicate) {
      const copy = projectForVersion(project, duplicate);
      if (local) saved = saveLocalProjectVersion(copy, "manual");
      else {
        if (!user) throw new Error("Sign in to duplicate this version.");
        saved = await saveProjectToFirestore(user.uid, copy, "manual");
      }
    } else if (isEditingProject) {
      if (!await saveProject(undefined, undefined, "manual", local ? "local" : "cloud")) throw new Error("Could not create a version.");
      setSelectedId(useProjectStore.getState().activeVersionId);
    } else if (local) saved = createLocalVersionFromSaved(project);
    else {
      if (!user) throw new Error("Sign in to create a version.");
      saved = await createCloudVersionFromSaved(user.uid, project.projectDetail.name);
    }
    if (saved) setSelectedId(saved.versionId);
    setRevision(value => value + 1); setNotice("New version created.");
  }
  async function confirm() {
    if (!pending) return;
    const { version, action } = pending;
    if (action === "rename") {
      if (!name.trim()) throw new Error("Enter a version name.");
      if (local) renameLocalVersion(project, version.id, name);
      else { if (!user) throw new Error("Sign in to rename."); await renameCloudVersion(user.uid, project.projectDetail.name, version.id, name); }
      if (editingId === version.id) useProjectStore.setState({ activeVersionName: name.trim() });
      setHistory(current => current ? { ...current, versions: current.versions.map(item => item.id === version.id ? { ...item, name: name.trim() } : item) } : current);
    } else if (action === "delete") {
      if (local) deleteLocalVersion(project, version.id);
      else { if (!user) throw new Error("Sign in to delete."); await deleteCloudVersion(user.uid, project.projectDetail.name, version.id); }
      if (editingId === version.id) useProjectStore.setState({ activeVersionId: undefined, activeVersionName: undefined });
    }
    setPending(undefined); setRevision(value => value + 1);
  }

  return <Dialog.Root open onOpenChange={open => { if (!open && !busyRef.current) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="versions-backdrop" />
      <Dialog.Popup className="versions-panel">
        <header className="versions-header">
          <div><Dialog.Title className="versions-title">Versions</Dialog.Title><Dialog.Description className="versions-project">{project.projectDetail.name}</Dialog.Description></div>
          <Dialog.Close className="version-icon-button" aria-label="Close versions" disabled={busy}>×</Dialog.Close>
        </header>
        <div className="versions-body">
          <aside className="versions-sidebar" aria-label="Project versions">
            <div className="versions-list-header"><span>Newest first</span><button className="version-button" disabled={busy || !history || !!pending} onClick={() => run(() => newVersion())}>+ New version</button></div>
            {!history && !error ? <LyrictorLoadingIndicator label="Loading versions" /> : null}
            {history?.versions.length === 0 ? <p className="versions-empty">Save your project to create Version 1. Create new versions when you want to try another direction.</p> : null}
            <ul className="versions-list">{history?.versions.map(version => <li key={version.id}>
              <button className={`version-row${selectedId === version.id ? " is-selected" : ""}`} aria-pressed={selectedId === version.id} disabled={busy || !!pending} onClick={() => { setSelectedId(version.id); setMenuOpen(false); setNotice(""); }}>
                <span className="version-thumbnail">{version.project.projectDetail.albumArtSrc ? <img src={version.project.projectDetail.albumArtSrc} alt="" /> : <span>♫</span>}</span>
                <span className="version-row-content"><strong>{versionName(version)}</strong><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString()}</time><span className="version-badges">
                  {version.id === activeId ? <span className="version-badge editing">Editing</span> : null}
                  {version.id === history.publishedProject?.versionId ? <span className="version-badge live">Published</span> : null}
                </span></span>
              </button>
            </li>)}</ul>
          </aside>
          <section className="versions-detail" aria-label="Selected version">
            {error && !pending ? <div role="alert" className="version-error">{error} {!history && <button className="version-button" onClick={() => setRevision(value => value + 1)}>Retry</button>}</div> : null}
            {notice ? <p role="status" className="version-notice">{notice}</p> : null}
            {selected && previewProject ? <>
              <div className="version-detail-heading">
                <span className="version-eyebrow">Previewing saved version</span>
                  <div className="version-title-field">
                    <h2 style={pending?.action === "rename" ? { visibility: "hidden" } : undefined}>{versionName(selected)}</h2>
                    {pending?.action === "rename" ? <>
                      <input ref={renameInputRef} className="version-name-input" aria-label="Version name" aria-invalid={!!error} value={name} maxLength={80} disabled={busy} onChange={event => { setName(event.target.value); setError(""); }} onKeyDown={event => {
                        if (event.key === "Enter") { event.preventDefault(); if (name.trim()) void run(confirm); }
                        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!busy) { setPending(undefined); setError(""); } }
                      }} />
                      {error ? <span className="version-rename-error" role="alert">{error}</span> : null}
                    </> : null}
                  </div>
                <div className="version-more">
                  {pending?.action === "rename" ? <div className="version-rename-actions">
                    <button type="button" className="version-rename-button primary" aria-label="Save version name" title="Save name" disabled={busy || !name.trim()} onClick={() => run(confirm)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></button>
                    <button type="button" className="version-rename-button" aria-label="Cancel rename" title="Cancel rename" disabled={busy} onClick={() => { setPending(undefined); setError(""); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
                  </div> : <button ref={actionsRef} className="version-icon-button" disabled={busy || !!pending} aria-label="Version actions" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>}
                  {menuOpen ? <div className="version-actions" aria-label="Version actions">
                    <button onClick={() => { setName(versionName(selected)); setPending({ action: "rename", version: selected }); setMenuOpen(false); }}>Rename</button>
                    <button onClick={() => run(() => newVersion(selected))}>Duplicate</button>
                    <button className="danger" onClick={() => { setPending({ action: "delete", version: selected }); setMenuOpen(false); }}>Delete</button>
                  </div> : null}
                </div>
              </div>
              <div className="version-preview-frame"><VersionPreview project={previewProject} label={versionName(selected)} /></div>
              <div className="version-detail-caption"><span>{[selected.project.projectDetail.songName, selected.project.projectDetail.artistName].filter(Boolean).join(" · ")}</span><span>{selected.project.lyricTexts.length} timeline items</span></div>
              {published ? <p className="version-notice">{publishedCurrent ? "This saved version is live." : "This version has changes that have not been published."}</p> : null}
              {cannotPublish ? <p className="version-muted">{cannotPublish}</p> : null}
              <footer className="version-detail-footer">
                <button className="version-button" disabled={busy || !!pending} onClick={() => run(() => edit(selected))}>Edit this version</button>
                <button className="version-button primary" disabled={busy || !!pending || !!cannotPublish || !!publishedCurrent} onClick={() => run(async () => {
                  if (!user || !username) return;
                  await publishSavedVersion(user.uid, username, project, selected.id);
                  setRevision(value => value + 1); setNotice(`${versionName(selected)} is now published.`);
                  await onPublished?.();
                })}>{busy ? "Working…" : publishedCurrent ? "Published" : "Publish this version"}</button>
              </footer>
              {history?.publishedId ? <button className="version-text-button" onClick={() => openExternalUrl(`https://lyrictor.com${publishedProjectPath(history!.publishedId!)}`)}>Open published page ↗</button> : null}
            </> : !error ? <div className="versions-empty-preview">Choose a version to preview it here.</div> : null}

          </section>
        </div>
        <AlertDialog.Root open={!!pending && pending.action !== "rename"} onOpenChange={open => {
          if (!open && !busyRef.current) { setPending(undefined); setError(""); }
        }}>
          <AlertDialog.Portal>
            <AlertDialog.Backdrop forceRender className="version-confirm-backdrop" />
            <AlertDialog.Popup className="version-confirm-dialog" initialFocus={confirmationCancelRef}>
              {pending && pending.action !== "rename" ? <>
                <AlertDialog.Title className="version-confirm-title">{pending.action === "edit" ? `Switch to ${versionName(pending.version)}?` : `Delete ${versionName(pending.version)}?`}</AlertDialog.Title>
                <AlertDialog.Description className="version-confirm-description">{pending.action === "edit"
                  ? `Save changes to ${editingVersionName ? `“${editingVersionName}” in “${editingDetail?.name}”` : `a new version of “${editingDetail?.name}”`}, then open “${versionName(pending.version)}”. Or discard your unsaved changes and switch without saving.`
                  : "This removes the saved version. Your current editor and the published page stay unchanged."}</AlertDialog.Description>
                {error ? <p role="alert" className="version-error">{error}</p> : null}
                <div className="version-confirm-buttons">
                  <AlertDialog.Close ref={confirmationCancelRef} className="version-button" disabled={busy}>Cancel</AlertDialog.Close>
                  {pending.action === "edit" ? <>
                    <button className="version-button danger" disabled={busy} onClick={() => run(() => edit(pending.version, "discard"))}>Discard & switch</button>
                    <button className="version-button primary" disabled={busy} onClick={() => run(() => edit(pending.version, "save"))}>{busy ? "Working…" : "Save changes & switch"}</button>
                  </> : <button className="version-button danger" disabled={busy} onClick={() => run(confirm)}>{busy ? "Deleting…" : "Delete version"}</button>}
                </div>
              </> : null}
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
