import { LyricText } from "./types";
import create, { SetState, GetState } from "zustand";

interface EditorStore {
  lyricTexts: LyricText[];
  updateLyricTexts: (newLyricTexts: LyricText[]) => void;
  addNewLyricText: (text: string, start: number) => void;
  isEditing: boolean;
  updateEditingStatus: () => void;
}

export const useEditorStore = create(
  (set: SetState<EditorStore>, get: GetState<EditorStore>): EditorStore => ({
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

      // for (let index = 0; index < lyricTexts.length; index++) {
      //   const element = lyricTexts[index];

      //   // prevent adding overlapping
      //   if (start >= element.start && start <= element.end) {
      //     break;
      //   }

      //   if (start > maxEndTime) {
      //     set({
      //       lyricTexts: [...lyricTexts, lyricTextToBeAdded].sort(
      //         (a, b) => a.start - b.start
      //       ),
      //     });
      //   } else if (element.start - start > 1) {
      //     set({
      //       lyricTexts: [...lyricTexts, lyricTextToBeAdded].sort(
      //         (a, b) => a.start - b.start
      //       ),
      //     });
      //   }
      // }
    },
    isEditing: false,
    updateEditingStatus: () => {
      const { isEditing } = get();

      set({ isEditing: !isEditing });
    },
  })
);
