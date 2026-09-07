export type MediaPanelTab = "lyrics" | "images" | "effects" | "ai";
export type SettingsPanelTab = "text_settings" | "element_settings" | "image_settings";
export interface CameraEditorSelection { overrideId?: string; endpoint: "from" | "to" }

export interface EditorLayout {
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  mediaPanelTab: MediaPanelTab;
  settingsPanelTab: SettingsPanelTab;
  selectedItemIds: number[];
  customizationPanelOpen: boolean;
  previewGrid: boolean;
  previewAllText: boolean;
  activeTool: "default" | "cut";
  timelineZoom: number;
  timelineScrollX: number;
  timelineScrollY: number;
  playheadPosition: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  inspectorSections: Record<string, boolean>;
  cameraEditors: Record<string, CameraEditorSelection>;
  lightEditors: Record<string, { changeId?: string; fieldIndex: number }>;
}

export const MIN_SIDE_PANEL_WIDTH = 350;
export const MIN_TIMELINE_HEIGHT = 180;

export const DEFAULT_EDITOR_LAYOUT: Readonly<EditorLayout> = {
  leftPanelWidth: 380,
  rightPanelWidth: 350,
  timelineHeight: 260,
  leftPanelVisible: true,
  rightPanelVisible: true,
  mediaPanelTab: "lyrics",
  settingsPanelTab: "text_settings",
  selectedItemIds: [],
  customizationPanelOpen: false,
  previewGrid: false,
  previewAllText: false,
  activeTool: "default",
  timelineZoom: 1,
  timelineScrollX: 0,
  timelineScrollY: 1,
  playheadPosition: 0,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 0,
  inspectorSections: {},
  cameraEditors: {},
  lightEditors: {},
};

/** Accept older/partial projects without letting malformed sizes break the UI. */
export function normalizeEditorLayout(value?: unknown): EditorLayout {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const size = (key: keyof EditorLayout, min: number) => {
    const value = data[key];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(10000, Math.max(min, value))
      : DEFAULT_EDITOR_LAYOUT[key] as number;
  };
  const number = (key: keyof EditorLayout, min: number, max: number) => {
    const value = data[key];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value)) : DEFAULT_EDITOR_LAYOUT[key] as number;
  };
  const boolean = (key: keyof EditorLayout) => typeof data[key] === "boolean"
    ? data[key] as boolean : DEFAULT_EDITOR_LAYOUT[key] as boolean;
  const choice = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
    options.includes(value as T) ? value as T : fallback;
  const entries = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value).filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key)) : [];
  return {
    mediaPanelTab: choice(data.mediaPanelTab, ["lyrics", "images", "effects", "ai"], "lyrics"),
    settingsPanelTab: choice(data.settingsPanelTab, ["text_settings", "element_settings", "image_settings"], "text_settings"),
    selectedItemIds: Array.isArray(data.selectedItemIds)
      ? [...new Set(data.selectedItemIds.filter((id): id is number => typeof id === "number" && Number.isFinite(id)))] : [],
    customizationPanelOpen: boolean("customizationPanelOpen"),
    previewGrid: boolean("previewGrid"),
    previewAllText: boolean("previewAllText"),
    activeTool: choice(data.activeTool, ["default", "cut"], "default"),
    timelineZoom: number("timelineZoom", 1, 1000000),
    timelineScrollX: number("timelineScrollX", 0, 1),
    timelineScrollY: number("timelineScrollY", 0, 1),
    playheadPosition: number("playheadPosition", 0, 1000000),
    loopEnabled: boolean("loopEnabled"),
    loopStart: number("loopStart", 0, 1000000),
    loopEnd: number("loopEnd", 0, 1000000),
    inspectorSections: Object.fromEntries(entries(data.inspectorSections).filter(([,value]) => typeof value === "boolean")),
    lightEditors: Object.fromEntries(entries(data.lightEditors).filter(([key,value]) =>
      Number.isFinite(Number(key)) && value && typeof value === "object"
    ).map(([key,value]) => [key, {
      changeId: typeof value.changeId === "string" ? value.changeId : undefined,
      fieldIndex: typeof value.fieldIndex === "number" && Number.isFinite(value.fieldIndex) ? Math.max(0, Math.floor(value.fieldIndex)) : 0,
    }])),
    cameraEditors: Object.fromEntries(entries(data.cameraEditors).filter(([key,value]) =>
      Number.isFinite(Number(key)) && value && typeof value === "object"
    ).map(([key,value]) => [key, {
      overrideId: typeof value.overrideId === "string" ? value.overrideId : undefined,
      endpoint: value.endpoint === "from" ? "from" : "to",
    }])),
    leftPanelWidth: size("leftPanelWidth", MIN_SIDE_PANEL_WIDTH),
    rightPanelWidth: size("rightPanelWidth", MIN_SIDE_PANEL_WIDTH),
    timelineHeight: size("timelineHeight", MIN_TIMELINE_HEIGHT),
    leftPanelVisible: typeof data.leftPanelVisible === "boolean"
      ? data.leftPanelVisible : DEFAULT_EDITOR_LAYOUT.leftPanelVisible,
    rightPanelVisible: typeof data.rightPanelVisible === "boolean"
      ? data.rightPanelVisible : DEFAULT_EDITOR_LAYOUT.rightPanelVisible,
  };
}

/** Fit the viewport without overwriting the project's preferred panel widths. */
export function fitEditorPanelWidths(layout: EditorLayout, windowWidth: number) {
  const left = layout.leftPanelVisible ? layout.leftPanelWidth : 0;
  const right = layout.rightPanelVisible ? layout.rightPanelWidth : 0;
  const budget = Math.max(0, windowWidth - 245); // preview plus borders
  const total = left + right;
  if (total <= budget) return { left, right };
  const count = Number(layout.leftPanelVisible) + Number(layout.rightPanelVisible);
  const min = Math.min(MIN_SIDE_PANEL_WIDTH, budget / count);
  const extra = total - min * count;
  const availableExtra = budget - min * count;
  const fit = (width: number) => width === 0 ? 0
    : min + (extra > 0 ? (width - min) * availableExtra / extra : 0);
  return { left: fit(left), right: fit(right) };
}
