import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { ProjectDetail } from "./types";
import {
  resetProjectEditorState,
  resolveEditingProjectAccess,
  useProjectStore,
  EditingProjectAccess,
} from "./store";
import { Project } from "./types";
import { normalizeEditorLayout } from "../Editor/editorLayout";
import { useEditorStore } from "../Editor/store";
import { captureEditorWorkspace, restoreEditorWorkspace } from "../Editor/editorWorkspace";

function buildProjectGeneratedImageLog(project: Project) {
  const savedLog = (project.generatedImageLog ?? []).filter((image) => {
    return !(
      image.prompt &&
      "model" in image.prompt &&
      image.prompt.prompt === "Added to timeline" &&
      image.prompt.model === ""
    );
  });

  return {
    promptLog: project.promptLog ?? [],
    generatedImageLog: savedLog,
  };
}

export async function loadProjectIntoEditor(
  project: Project,
  options?: {
    projectDetail?: ProjectDetail;
    requestAutoPlay?: boolean;
    syncUnsavedLyricReference?: boolean;
    access?: EditingProjectAccess;
  }
) {
  const access = options?.access ?? await resolveEditingProjectAccess(project);
  resetProjectEditorState();

  const projectStore = useProjectStore.getState();
  const aiImageStore = useAIImageGeneratorStore.getState();
  const nextProjectDetail =
    options?.projectDetail ?? (project.projectDetail as unknown as ProjectDetail);
  const nextLyricReference = project.lyricReference ?? "";
  const nextImageState = buildProjectGeneratedImageLog(project);

  if (options?.requestAutoPlay !== false) {
    projectStore.setAutoPlayRequested(true);
  }

  projectStore.setEditingProject(nextProjectDetail);
  projectStore.setEditingProjectAccess(access);
  projectStore.setLyricReference(nextLyricReference);
  projectStore.setUnsavedLyricReference(nextLyricReference);

  projectStore.updateLyricTexts(project.lyricTexts);
  projectStore.setImages(project.images ?? []);
  const layout = normalizeEditorLayout(project.editorLayout);
  useEditorStore.setState(restoreEditorWorkspace(layout, project.lyricTexts));
  projectStore.updateEditorLayout({ ...layout, ...captureEditorWorkspace(useEditorStore.getState()) });

  aiImageStore.setPromptLog(nextImageState.promptLog);
  aiImageStore.setGeneratedImageLog(nextImageState.generatedImageLog);

  projectStore.markAsSaved();
}
