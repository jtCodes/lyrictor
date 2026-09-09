import { create } from "zustand";
const key = "lyrictor.previewUpscaling";
function initial() { try { return localStorage.getItem(key) !== "false"; } catch { return true; } }
export const usePreviewUpscaling = create<{
  enabled: boolean; exporting: boolean; setEnabled: (enabled: boolean) => void;
}>(set => ({
  enabled: initial(), exporting: false,
  setEnabled: enabled => {
    set({ enabled });
    try { localStorage.setItem(key, String(enabled)); } catch { /* Session preference still works. */ }
  },
}));
