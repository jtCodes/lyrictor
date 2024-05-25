import create from "zustand";

export interface VisualizerSettingValue {
  value: number;
  beatSyncIntensity: number;
}

export interface VisualizerSetting {
  fillRadialGradientStartPoint: { x: number; y: number };
  fillRadialGradientEndPoint: { x: number; y: number };
  fillRadialGradientStartRadius: VisualizerSettingValue;
  fillRadialGradientEndRadius: VisualizerSettingValue;
  fillRadialGradientColorStops: (string | number)[];
}

export const DEFAULT_VISUALIZER_SETTING: VisualizerSetting = {
  fillRadialGradientStartPoint: { x: 50, y: 50 },
  fillRadialGradientEndPoint: { x: 50, y: 50 },
  fillRadialGradientStartRadius: { value: 0, beatSyncIntensity: 0 },
  fillRadialGradientEndRadius: { value: 1, beatSyncIntensity: 0 },
  fillRadialGradientColorStops: [
    0,
    "rgba(0,0,0,0)",
    0.25,
    `rgba(256,256,256,0.5)`,
    0.76,
    `rgba(90,0,0,0.3)`,
    1,
    `rgba(48,0,0,0.5)`,
  ],
};

export const useAudioVisualizerStore = create<{
  settings: VisualizerSetting[];
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => void;
  addSetting: (from: number, to: number, textBoxTimelineLevel: number) => void;
}>((set) => ({
  settings: [],
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => {
    // set((state) => ({
    //   settings: state.settings.map((setting) =>
    //     setting.id === id ? { ...setting, [property]: value } : setting
    //   ),
    // }));
  },
  addSetting: (from: number, to: number, textBoxTimelineLevel: number) => {
    set((state) => ({
      settings: [],
    }));
  },
}));
