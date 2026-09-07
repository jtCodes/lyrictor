import type { PreparationTask } from "../../Project/playbackPreparation";

/** The preparation scheduler knows only this contract, never the element type. */
export interface PreparedRenderer<T> {
  estimate: (target: T) => number;
  prepare: (target: T, signal: AbortSignal) => Promise<void>;
  release: (target: T) => void;
}

export function registerRenderPreparation<T>(
  queue: { register: (task: PreparationTask) => () => void },
  renderer: PreparedRenderer<T>,
  target: T
) {
  renderer.release(target);
  const unregister = queue.register({
    priority: () => renderer.estimate(target),
    run: signal => renderer.prepare(target, signal),
  });
  return () => { unregister(); renderer.release(target); };
}

export interface PreparationPolicy<Item, Scene> {
  needsPreparation: (item: Item, scene: Scene) => boolean;
}

/** Feature adapters declare candidates; mounting/retention uses a common plan. */
export function collectPreparationCandidates<Item extends { id: number }, Scene>(
  items: readonly Item[], scene: Scene, policies: readonly PreparationPolicy<Item, Scene>[]
) {
  return new Set(items.filter(item => policies.some(policy => policy.needsPreparation(item, scene))).map(item => item.id));
}
