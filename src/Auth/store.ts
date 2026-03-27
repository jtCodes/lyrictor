import create from "zustand";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useOpenRouterStore } from "../api/openRouterStore";

export type StoragePreference = "cloud" | "local";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(name: string): boolean {
  return USERNAME_RE.test(name);
}

export interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;
  isDesktopSignInSuccessModalOpen: boolean;
  setIsDesktopSignInSuccessModalOpen: (open: boolean) => void;
  storagePreference: StoragePreference;
  setStoragePreference: (pref: StoragePreference) => void;
  username: string | null;
  setUsername: (name: string) => Promise<{ success: boolean; error?: string }>;
  checkUsernameAvailable: (name: string) => Promise<boolean>;
  loadUserSettings: () => Promise<void>;
  usernameLoaded: boolean;
  setUsernameLoaded: (loaded: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user: User | null) => set({ user }),
  authReady: false,
  setAuthReady: (ready: boolean) => set({ authReady: ready }),
  isDesktopSignInSuccessModalOpen: false,
  setIsDesktopSignInSuccessModalOpen: (open: boolean) =>
    set({ isDesktopSignInSuccessModalOpen: open }),
  usernameLoaded: false,
  setUsernameLoaded: (loaded: boolean) => set({ usernameLoaded: loaded }),
  storagePreference: "cloud",
  username: null,
  setStoragePreference: async (pref: StoragePreference) => {
    set({ storagePreference: pref });
    const user = get().user;
    if (user) {
      await setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        storagePreference: pref,
      }, { merge: true });
    }
  },
  checkUsernameAvailable: async (name: string): Promise<boolean> => {
    const snap = await getDoc(doc(db, "usernames", name.toLowerCase()));
    if (!snap.exists()) return true;
    const user = get().user;
    return snap.data().uid === user?.uid;
  },
  setUsername: async (name: string) => {
    const user = get().user;
    if (!user) return { success: false, error: "Not signed in" };
    if (get().username) {
      return { success: false, error: "Username cannot be changed once set" };
    }
    if (!isValidUsername(name)) {
      return { success: false, error: "3–20 characters, letters, numbers, and underscores only" };
    }

    const lower = name.toLowerCase();

    if (lower === "lyrictor") {
      return { success: false, error: "This username is reserved" };
    }

    // Check if taken by another user
    const snap = await getDoc(doc(db, "usernames", lower));
    if (snap.exists()) {
      if (snap.data().uid !== user.uid) {
        return { success: false, error: "Username is already taken" };
      }
      // Already reserved by this user — skip the write
    } else {
      // Reserve username (store display casing for public access)
      await setDoc(doc(db, "usernames", lower), { uid: user.uid, displayName: name });
    }

    // Store in user settings (preserve casing)
    await setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
      username: name,
    }, { merge: true });

    set({ username: name });
    return { success: true };
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
      if (data.username) {
        set({ username: data.username });
      }
    }
  },
}));
