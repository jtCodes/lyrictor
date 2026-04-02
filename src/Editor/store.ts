import { GetState, SetState, create } from "zustand";
import {
  LyricText,
  TimelineInteractionState,
  TimelineLoopRange,
  TimelineTool,
} from "./types";

interface DraggingLyricTextProgress {
  startLyricText: LyricText;
  endLyricText: LyricText;
  startY: number;
  endY: number;
}

export interface EditorStore {
  draggingLyricTextProgress?: DraggingLyricTextProgress;
  setDraggingLyricTextProgress: (progress?: DraggingLyricTextProgress) => void;

  draggingLyricTextPreviewLevels?: Record<number, number>;
  setDraggingLyricTextPreviewLevels: (
    previewLevels?: Record<number, number>
  ) => void;

  timelineLayerY: number;
  setTimelineLayerY: (timelineLayerY: number) => void;

  timelineInteractionState: TimelineInteractionState;
  setTimelineInteractionState: (
    timelineInteractionState: TimelineInteractionState
  ) => void;

  timelineLoopEnabled: boolean;
  setTimelineLoopEnabled: (isEnabled: boolean) => void;

  timelineLoopRange: TimelineLoopRange;
  setTimelineLoopRange: (timelineLoopRange: TimelineLoopRange) => void;

  editingText: LyricText | undefined;
  setEditingText: (lyricText: LyricText) => void;
  clearEditingText: () => void;

  selectedLyricTextIds: Set<number>;
  setSelectedLyricTextIds: (ids: Set<number>) => void;

  activeTimelineTool: TimelineTool;
  setActiveTimelineTool: (tool: TimelineTool) => void;

  isCustomizationPanelOpen: boolean;
  toggleCustomizationPanelOpenState: (isOpen?: boolean) => void;

  customizationPanelTabId:
    | "reference"
    | "text_settings"
    | "element_settings"
    | "image_settings";
  setCustomizationPanelTabId: (
    id:
      | "reference"
      | "text_settings"
      | "element_settings"
      | "image_settings"
  ) => void;

  previewContainerRef: HTMLElement | null;
  setPreviewContainerRef: (ref: HTMLElement | null) => void;

  showAllTextPreviewOverlay: boolean;
  setShowAllTextPreviewOverlay: (value: boolean) => void;
}

export const useEditorStore = create(
  (set: SetState<EditorStore>, get: GetState<EditorStore>): EditorStore => ({
    draggingLyricTextProgress: undefined,
    setDraggingLyricTextProgress: (progress?: DraggingLyricTextProgress) => {
      set({ draggingLyricTextProgress: progress });
    },
    draggingLyricTextPreviewLevels: undefined,
    setDraggingLyricTextPreviewLevels: (
      previewLevels?: Record<number, number>
    ) => {
      set({ draggingLyricTextPreviewLevels: previewLevels });
    },
    timelineLayerY: 0,
    setTimelineLayerY: (timelineLayerY: number) => {
      set({ timelineLayerY });
    },
    timelineInteractionState: { width: 0, layerX: 0, cursorX: 0 },
    setTimelineInteractionState: (
      timelineInteractionState: TimelineInteractionState
    ) => {
      set({ timelineInteractionState });
    },

    timelineLoopEnabled: false,
    setTimelineLoopEnabled: (timelineLoopEnabled: boolean) => {
      set({ timelineLoopEnabled });
    },

    timelineLoopRange: { start: 0, end: 0 },
    setTimelineLoopRange: (timelineLoopRange: TimelineLoopRange) => {
      set({ timelineLoopRange });
    },

    editingText: undefined,
    setEditingText: (lyricText: LyricText) => {
      set({ editingText: lyricText });
    },
    clearEditingText: () => {
      set({ editingText: undefined });
    },

    selectedLyricTextIds: new Set([]),
    setSelectedLyricTextIds: (ids: Set<number>) => {
      const { isCustomizationPanelOpen } = get();
      set({
        selectedLyricTextIds: ids,
        isCustomizationPanelOpen:
          ids.size === 0 ? false : isCustomizationPanelOpen,
      });
    },

    activeTimelineTool: "default",
    setActiveTimelineTool: (tool: TimelineTool) => {
      set({ activeTimelineTool: tool });
    },

    isCustomizationPanelOpen: false,
    toggleCustomizationPanelOpenState: (isOpen?: boolean) => {
      if (isOpen !== undefined) {
        set({ isCustomizationPanelOpen: isOpen });
      } else {
        const { isCustomizationPanelOpen } = get();
        set({ isCustomizationPanelOpen: !isCustomizationPanelOpen });
      }
    },

    customizationPanelTabId: "text_settings",
    setCustomizationPanelTabId: (
      id:
        | "reference"
        | "text_settings"
        | "element_settings"
        | "image_settings"
    ) => {
      set({ customizationPanelTabId: id });
    },

    previewContainerRef: null,
    setPreviewContainerRef: (ref: HTMLElement | null) => {
      set({ previewContainerRef: ref });
    },

    showAllTextPreviewOverlay: false,
    setShowAllTextPreviewOverlay: (value: boolean) => {
      set({ showAllTextPreviewOverlay: value });
    },
  })
);
