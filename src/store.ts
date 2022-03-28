import { LyricText } from "./Editor/types";
import create, { SetState } from "zustand";

interface EditorStore {
  lyricTexts: LyricText[];
  updateLyricTexts: (newLyricTexts: LyricText[]) => void;
}

export const useEditorStore = create((set: SetState<EditorStore>) => ({
  lyricTexts: [
    { start: 10, end: 30, text: "text 2" },
    { start: 50, end: 70, text: "hello" },
  ],
  updateLyricTexts: (newLyricTexts: LyricText[]) => {
    set({ lyricTexts: newLyricTexts });
  },
}));
