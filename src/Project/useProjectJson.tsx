import { useRef, useState } from "react";
import { Button } from "@adobe/react-spectrum";
import { ToastQueue } from "@react-spectrum/toast";
import Modal from "../components/Modal";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { exportProjectJson, importProjectJson } from "./projectJson";
import { getSavedProjectSnapshot, useProjectStore } from "./store";
import { loadProjectIntoEditor } from "./loadProjectIntoEditor";
import { applyPickedLocalAudioToProjectDetail } from "./sourcePlugins/localFilePlugin";
import { withSavedBrowserInfo } from "./browserInfo";
import type { Project } from "./types";

export function useProjectJson(pause: () => void) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Project>();
  const [audioFile, setAudioFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const current = useProjectStore(state => state.editingProject);
  const unsaved = useProjectStore(state => getSavedProjectSnapshot() !== state.savedLyricTextsSnapshot);
  const canReuseAudio = Boolean(pending && current && (
    pending.projectDetail.audioFileUrl === current.audioFileUrl ||
    (pending.projectDetail.isLocalUrl && current.isLocalUrl && pending.projectDetail.audioFileName === current.audioFileName)
  ));
  const needsAudio = Boolean(pending?.projectDetail.isLocalUrl && !canReuseAudio);

  function exportJson() {
    const state = useProjectStore.getState();
    const ai = useAIImageGeneratorStore.getState();
    if (!state.editingProject) return;
    try {
      const json = exportProjectJson(withSavedBrowserInfo<Project>({
        id: state.editingProject.name,
        projectDetail: state.editingProject,
        lyricTexts: state.lyricTexts,
        lyricReference: state.unSavedLyricReference ?? state.lyricReference,
        images: state.images,
        promptLog: ai.promptLog,
        generatedImageLog: ai.generatedImageLog,
      }));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${state.editingProject.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || "project"}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      ToastQueue.negative(error instanceof Error ? error.message : "Could not export project.", { timeout: 5000 });
    }
  }

  async function replaceProject() {
    if (!pending || (needsAudio && !audioFile) || busy) return;
    setBusy(true);
    try {
      let detail = pending.projectDetail;
      if (canReuseAudio && current) {
        detail = { ...detail, audioFileUrl: current.audioFileUrl, playbackAudioFileUrl: current.playbackAudioFileUrl,
          localAudioFilePath: current.localAudioFilePath, cachedAudioFilePath: current.cachedAudioFilePath };
      } else if (audioFile) {
        detail = applyPickedLocalAudioToProjectDetail(detail, audioFile);
      }
      pause();
      await loadProjectIntoEditor(pending, {
        projectDetail: detail,
        requestAutoPlay: false,
        access: { canSave: true, shouldWarnOnLoad: false },
      });
      // Import changes the working copy only. Save remains an explicit action.
      useProjectStore.setState({ savedLyricTextsSnapshot: "" });
      setPending(undefined);
      setAudioFile(undefined);
      ToastQueue.positive("Project JSON imported. Changes are not saved yet.", { timeout: 4000 });
    } catch (error) {
      ToastQueue.negative(error instanceof Error ? error.message : "Could not import project.", { timeout: 5000 });
    } finally {
      setBusy(false);
    }
  }

  const ui = <>
    <input ref={fileInput} type="file" accept=".json,application/json" style={{ display: "none" }}
      onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        try {
          if (file.size > 50 * 1024 * 1024) throw new Error("Project JSON must be smaller than 50 MB.");
          const project = importProjectJson(await file.text());
          setAudioFile(undefined);
          setPending(project);
        } catch (error) {
          ToastQueue.negative(error instanceof Error ? error.message : "Could not read project JSON.", { timeout: 6000 });
        }
      }} />
    <Modal open={Boolean(pending)} title={current ? "Replace current project?" : "Import project JSON"}
      onClose={busy ? undefined : () => setPending(undefined)}
      footer={<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="secondary" isDisabled={busy} onPress={() => setPending(undefined)}>Cancel</Button>
        <Button variant="accent" isDisabled={busy || (needsAudio && !audioFile)} onPress={() => void replaceProject()}>
          {busy ? "Importing…" : current ? "Replace project" : "Import project"}
        </Button>
      </div>}>
      <p style={{ marginTop: 0 }}>
        {current ? <>Replace <strong>{current.name}</strong> with <strong>{pending?.projectDetail.name}</strong> from the JSON file?</>
          : <>Open <strong>{pending?.projectDetail.name}</strong> from the JSON file?</>}
      </p>
      <p style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>
        {current && unsaved ? "Unsaved changes in the current project will be discarded. " : ""}
        The imported project stays unsaved until you choose Save.
      </p>
      {needsAudio && <label style={{ display: "grid", gap: 8, fontSize: 13 }}>
        Select audio: {pending?.projectDetail.audioFileName}
        <input type="file" accept="audio/*" onChange={event => setAudioFile(event.currentTarget.files?.[0])} />
      </label>}
    </Modal>
  </>;
  return { exportJson, importJson: () => fileInput.current?.click(), ui };
}
