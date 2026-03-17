import create from "zustand";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuthStore } from "../Auth/store";

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
    const user = useAuthStore.getState().user;
    if (user) {
      setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        openRouterApiKey: key,
      }, { merge: true });
    }
  },

  clearApiKey: () => {
    set({ apiKey: null });
    const user = useAuthStore.getState().user;
    if (user) {
      setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        openRouterApiKey: null,
      }, { merge: true });
    }
  },

  isAuthenticated: () => {
    return get().apiKey !== null;
  },
}));
