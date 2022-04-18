import create, { GetState, SetState } from "zustand";
import { Coordinate, LyricText } from "./types";

interface DragginLyricTextProgress {
  start: LyricText;
  end: LyricText;
}
export interface EditorStore {
  draggingLyricTextProgress?: DragginLyricTextProgress;
  setDraggingLyricTextProgress: (progress?: DragginLyricTextProgress) => void;
}

export const useEditorStore = create(
  (set: SetState<EditorStore>, get: GetState<EditorStore>): EditorStore => ({
    draggingLyricTextProgress: undefined,
    setDraggingLyricTextProgress: (progress?: DragginLyricTextProgress) => {
      set({ draggingLyricTextProgress: progress });
    },
  })
);
