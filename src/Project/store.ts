import create, { GetState, SetState } from "zustand";
import { LyricText } from "../Editor/types";
import { Project, ProjectDetail } from "./types";

export interface ProjectStore {
  editingProject?: ProjectDetail;
  setEditingProject: (project?: ProjectDetail) => void;
  isPopupOpen: boolean;
  setIsPopupOpen: (isOpen: boolean) => void;

  lyricTexts: LyricText[];
  updateLyricTexts: (newLyricTexts: LyricText[]) => void;
  addNewLyricText: (text: string, start: number) => void;
  isEditing: boolean;
  updateEditingStatus: () => void;
}

export const useProjectStore = create(
  (set: SetState<ProjectStore>, get: GetState<ProjectStore>): ProjectStore => ({
    editingProject: undefined,
    setEditingProject: (project?: ProjectDetail) => {
      set({ editingProject: project });
    },
    isPopupOpen: false,
    setIsPopupOpen: (isOpen: boolean) => {
      set({ isPopupOpen: isOpen });
    },
    lyricTexts: [],
    updateLyricTexts: (newLyricTexts: LyricText[]) => {
      set({ lyricTexts: newLyricTexts });
    },
    addNewLyricText: (text: string, start: number) => {
      const { lyricTexts } = get();
      const lyricTextToBeAdded: LyricText = {
        id: new Date().getTime(),
        start,
        end: start + 1,
        text,
        textY: 0.5,
        textX: 0.5,
        textBoxTimelineLevel: 4,
      };

      set({ lyricTexts: [...lyricTexts, lyricTextToBeAdded] });
    },
    isEditing: false,
    updateEditingStatus: () => {
      const { isEditing } = get();

      set({ isEditing: !isEditing });
    },
  })
);

export const saveProject = (project: Project) => {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  let existingProjects: Project[] | undefined = undefined;

  if (existingLocalProjects) {
    existingProjects = JSON.parse(existingLocalProjects) as Project[];
  }

  if (existingProjects) {
    let newProjects = existingProjects;
    const duplicateProjectIndex = newProjects.findIndex(
      (savedProject: Project) =>
        project.projectDetail.name === savedProject.projectDetail.name
    );

    if (duplicateProjectIndex !== undefined) {
      newProjects[duplicateProjectIndex] = project;
    } else {
      newProjects.push(project);
    }

    localStorage.setItem("lyrictorProjects", JSON.stringify(newProjects));
  } else {
    localStorage.setItem("lyrictorProjects", JSON.stringify([project]));
  }
};

export function isProjectExist(projectDetail: ProjectDetail) {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  let existingProjects: Project[] | undefined = undefined;

  if (existingLocalProjects) {
    existingProjects = JSON.parse(existingLocalProjects) as Project[];
    const duplicateProjectIndex = existingProjects.findIndex(
      (savedProject: Project) =>
        projectDetail.name === savedProject.projectDetail.name
    );

    return duplicateProjectIndex !== undefined;
  }

  return false;
}

export const loadProjects = (): Project[] => {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  if (existingLocalProjects) {
    return JSON.parse(existingLocalProjects) as Project[];
  }

  return [];
};
