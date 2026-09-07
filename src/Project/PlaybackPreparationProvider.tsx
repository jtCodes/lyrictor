import { createContext, ReactNode, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PlaybackPreparation } from "./playbackPreparation";

const Context = createContext<PlaybackPreparation | undefined>(undefined);
const ready = { preparing: false, queued: false, completed: 0, total: 0 };
const subscribeToNothing = () => () => {};
const getReady = () => ready;

export function PlaybackPreparationProvider({ children }: { children: ReactNode }) {
  const [preparation] = useState(() => new PlaybackPreparation());
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => { if (!mounted.current) preparation.dispose(); });
    };
  }, [preparation]);
  return <Context.Provider value={preparation}>{children}</Context.Provider>;
}
export const usePlaybackPreparation = () => useContext(Context);
export function usePlaybackPreparationState() {
  const preparation = usePlaybackPreparation();
  return useSyncExternalStore(preparation?.subscribe ?? subscribeToNothing, preparation?.getSnapshot ?? getReady, getReady);
}
