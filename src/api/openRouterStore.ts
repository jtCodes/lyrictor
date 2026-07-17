import create from "zustand";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuthStore } from "../Auth/store";
import {
  fetchOpenRouterKeyInfo,
} from "./openRouterKeyInfo";
import type { OpenRouterKeyInfo } from "./openRouterKeyInfo";

let keyInfoRequestVersion = 0;

export interface OpenRouterStore {
  apiKey: string | null;
  keyInfo: OpenRouterKeyInfo | null;
  isKeyInfoLoading: boolean;
  setApiKey: (key: string) => void;
  hydrateApiKey: (key: string) => void;
  resetApiKey: () => void;
  clearApiKey: () => void;
  refreshKeyInfo: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export const useOpenRouterStore = create<OpenRouterStore>((set, get) => ({
  apiKey: null,
  keyInfo: null,
  isKeyInfoLoading: false,

  setApiKey: (key: string) => {
    set({ apiKey: key, keyInfo: null });
    void get().refreshKeyInfo();
    const user = useAuthStore.getState().user;
    if (user) {
      setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        openRouterApiKey: key,
      }, { merge: true });
    }
  },

  hydrateApiKey: (key: string) => {
    set({ apiKey: key, keyInfo: null });
    void get().refreshKeyInfo();
  },

  resetApiKey: () => {
    keyInfoRequestVersion += 1;
    set({ apiKey: null, keyInfo: null, isKeyInfoLoading: false });
  },

  clearApiKey: () => {
    get().resetApiKey();
    const user = useAuthStore.getState().user;
    if (user) {
      setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        openRouterApiKey: null,
      }, { merge: true });
    }
  },

  refreshKeyInfo: async () => {
    const apiKey = get().apiKey;
    const requestVersion = keyInfoRequestVersion + 1;
    keyInfoRequestVersion = requestVersion;

    if (!apiKey) {
      set({ keyInfo: null, isKeyInfoLoading: false });
      return;
    }

    set({ isKeyInfoLoading: true });

    try {
      const keyInfo = await fetchOpenRouterKeyInfo(apiKey);
      if (keyInfoRequestVersion === requestVersion && get().apiKey === apiKey) {
        set({ keyInfo });
      }
    } catch (error) {
      console.error("Failed to load OpenRouter credit allowance:", error);
      if (keyInfoRequestVersion === requestVersion && get().apiKey === apiKey) {
        set({ keyInfo: null });
      }
    } finally {
      if (keyInfoRequestVersion === requestVersion && get().apiKey === apiKey) {
        set({ isKeyInfoLoading: false });
      }
    }
  },

  isAuthenticated: () => {
    return get().apiKey !== null;
  },
}));
