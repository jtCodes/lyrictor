import type { EditorStore } from "./store";
import type { EditorLayout } from "./editorLayout";
import type { LyricText } from "./types";
import { widthFromZoomSliderValue } from "./AudioTimeline/zoom";

export function captureEditorWorkspace(state: EditorStore): Partial<EditorLayout> {
  return {
    mediaPanelTab: state.mediaPanelTabId,
    settingsPanelTab: state.customizationPanelTabId === "reference" ? "text_settings" : state.customizationPanelTabId,
    selectedItemIds: [...state.selectedLyricTextIds],
    customizationPanelOpen: state.isCustomizationPanelOpen,
    previewGrid: state.showPreviewGrid,
    previewAllText: state.showAllTextPreviewOverlay,
    activeTool: state.activeTimelineTool,
    loopEnabled: state.timelineLoopEnabled,
    loopStart: state.timelineLoopRange.start,
    loopEnd: state.timelineLoopRange.end,
    inspectorSections: state.inspectorSections,
    cameraEditors: state.cameraEditors,
  };
}

export function restoreEditorWorkspace(layout: EditorLayout, items: LyricText[]): Partial<EditorStore> {
  const ids = new Set(items.map(item => item.id));
  const selectedLyricTextIds = new Set(layout.selectedItemIds.filter(id => ids.has(id)));
  const cameraEditors = Object.fromEntries(items.filter(item =>
    (item.isCamera || item.elementType === "camera") &&
    (layout.cameraEditors[item.id] !== undefined || selectedLyricTextIds.has(item.id))
  ).map(camera => {
    const selection = layout.cameraEditors[camera.id];
    const overrides = camera.cameraSettings?.overrides ?? [];
    const exists = selection?.overrideId && overrides.some(override => override.id === selection.overrideId);
    const active = layout.playheadPosition >= camera.start && layout.playheadPosition <= camera.end
      ? [...overrides].sort((a,b) => a.startOffset - b.startOffset).filter(override => override.startOffset <= layout.playheadPosition - camera.start).pop() : undefined;
    return [String(camera.id), selection
      ? { overrideId: exists ? selection.overrideId : undefined, endpoint: exists ? selection.endpoint : "to" as const }
      : { overrideId: active?.id, endpoint: "to" as const }];
  }));
  return {
    mediaPanelTabId: layout.mediaPanelTab,
    customizationPanelTabId: layout.settingsPanelTab,
    selectedLyricTextIds,
    isCustomizationPanelOpen: selectedLyricTextIds.size > 0 && layout.customizationPanelOpen,
    showPreviewGrid: layout.previewGrid,
    showAllTextPreviewOverlay: layout.previewAllText,
    activeTimelineTool: layout.activeTool,
    timelineLoopEnabled: layout.loopEnabled,
    timelineLoopRange: { start: layout.loopStart, end: layout.loopEnd },
    inspectorSections: layout.inspectorSections,
    cameraEditors,
    timelineLayerY: -900 * layout.timelineScrollY,
    pendingWorkspaceRestore: layout,
  };
}

export function getWorkspaceHorizontalThumbX(layerX: number, timelineWidth: number, viewportWidth: number, thumbWidth: number) {
  return Math.min(Math.max(0, viewportWidth - thumbWidth), Math.max(0, -layerX / timelineWidth * viewportWidth));
}

export function resolveWorkspaceTimeline(layout: EditorLayout, viewportWidth: number, duration: number) {
  const width = Math.min(widthFromZoomSliderValue(viewportWidth, 1, duration), viewportWidth * layout.timelineZoom);
  const layerX = -Math.min(width - viewportWidth, layout.timelineScrollX * width);
  const position = Math.min(duration, layout.playheadPosition);
  const start = Math.min(layout.loopStart, Math.max(0, duration - .1));
  const end = Math.min(duration, Math.max(start + Math.min(.1, duration), layout.loopEnd || duration));
  return {
    interaction: { width, layerX, cursorX: duration > 0 ? position / duration * width : 0 },
    position,
    loopRange: { start, end },
    layout: { timelineZoom: width / viewportWidth, timelineScrollX: -layerX / width,
      timelineScrollY: layout.timelineScrollY, playheadPosition: position, loopStart: start, loopEnd: end },
  };
}
