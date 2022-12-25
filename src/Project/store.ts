import create, { GetState, SetState } from "zustand";
import { LyricText } from "../Editor/types";
import { sample } from "../sampledata";
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

  lyricReference?: string;
  setLyricReference: (lyricReference?: string) => void;
  unSavedLyricReference?: string;
  setUnsavedLyricReference: (lyricReference?: string) => void;

  existingProjects: Project[];
  setExistingProjects: (projects: Project[]) => void;

  lyricTextsHistory: LyricText[][];
  undoLyricTextEdit: () => void;
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
      const { lyricTexts, lyricTextsHistory } = get();
      lyricTextsHistory.push(lyricTexts);
      
      set({
        lyricTexts: newLyricTexts,
        lyricTextsHistory,
      });
    },
    addNewLyricText: (text: string, start: number) => {
      const { lyricTexts, lyricTextsHistory } = get();
      const lyricTextToBeAdded: LyricText = {
        id: generateLyricTextId(),
        start,
        end: start + 1,
        text,
        textY: 0.5,
        textX: 0.5,
        textBoxTimelineLevel: getNewTextLevel(start, start + 1, lyricTexts),
      };
      const newLyricTexts = [...lyricTexts, lyricTextToBeAdded];
      let newLyricTextsHistory = [...lyricTextsHistory];
      newLyricTextsHistory.push(lyricTexts);

      set({
        lyricTexts: newLyricTexts,
        lyricTextsHistory: newLyricTextsHistory,
      });
    },
    isEditing: false,
    updateEditingStatus: () => {
      const { isEditing } = get();

      set({ isEditing: !isEditing });
    },
    lyricReference: undefined,
    setLyricReference: (lyricReference?: string) => {
      set({ lyricReference });
    },
    unSavedLyricReference: undefined,
    setUnsavedLyricReference: (lyricReference?: string) => {
      set({ unSavedLyricReference: lyricReference });
    },
    existingProjects: [],
    setExistingProjects: (projects: Project[]) => {
      set({ existingProjects: projects });
    },
    lyricTextsHistory: [],
    undoLyricTextEdit: () => {
      const { lyricTextsHistory } = get();
      const lastHistory = lyricTextsHistory.pop();

      if (lastHistory) {
        set({ lyricTexts: lastHistory, lyricTextsHistory });
      }
    },
  })
);

// level should be 1 level higher that the highest overlapping text box
function getNewTextLevel(start: number, end: number, lyricTexts: LyricText[]) {
  const overlappingLyricTexts = lyricTexts.filter((lyricText) => {
    let isOverlapping: boolean = false;
    if (
      (lyricText.start <= start && lyricText.end >= end) ||
      (start >= lyricText.start && start <= lyricText.end) ||
      (end >= lyricText.start && end <= lyricText.end)
    ) {
      isOverlapping = true;
    }
    return isOverlapping;
  });

  if (overlappingLyricTexts.length === 0) {
    return 1;
  }

  return (
    overlappingLyricTexts.reduce((prev, cur) =>
      prev.textBoxTimelineLevel > cur.textBoxTimelineLevel ? prev : cur
    ).textBoxTimelineLevel + 1
  );
}

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

    if (duplicateProjectIndex !== undefined && duplicateProjectIndex >= 0) {
      newProjects[duplicateProjectIndex] = project;
    } else {
      newProjects.push(project);
    }

    localStorage.setItem("lyrictorProjects", JSON.stringify(newProjects));
  } else {
    localStorage.setItem("lyrictorProjects", JSON.stringify([project]));
  }
};

export const deleteProject = (project: Project) => {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");

  let existingProjects: Project[] | undefined = undefined;

  if (existingLocalProjects) {
    existingProjects = JSON.parse(existingLocalProjects) as Project[];
  }

  if (existingProjects) {
    localStorage.setItem(
      "lyrictorProjects",
      JSON.stringify(
        existingProjects.filter(
          (loopProject) =>
            loopProject.projectDetail.name !== project.projectDetail.name
        )
      )
    );
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

    return duplicateProjectIndex !== undefined && duplicateProjectIndex >= 0;
  }

  return false;
}

export const loadProjects = (): Project[] => {
  const existingLocalProjects = localStorage.getItem("lyrictorProjects");
  const sampleProjects = sample as unknown as Project[];

  if (existingLocalProjects) {
    const localProjects = JSON.parse(existingLocalProjects) as Project[];
    return [...localProjects, ...sampleProjects];
  }

  return sampleProjects;
};

export const generateLyricTextId = () => {
  return new Date().getTime() + window.performance.now();
};
