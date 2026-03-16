import create from "zustand";

const SESSION_KEY = "openrouter_api_key";

export interface OpenRouterStore {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  isAuthenticated: () => boolean;
}

export const useOpenRouterStore = create<OpenRouterStore>((set, get) => ({
  apiKey: sessionStorage.getItem(SESSION_KEY),

  setApiKey: (key: string) => {
    sessionStorage.setItem(SESSION_KEY, key);
    set({ apiKey: key });
  },

  clearApiKey: () => {
    sessionStorage.removeItem(SESSION_KEY);
    set({ apiKey: null });
  },

  isAuthenticated: () => {
    return get().apiKey !== null;
  },
}));
