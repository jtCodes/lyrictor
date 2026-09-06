// User navigation is distinct from playback ticks, loop wraps and export seeks.
// Do not replay events: a manual inspector selection survives until a new seek.
const listeners = new Set<(position: number) => void>();

export function subscribeToUserSeek(listener: (position: number) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyUserSeek(position: number) {
  listeners.forEach(listener => listener(position));
}
