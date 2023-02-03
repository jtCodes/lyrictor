import create, { GetState, SetState } from "zustand";
import { LyricText } from "./types";

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

  editingText: LyricText | undefined;
  setEditingText: (lyricText: LyricText) => void;
  clearEditingText: () => void;

  selectedPreviewTextIds: Set<number>;
  clearSelectedPreviewTextIds: () => void;
  updateSelectedPreviewTextIds: (ids: number[]) => void;

  isCustomizationPanelOpen: boolean;
  toggleCustomizationPanelOpenState: () => void;
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

    editingText: undefined,
    setEditingText: (lyricText: LyricText) => {
      set({ editingText: lyricText });
    },
    clearEditingText: () => {
      set({ editingText: undefined });
    },

    selectedPreviewTextIds: new Set([]),
    updateSelectedPreviewTextIds: (ids: number[]) => {
      set({ selectedPreviewTextIds: new Set(ids) });
    },
    clearSelectedPreviewTextIds: () => {
      set({ selectedPreviewTextIds: new Set([]) });
    },

    isCustomizationPanelOpen: false,
    toggleCustomizationPanelOpenState: () => {
      const { isCustomizationPanelOpen } = get();
      set({ isCustomizationPanelOpen: !isCustomizationPanelOpen });
    },
  })
);
