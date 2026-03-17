import create from "zustand";
import { User } from "firebase/auth";

export type StoragePreference = "cloud" | "local";

export interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  storagePreference: StoragePreference;
  setStoragePreference: (pref: StoragePreference) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user: User | null) => set({ user }),
  storagePreference: "cloud",
  setStoragePreference: (pref: StoragePreference) => set({ storagePreference: pref }),
}));
