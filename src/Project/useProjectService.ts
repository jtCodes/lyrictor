import { saveLocalProjectVersion, snapshotProject } from "./versionHistory";
import { useCallback, useEffect, useRef } from "react";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { getEditorLayoutForSave, getSavedProjectSnapshot, isProjectExist, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "../Auth/store";
import { saveProjectToFirestore } from "./firestoreProjectService";
import { withSavedBrowserInfo } from "./browserInfo";
import { normalizeEditorLayout } from "../Editor/editorLayout";

function stripDemoPrefix(name: string): string {
  return name.replace(/^\s*\(Demo\)\s*/i, "").trim();
}

function cloneNameRoot(name: string): string {
  const nonDemoName = stripDemoPrefix(name);
  return nonDemoName.replace(/\s*\(Cloned(?:\s+\d+)?\)\s*$/i, "").trim();
}

async function buildUniqueClonedProjectDetail(
  source: ProjectDetail
): Promise<ProjectDetail> {
  const root = cloneNameRoot(source.name) || "Untitled";
  let attempt = 1;

  while (attempt <= 999) {
    const now = new Date();
    const candidateName =
      attempt === 1 ? `${root} (Cloned)` : `${root} (Cloned ${attempt})`;

    const candidateDetail: ProjectDetail = {
      ...source,
      name: candidateName,
      createdDate: now,
      updatedDate: now,
    };

    const exists = await isProjectExist(candidateDetail);
    if (!exists) {
      return candidateDetail;
    }

    attempt += 1;
  }

  return {
    ...source,
    name: `${root} (Cloned ${Date.now()})`,
    createdDate: new Date(),
    updatedDate: new Date(),
  };
}

export function useProjectService() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const savingRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        savingRef.current ||
        getSavedProjectSnapshot() !== useProjectStore.getState().savedLyricTextsSnapshot
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveProject = async (
    suppliedProject?: Project,
    suppliedProjectDetails?: ProjectDetail,
    versionKind?: "manual",
    storageTarget?: "local" | "cloud"
  ) => {
    if (savingRef.current) return false;
    const projectState = useProjectStore.getState();
    const aiState = useAIImageGeneratorStore.getState();
    const authState = useAuthStore.getState();
    let project: Project | undefined;

    if (suppliedProject) {
      project = {
        ...suppliedProject,
        editorLayout: normalizeEditorLayout(suppliedProject.editorLayout),
      };
    } else if (suppliedProjectDetails) {
      project = {
        id: suppliedProjectDetails.name,
        projectDetail: suppliedProjectDetails,
        editorLayout: getEditorLayoutForSave(),
        lyricTexts: projectState.lyricTexts,
        lyricReference:
          projectState.unSavedLyricReference ?? projectState.lyricReference,
        generatedImageLog: aiState.generatedImageLog,
        promptLog: aiState.promptLog,
        images: projectState.images,
      };
    } else if (projectState.editingProject) {
      project = {
        id: projectState.editingProject.name,
        projectDetail: projectState.editingProject,
        editorLayout: getEditorLayoutForSave(),
        lyricTexts: projectState.lyricTexts,
        lyricReference:
          projectState.unSavedLyricReference ?? projectState.lyricReference,
        generatedImageLog: aiState.generatedImageLog,
        promptLog: aiState.promptLog,
        images: projectState.images,
      };
    }

    if (!project) return;
    if (!suppliedProject && !suppliedProjectDetails) {
      const target = authState.user && (storageTarget ?? authState.storagePreference) === "cloud" ? "cloud" : "local";
      if (!["local", "cloud"].includes(projectState.editingProjectAccess?.source ?? "") || projectState.editingProjectAccess?.source === target) project.versionId = projectState.activeVersionId;
    }

    const projectToSave = project;
    const canSaveProject =
      projectToSave.projectDetail.name.includes("(Demo)") ||
      Boolean(projectState.editingProjectAccess?.canSave ?? true);

    if (!canSaveProject) {
      ToastQueue.negative(
        "You can edit this project, but only local projects or projects you own can be saved.",
        { timeout: 5000 }
      );
      return;
    }

    const now = new Date();
    project = withSavedBrowserInfo({
      ...projectToSave,
      projectDetail: {
        ...projectToSave.projectDetail,
        createdDate: projectToSave.projectDetail.createdDate ?? now,
        updatedDate: now,
      },
    });

    if (project.projectDetail.name.includes("(Demo)")) {
      const clonedProjectDetail = await buildUniqueClonedProjectDetail(
        project.projectDetail
      );

      project = {
        ...project,
        id: clonedProjectDetail.name,
        projectDetail: clonedProjectDetail,
      };

      useProjectStore.getState().setEditingProject(clonedProjectDetail);
      ToastQueue.info(`Saved as ${clonedProjectDetail.name}`, {
        timeout: 4000,
      });
    }

    savingRef.current = true;

    // Cloud save
    if (authState.user && (storageTarget ?? authState.storagePreference) === "cloud") {
      try {
        const hasBase64Images = project.lyricTexts.some(
          (lt) => lt.isImage && lt.imageUrl?.startsWith("data:")
        );
        if (hasBase64Images) {
          ToastQueue.info("Uploading images...", { timeout: 3000 });
        }
        const saved = await saveProjectToFirestore(
          authState.user.uid,
          project,
          versionKind
        );
        useProjectStore.getState().updateLyricTexts(saved.lyricTexts);
        useProjectStore.getState().markAsSaved(project.editorLayout);
        useProjectStore.setState({ editingProjectId: saved.id, editingProjectAccess: { canSave: true, source: saved.source, ownerUid: authState.user?.uid, shouldWarnOnLoad: false }, workingProjectBaseline: snapshotProject(saved), activeVersionId: saved.versionId, activeVersionName: saved.versionName });
        ToastQueue.positive(versionKind ? "Version created" : "Successfully saved to cloud", { timeout: 5000 });
        return true;
      } catch (error) {
        console.error("Failed to save to cloud:", error);
        ToastQueue.negative("Failed to save to cloud", { timeout: 5000 });
        return false;
      } finally {
        savingRef.current = false;
      }
    }

    try {
      const saved = saveLocalProjectVersion(project, versionKind);
      useProjectStore.getState().markAsSaved(project.editorLayout);
      useProjectStore.setState({ editingProjectId: saved.id, editingProjectAccess: { canSave: true, source: saved.source, ownerUid: authState.user?.uid, shouldWarnOnLoad: false }, workingProjectBaseline: snapshotProject(saved), activeVersionId: saved.versionId, activeVersionName: saved.versionName });
      ToastQueue.positive(versionKind ? "Version created" : "Saved", { timeout: 4000 });
      return true;
    } catch (error) {
      console.error("Failed to save locally:", error);
      ToastQueue.negative("Could not save. Local storage may be full; your previous saved version is unchanged.", { timeout: 6000 });
      return false;
    } finally {
      savingRef.current = false;
    }
  };

  return [saveProject] as const;
}
