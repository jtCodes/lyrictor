import { GeneratedImage, PromptParams, PromptParamsType } from "./types";
import create, { GetState, SetState } from "zustand";

export interface AIImageGeneratorStore {
  currentGenFileUrl?: string;
  setCurrentGenFileUrl: (url: string) => void;

  prompt: PromptParams;
  setPrompt: (prompt: PromptParams) => void;
  updatePrompt: (type: PromptParamsType, value: any) => void;

  promptLog: PromptParams[];
  logPrompt: (prompt: PromptParams) => void;
  setPromptLog: (promptLog: PromptParams[]) => void;

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

const initialPrompt = {
  prompt: "",
  negative_prompt: "",
  seed: 0,
  width: 0,
  height: 0,
  sampler_name: "",
  cfg_scale: 0,
  steps: 0,
};

export const useAIImageGeneratorStore = create<AIImageGeneratorStore>(
  (
    set: SetState<AIImageGeneratorStore>,
    get: GetState<AIImageGeneratorStore>
  ): AIImageGeneratorStore => ({
    reset: () => {
      set({
        prompt: initialPrompt,
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
    prompt: initialPrompt,
    setPrompt: (prompt: PromptParams) => {
      set({
        prompt,
      });
    },
    updatePrompt: (type: PromptParamsType, value: any) => {
      const { prompt } = get();
      if (prompt) {
        set({
          prompt: { ...prompt, [type]: value },
        });
      }
    },
    promptLog: [],
    logPrompt: (prompt: PromptParams) => {
      const { promptLog } = get();
      set({
        promptLog: [
          prompt,
          ...promptLog.filter((oldPrompt) => oldPrompt !== prompt),
        ],
      });
    },
    setPromptLog: (promptLog: PromptParams[]) => {
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
        selectedImageLogItem: undefined,
      });
    },
  })
);
