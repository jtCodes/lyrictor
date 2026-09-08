import { create } from "zustand";

const STORAGE_KEY = "lyrictor.playbackDiagnostics";
function readPreference() {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; }
  catch { return false; }
}

export const usePlaybackDiagnosticsStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}>(set => ({
  enabled: readPreference(),
  setEnabled: enabled => {
    set({ enabled });
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); }
    catch { /* Keep the toggle usable when local storage is unavailable. */ }
  },
}));
