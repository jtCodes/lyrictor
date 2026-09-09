import { snapshotProject } from "./versionHistory";
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

let latestLoadRequest = 0;
let pendingExplicitLoad: number | undefined;

export async function loadProjectIntoEditor(
  project: Project,
  options?: {
    projectDetail?: ProjectDetail;
    requestAutoPlay?: boolean;
    syncUnsavedLyricReference?: boolean;
    access?: EditingProjectAccess;
    isCurrentRequest?: () => boolean;
    initializeOnly?: boolean;
  }
) {
  const initializeOnly = options?.initializeOnly === true;
  if (initializeOnly && (pendingExplicitLoad !== undefined || useProjectStore.getState().editingProject)) return false;
  const request = initializeOnly ? latestLoadRequest : ++latestLoadRequest;
  if (!initializeOnly) pendingExplicitLoad = request;
  let access: EditingProjectAccess | undefined;
  try {
    access = options?.access ?? await resolveEditingProjectAccess(project);
  } finally {
    if (!initializeOnly && pendingExplicitLoad === request) pendingExplicitLoad = undefined;
  }
  if (request !== latestLoadRequest || options?.isCurrentRequest?.() === false ||
      (initializeOnly && useProjectStore.getState().editingProject)) return false;
  resetProjectEditorState();

  const projectStore = useProjectStore.getState();
  const aiImageStore = useAIImageGeneratorStore.getState();
  const detail = options?.projectDetail ?? project.projectDetail;
  const nextProjectDetail: ProjectDetail = {
    ...detail,
    createdDate: new Date(detail.createdDate),
    updatedDate: new Date(detail.updatedDate ?? detail.createdDate),
  };
  const nextLyricReference = project.lyricReference ?? "";
  const nextImageState = buildProjectGeneratedImageLog(project);

  if (options?.requestAutoPlay !== false) {
    projectStore.setAutoPlayRequested(true);
  }

  useProjectStore.setState({ editingProject: nextProjectDetail, editingProjectId: project.id, activeVersionId: project.versionId, activeVersionName: project.versionName, draftFrom: project.draftFrom, workingProjectBaseline: snapshotProject(project) });
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
  return true;
}
