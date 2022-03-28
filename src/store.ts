import { LyricText } from "./Editor/types";
import create, { SetState, GetState } from "zustand";

interface EditorStore {
  lyricTexts: LyricText[];
  updateLyricTexts: (newLyricTexts: LyricText[]) => void;
  addNewLyricText: (text: string, start: number) => void;
}

export const useEditorStore = create(
  (set: SetState<EditorStore>, get: GetState<EditorStore>) => ({
    lyricTexts: [
      { start: 10, end: 30, text: "text 2" },
      { start: 50, end: 70, text: "hello" },
    ],
    updateLyricTexts: (newLyricTexts: LyricText[]) => {
      set({ lyricTexts: newLyricTexts });
    },
    addNewLyricText: (text: string, start: number) => {
      const { lyricTexts } = get();
      const maxEndTime = lyricTexts[lyricTexts.length - 1].end;
      const lyricTextsLen = lyricTexts.length;

      for (let index = 0; index < lyricTexts.length; index++) {
        const element = lyricTexts[index];

        // prevent adding overlapping
        if (start >= element.start && start <= element.end) {
          break;
        }

        if (start > maxEndTime) {
          set({
            lyricTexts: [...lyricTexts, { start, end: start + 1, text }].sort(
              (a, b) => a.start - b.start
            ),
          });
        } else if (element.start - start > 1) {
          set({
            lyricTexts: [...lyricTexts, { start, end: start + 1, text }].sort(
              (a, b) => a.start - b.start
            ),
          });
        }
      }
    },
  })
);
