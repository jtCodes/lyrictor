import create, { GetState, SetState } from "zustand";

export interface AIImageGeneratorStore {
  currentGenFileUrl?: string;
  setCurrentGenFileUrl: (url: string) => void;
  clearStore: () => void;
}

export const useAIImageGeneratorStore = create<AIImageGeneratorStore>(
  (
    set: SetState<AIImageGeneratorStore>,
    get: GetState<AIImageGeneratorStore>
  ): AIImageGeneratorStore => ({
    currentGenFileUrl: undefined,
    setCurrentGenFileUrl: (url: string) => {
      set({
        currentGenFileUrl: `http://127.0.0.1:7860/file=${url}`,
      });
    },
    clearStore: () => {
      set({
        currentGenFileUrl: undefined,
      });
    },
  })
);
