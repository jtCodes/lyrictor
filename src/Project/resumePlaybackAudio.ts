import { Howler, Howl } from "howler";
import { isSafariBrowser } from "../utils";

const RESUME_TIMEOUT_MS = 2500;
const players = new Set<() => Howl | undefined>();
const parkedContexts = new WeakSet<AudioContext>();
const pendingResumes = new WeakMap<AudioContext, Promise<boolean>>();

function audioSnapshot(context: AudioContext) {
  return {
    state: context.state,
    currentTime: context.currentTime,
    sampleRate: context.sampleRate,
    volume: Howler.volume(),
    masterGain: Howler.masterGain?.gain.value,
    visibility: document.visibilityState,
    players: [...players].map(getPlayer => {
      const player = getPlayer();
      return player ? { playing: player.playing(), volume: player.volume(), muted: player.mute() } : undefined;
    }),
  };
}

function parkPausedAudio() {
  const context = Howler.ctx;
  if (!Howler.usingWebAudio || !context || context.state === "closed") return;
  const currentPlayers = [...players].map(getPlayer => getPlayer()).filter(Boolean);
  if (!currentPlayers.length || currentPlayers.some(player => player!.playing())) return;
  if (parkedContexts.has(context)) return;
  parkedContexts.add(context);
  // Do not trust "running" after Safari backgrounds a paused context. Explicitly
  // release it while hidden, without touching sound position, gain, or routing.
  try {
    void context.suspend().catch(error => {
      console.warn("Could not suspend paused Safari audio", audioSnapshot(context), error);
    });
  } catch (error) {
    console.warn("Could not suspend paused Safari audio", audioSnapshot(context), error);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") parkPausedAudio();
}

/** One lifecycle listener shared by all consumers of the playback hook. */
export function registerPlaybackAudio(getPlayer: () => Howl | undefined) {
  if (!isSafariBrowser) return () => {};
  players.add(getPlayer);
  if (players.size === 1) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", parkPausedAudio);
  }
  return () => {
    players.delete(getPlayer);
    if (!players.size) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", parkPausedAudio);
    }
  };
}

/** Call before asynchronous visual preparation, while the Play click is active. */
export function resumePlaybackAudio(): Promise<boolean> | undefined {
  if (!isSafariBrowser) return;
  const context = Howler.ctx;
  if (!Howler.usingWebAudio || !context) return;
  const pending = pendingResumes.get(context);
  if (pending) return pending;
  const wasParked = parkedContexts.has(context);
  if (context.state === "running" && !wasParked) return;

  const before = audioSnapshot(context);
  let finish!: (ready: boolean, error?: unknown) => void;
  const result = new Promise<boolean>(resolve => {
    let finished = false;
    const timer = window.setTimeout(() => finish(false, "Audio resume timed out"), RESUME_TIMEOUT_MS);
    finish = (ready, error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      pendingResumes.delete(context);
      if (ready) {
        parkedContexts.delete(context);
        if (wasParked) console.info("Safari audio resumed after backgrounding", { before, after: audioSnapshot(context) });
      } else {
        console.warn("Audio context could not resume", { before, after: audioSnapshot(context), error });
      }
      resolve(ready);
    };
  });
  pendingResumes.set(context, result);
  try {
    // Invoke immediately, even if suspension is still pending. Native context
    // operations retain their order; awaiting suspension would lose the gesture.
    void context.resume().then(() => {
      finish(context === Howler.ctx && context.state === "running");
    }, error => finish(false, error));
  } catch (error) {
    finish(false, error);
  }
  return result;
}
