import create from "zustand";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useOpenRouterStore } from "../api/openRouterStore";

export type StoragePreference = "cloud" | "local";

export interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;
  storagePreference: StoragePreference;
  setStoragePreference: (pref: StoragePreference) => void;
  loadUserSettings: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user: User | null) => set({ user }),
  authReady: false,
  setAuthReady: (ready: boolean) => set({ authReady: ready }),
  storagePreference: "cloud",
  setStoragePreference: async (pref: StoragePreference) => {
    set({ storagePreference: pref });
    const user = get().user;
    if (user) {
      await setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        storagePreference: pref,
      }, { merge: true });
    }
  },
  loadUserSettings: async () => {
    const user = get().user;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid, "settings", "preferences"));
    if (snap.exists()) {
      const data = snap.data();
      if (data.storagePreference === "cloud" || data.storagePreference === "local") {
        set({ storagePreference: data.storagePreference });
      }
      if (data.openRouterApiKey) {
        useOpenRouterStore.setState({ apiKey: data.openRouterApiKey });
      }
    }
  },
}));
