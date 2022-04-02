import create, { GetState, SetState } from "zustand";
import { Project } from "../types";

export interface ProjectStore {
  editingProject?: Project;
  setEditingProject: (project?: Project) => void;
  isPopupOpen: boolean;
  setIsPopupOpen: (isOpen: boolean) => void;
}

export const useProjectStore = create(
  (set: SetState<ProjectStore>, get: GetState<ProjectStore>): ProjectStore => ({
    editingProject: undefined,
    setEditingProject: (project?: Project) => {
      set({ editingProject: project });
    },
    isPopupOpen: false,
    setIsPopupOpen: (isOpen: boolean) => {
      set({ isPopupOpen: isOpen });
    },
  })
);
