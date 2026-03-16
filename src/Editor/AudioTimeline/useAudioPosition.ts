import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Howler } from "howler";

// ---------------------------------------------------------------------------
// Singleton audio-position store
//
// A single rAF loop (or 1 s interval) polls Howler and writes to a shared
// snapshot. React components subscribe via useSyncExternalStore — React
// decides when & how to batch re-renders, which is faster than per-component
// setState. The loop auto-starts/stops with subscriber count.
// ---------------------------------------------------------------------------

interface Snapshot {
  position: number;
  duration: number;
}

let snapshot: Snapshot = { position: 0, duration: 0 };

const subscribers = new Set<() => void>();

let rafId: number | null = null;
let intervalId: number | null = null;
let highRefreshCount = 0;
let lowRefreshCount = 0;

function getPlayer(): Howl | null {
  const howls = (Howler as any)._howls as Howl[] | undefined;
  return howls && howls.length > 0 ? howls[howls.length - 1] : null;
}

function emitChange() {
  subscribers.forEach((cb) => cb());
}

function poll() {
  const player = getPlayer();
  if (!player) return;
  const raw = player.seek();
  const pos = typeof raw === "number" ? raw : 0;
  const dur = player.duration() || snapshot.duration;
  if (pos !== snapshot.position || dur !== snapshot.duration) {
    snapshot = { position: pos, duration: dur };
    emitChange();
  }
}

function startHighRefresh() {
  if (rafId !== null) return;
  const loop = () => {
    poll();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopHighRefresh() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function startLowRefresh() {
  if (intervalId !== null) return;
  intervalId = window.setInterval(poll, 1000);
}

function stopLowRefresh() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function subscribeStore(
  callback: () => void,
  highRefreshRate: boolean
): () => void {
  subscribers.add(callback);

  if (highRefreshRate) {
    highRefreshCount++;
    if (highRefreshCount === 1) {
      stopLowRefresh();
      startHighRefresh();
    }
  } else {
    lowRefreshCount++;
    if (highRefreshCount === 0 && lowRefreshCount === 1) {
      startLowRefresh();
    }
  }

  return () => {
    subscribers.delete(callback);

    if (highRefreshRate) {
      highRefreshCount--;
      if (highRefreshCount === 0) {
        stopHighRefresh();
        if (lowRefreshCount > 0) startLowRefresh();
      }
    } else {
      lowRefreshCount--;
      if (lowRefreshCount === 0 && highRefreshCount === 0) {
        stopLowRefresh();
      }
    }
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAudioPositionConfig {
  highRefreshRate?: boolean;
}

interface AudioPosition {
  position: number;
  duration: number;
  percentComplete: number;
  seek: (position: number) => number;
}

export function useAudioPosition(
  config: UseAudioPositionConfig = {}
): AudioPosition {
  const { highRefreshRate = false } = config;

  const subscribe = useCallback(
    (callback: () => void) => subscribeStore(callback, highRefreshRate),
    [highRefreshRate]
  );

  const { position, duration } = useSyncExternalStore(subscribe, getSnapshot);

  const seek = useCallback((pos: number): number => {
    const player = getPlayer();
    if (!player) return 0;
    player.seek(pos);
    const raw = player.seek();
    const updatedPos = typeof raw === "number" ? raw : pos;
    const dur = player.duration() || snapshot.duration;
    snapshot = { position: updatedPos, duration: dur };
    emitChange();
    return updatedPos;
  }, []);

  const percentComplete = useMemo(
    () => (duration > 0 ? (position / duration) * 100 : 0),
    [position, duration]
  );

  return { position, duration, percentComplete, seek };
}
