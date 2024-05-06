import create from "zustand";
import { v4 as uuidv4 } from "uuid";

export interface VisualizerSetting {
  id: string; // Unique identifier for each setting
  fillRadialGradientStartPoint: { x: number; y: number };
  fillRadialGradientEndPoint: { x: number; y: number };
  fillRadialGradientStartRadius: number;
  fillRadialGradientEndRadius: number;
  fillRadialGradientColorStops: [number, string][];
}

export const useAudioVisualizerStore = create<{
  settings: VisualizerSetting[];
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => void;
  addSetting: () => void;
}>((set) => ({
  settings: [
    {
      id: uuidv4(),
      x: 0,
      y: 0,
      fillRadialGradientStartPoint: { x: 50, y: 50 },
      fillRadialGradientEndPoint: { x: 50, y: 50 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: 100,
      fillRadialGradientColorStops: [
        [0, "rgba(0,0,0,0)"],
        [0.25, `rgba(256,256,256,0.5)`],
        [0.76, `rgba(90,0,0,0.3)`],
        [1, `rgba(48,0,0,0.5)`],
      ],
    },
  ],
  updateSetting: <T extends keyof VisualizerSetting>(
    id: string,
    property: T,
    value: VisualizerSetting[T]
  ) => {
    set((state) => ({
      settings: state.settings.map((setting) =>
        setting.id === id ? { ...setting, [property]: value } : setting
      ),
    }));
  },
  addSetting: () => {
    set((state) => ({
      settings: [
        ...state.settings,
        {
          id: uuidv4(),
          fillRadialGradientStartPoint: { x: 50, y: 50 },
          fillRadialGradientEndPoint: { x: 50, y: 50 },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndRadius: 100,
          fillRadialGradientColorStops: [
            [0, "rgba(0,0,0,0)"],
            [0.25, `rgba(256,256,256,0.5)`],
            [0.76, `rgba(90,0,0,0.3)`],
            [1, `rgba(48,0,0,0.5)`],
          ],
        },
      ],
    }));
  },
}));
