import { GeneratedImage } from "./types";
import create, { GetState, SetState } from "zustand";

export interface AIImageGeneratorStore {
  currentGenFileUrl?: string;
  setCurrentGenFileUrl: (url: string) => void;

  prompt: string | undefined;
  setPrompt: (prompt: string) => void;

  promptLog: string[];
  logPrompt: (prompt: string) => void;
  setPromptLog: (promptLog: string[]) => void;

  generatedImageLog: GeneratedImage[];
  logGeneratedImage: (image: GeneratedImage) => void;
  setGeneratedImageLog: (generatedImageLog: GeneratedImage[]) => void;

  selectedImageLogItem: GeneratedImage | undefined;
  setSelectedImageLogTiem: (image: GeneratedImage) => void;

  hiddenImages: string[];
  hideImage: (imageUrl: string) => void;

  reset: () => void;
}

export const getImageFileUrl = (url: string) => {
  return `http://127.0.0.1:7860/file=${url}`;
};

export const useAIImageGeneratorStore = create<AIImageGeneratorStore>(
  (
    set: SetState<AIImageGeneratorStore>,
    get: GetState<AIImageGeneratorStore>
  ): AIImageGeneratorStore => ({
    reset: () => {
      set({
        prompt: undefined,
        promptLog: [],
        generatedImageLog: [],
        selectedImageLogItem: undefined,
        currentGenFileUrl: undefined,
      });
    },
    currentGenFileUrl: undefined,
    setCurrentGenFileUrl: (url: string) => {
      set({
        currentGenFileUrl: getImageFileUrl(url),
      });
    },
    prompt: undefined,
    setPrompt: (prompt: string) => {
      set({
        prompt,
      });
    },
    promptLog: [],
    logPrompt: (prompt: string) => {
      const { promptLog } = get();
      set({
        promptLog: [
          prompt,
          ...promptLog.filter((oldPrompt) => oldPrompt !== prompt),
        ],
      });
    },
    setPromptLog: (promptLog: string[]) => {
      set({
        promptLog,
      });
    },
    generatedImageLog: [],
    logGeneratedImage: (image: GeneratedImage) => {
      const { generatedImageLog } = get();
      set({
        generatedImageLog: [image, ...generatedImageLog],
      });
    },
    setGeneratedImageLog: (generatedImageLog: GeneratedImage[]) => {
      set({
        generatedImageLog,
      });
    },
    selectedImageLogItem: undefined,
    setSelectedImageLogTiem: (image: GeneratedImage) => {
      const { selectedImageLogItem } = get();
      set({
        selectedImageLogItem:
          image.url === selectedImageLogItem?.url ? undefined : image,
      });
    },
    hiddenImages: [],
    hideImage: (imageUrl: string) => {
      const { generatedImageLog } = get();
      set({
        generatedImageLog: generatedImageLog.filter(
          (image) => image.url !== imageUrl
        ),
      });
    },
  })
);
