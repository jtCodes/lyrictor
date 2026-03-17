import create from "zustand";

export interface OpenRouterStore {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  isAuthenticated: () => boolean;
}

export const useOpenRouterStore = create<OpenRouterStore>((set, get) => ({
  apiKey: null,

  setApiKey: (key: string) => {
    set({ apiKey: key });
  },

  clearApiKey: () => {
    set({ apiKey: null });
  },

  isAuthenticated: () => {
    return get().apiKey !== null;
  },
}));
