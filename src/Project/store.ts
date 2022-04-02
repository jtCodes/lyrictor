import create, { GetState, SetState } from "zustand";
import { LyricText } from "../Editor/types";
import { Project } from "./types";

export interface ProjectStore {
  editingProject?: Project;
  setEditingProject: (project?: Project) => void;
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
    setEditingProject: (project?: Project) => {
      set({ editingProject: project });
    },
    isPopupOpen: false,
    setIsPopupOpen: (isOpen: boolean) => {
      set({ isPopupOpen: isOpen });
    },
    lyricTexts: [
      {
        id: 1,
        start: 10,
        end: 30,
        text: "text 2",
        textY: 0,
        textX: 0,
        textBoxTimelineLevel: 1,
      },
      {
        id: 2,
        start: 50,
        end: 70,
        text: "hello",
        textY: 0,
        textX: 0,
        textBoxTimelineLevel: 1,
      },
    ],
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

export const saveProject = () => {};
