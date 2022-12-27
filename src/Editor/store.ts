import create, { GetState, SetState } from "zustand";
import { Coordinate, LyricText } from "./types";

interface DraggingLyricTextProgress {
  startLyricText: LyricText;
  endLyricText: LyricText;
  startY: number;
  endY: number;
}
export interface EditorStore {
  draggingLyricTextProgress?: DraggingLyricTextProgress;
  setDraggingLyricTextProgress: (progress?: DraggingLyricTextProgress) => void;
  timelineLayerX: number;
  setTimelineLayerX: (timelineLayerX: number) => void;
  timelineLayerY: number;
  setTimelineLayerY: (timelineLayerY: number) => void;
}

export const useEditorStore = create(
  (set: SetState<EditorStore>, get: GetState<EditorStore>): EditorStore => ({
    draggingLyricTextProgress: undefined,
    setDraggingLyricTextProgress: (progress?: DraggingLyricTextProgress) => {
      set({ draggingLyricTextProgress: progress });
    },
    timelineLayerX: 0,
    timelineLayerY: 0,
    setTimelineLayerX: (timelineLayerX: number) => {
      set({ timelineLayerX });
    },
    setTimelineLayerY: (timelineLayerY: number) => {
      set({ timelineLayerY });
    },
  })
);
