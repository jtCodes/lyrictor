import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import { useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "../Auth/store";
import { saveProjectToFirestore } from "./firestoreProjectService";

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

    // Cloud save
    if (user && storagePreference === "cloud") {
      try {
        await saveProjectToFirestore(user.uid, project);
        ToastQueue.positive("Successfully saved to cloud", { timeout: 5000 });
      } catch (error) {
        console.error("Failed to save to cloud:", error);
        ToastQueue.negative("Failed to save to cloud", { timeout: 5000 });
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
  };

  return [saveProject] as const;
}
