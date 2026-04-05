import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { ProjectDetail } from "./types";
import { resolveEditingProjectAccess, useProjectStore } from "./store";
import { Project } from "./types";

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
  }
) {
  const projectStore = useProjectStore.getState();
  const aiImageStore = useAIImageGeneratorStore.getState();
  const nextProjectDetail =
    options?.projectDetail ?? (project.projectDetail as unknown as ProjectDetail);
  const nextLyricReference = project.lyricReference ?? "";
  const nextImageState = buildProjectGeneratedImageLog(project);

  aiImageStore.reset();

  if (options?.requestAutoPlay !== false) {
    projectStore.setAutoPlayRequested(true);
  }

  projectStore.setEditingProject(nextProjectDetail);
  projectStore.setEditingProjectAccess(await resolveEditingProjectAccess(project));
  projectStore.setLyricReference(nextLyricReference);

  if (options?.syncUnsavedLyricReference) {
    projectStore.setUnsavedLyricReference(nextLyricReference);
  }

  projectStore.updateLyricTexts(project.lyricTexts);
  projectStore.setImages(project.images ?? []);

  aiImageStore.setPromptLog(nextImageState.promptLog);
  aiImageStore.setGeneratedImageLog(nextImageState.generatedImageLog);

  projectStore.markAsSaved();
}