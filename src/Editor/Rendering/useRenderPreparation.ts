import { RefObject, useLayoutEffect, useMemo } from "react";
import { usePlaybackPreparation } from "../../Project/PlaybackPreparationProvider";
import { PreparedRenderer, registerRenderPreparation } from "./renderPreparation";

export function useScenePreparation(contentRevision: unknown, width: number, height: number, enabled: boolean) {
  const revision = useMemo(() => enabled ? {} : undefined, [contentRevision, width, height, enabled]);
  const preparation = usePlaybackPreparation();
  useLayoutEffect(() => {
    if (!preparation || !revision) return;
    // Block Play before a separately committed Konva root registers its refs.
    return preparation.register({
      priority: () => Infinity,
      run: () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
    });
  }, [preparation, revision]);
  return revision;
}

export function useRenderPreparation<T>(ref: RefObject<T | null>, renderer: PreparedRenderer<T>, revision?: object) {
  const preparation = usePlaybackPreparation();
  useLayoutEffect(() => {
    const target = ref.current;
    if (!target) return;
    if (!preparation || !revision) return () => renderer.release(target);
    return registerRenderPreparation(preparation, renderer, target);
  }, [preparation, ref, renderer, revision]);
}
