import { useCallback, useEffect, useRef } from "react";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { isProjectExist, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "../Auth/store";
import { saveProjectToFirestore } from "./firestoreProjectService";

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
    const candidateName =
      attempt === 1 ? `${root} (Cloned)` : `${root} (Cloned ${attempt})`;

    const candidateDetail: ProjectDetail = {
      ...source,
      name: candidateName,
      createdDate: new Date(),
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
  };
}

export function useProjectService() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const unSavedLyricReference = useProjectStore(
    (state) => state.unSavedLyricReference
  );
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const importedImages = useProjectStore((state) => state.images);
  const generatedImageLog = useAIImageGeneratorStore(
    (state) => state.generatedImageLog
  );
  const promptLog = useAIImageGeneratorStore((state) => state.promptLog);
  const user = useAuthStore((state) => state.user);
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const savingRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savingRef.current || JSON.stringify(useProjectStore.getState().lyricTexts) !== useProjectStore.getState().savedLyricTextsSnapshot) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveProject = async (
    suppliedProject?: Project,
    suppliedProjectDetails?: ProjectDetail
  ) => {
    let project: Project | undefined;

    if (suppliedProject) {
      project = suppliedProject;
    } else if (suppliedProjectDetails) {
      project = {
        id: suppliedProjectDetails.name,
        projectDetail: suppliedProjectDetails,
        lyricTexts,
        lyricReference: unSavedLyricReference ?? lyricReference,
        generatedImageLog,
        promptLog,
        images: importedImages
      };
    } else if (editingProject) {
      project = {
        id: editingProject.name,
        projectDetail: editingProject,
        lyricTexts,
        lyricReference: unSavedLyricReference ?? lyricReference,
        generatedImageLog,
        promptLog,
        images: importedImages
      };
    }

    if (!project) return;

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
    if (user && storagePreference === "cloud") {
      try {
        const hasBase64Images = project.lyricTexts.some(
          (lt) => lt.isImage && lt.imageUrl?.startsWith("data:")
        );
        if (hasBase64Images) {
          ToastQueue.info("Uploading images...", { timeout: 3000 });
        }
        const uploadedLyricTexts = await saveProjectToFirestore(user.uid, project);
        useProjectStore.getState().updateLyricTexts(uploadedLyricTexts);
        useProjectStore.getState().markAsSaved();
        ToastQueue.positive("Successfully saved to cloud", { timeout: 5000 });
      } catch (error) {
        console.error("Failed to save to cloud:", error);
        ToastQueue.negative("Failed to save to cloud", { timeout: 5000 });
      } finally {
        savingRef.current = false;
      }
      return;
    }

    // Local save
    const existingLocalProjects = localStorage.getItem("lyrictorProjects");

    let existingProjects: Project[] | undefined = undefined;

    if (existingLocalProjects) {
      existingProjects = JSON.parse(existingLocalProjects) as Project[];
    }

    if (existingProjects) {
      let newProjects = existingProjects;
      const duplicateProjectIndex = newProjects.findIndex(
        (savedProject: Project) =>
          project?.projectDetail.name === savedProject.projectDetail.name
      );

      if (duplicateProjectIndex !== undefined && duplicateProjectIndex >= 0) {
        newProjects[duplicateProjectIndex] = project;
      } else {
        newProjects.push(project);
      }

      localStorage.setItem("lyrictorProjects", JSON.stringify(newProjects));

      ToastQueue.positive("Successfully saved to localStorage", {
        timeout: 5000,
      });
    } else {
      localStorage.setItem("lyrictorProjects", JSON.stringify([project]));

      ToastQueue.positive("Successfully saved to localStorage", {
        timeout: 5000,
      });
    }

    useProjectStore.getState().markAsSaved();
    savingRef.current = false;
  };

  return [saveProject] as const;
}
