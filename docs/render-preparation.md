# Shared render preparation

Prepare expensive reusable rendering work before playback without making users
manage render settings. This is a general render-preparation system. Blur is its
first implementation; future work may prepare geometry, masks, decoded assets,
effect data, or composite layers as well as pixels.

## Ownership

| Layer | Owns |
| --- | --- |
| `Project/playbackPreparation.ts` | Priority queue, progress, cancellation, and waiting before audio starts. It knows no element types. |
| `Editor/Rendering/renderPreparation.ts` | Renderer contract, registration/cleanup, and candidate collection across feature policies. |
| `Editor/Rendering/useRenderPreparation.ts` | Scene revision, Konva commit barrier, and component lifecycle. |
| `Editor/Rendering/blur/createBlurRenderer.ts` | Blur rasterization, viewport cropping, sampling, worker preparation, and compositing. |
| `Editor/Rendering/blur/blurCache.ts` | The blur implementations' shared memory budget, reuse checks, retention, eviction, and worker ownership. Cache owners are arbitrary objects. |
| Feature adapter | What to prepare, required assets, result validity, resource disposal, and which timeline states are worth preparing. |

## Adding preparation beyond blur

Implement `PreparedRenderer<T>` with `estimate`, `prepare(target, signal)`, and
`release`. `T` can be a render node or another resource owner. Use the same
registration hook, scene revision, progress, cancellation, and playback gate.
The core contract requires no blur radius, canvas, Konva node, font, or bitmap.
Selection policies may use their own capabilities; native blur support must not
disable unrelated preparation.

An adapter defines how its prepared result is consumed during normal rendering
and which input changes invalidate it. Treat `estimate` as a relative work
priority, and use a comparable scale when scheduling different implementations.
Keep operation-specific execution in the adapter; introduce shared execution
backends when concrete implementations need them.

The current 64 MiB accounting covers blur images only. Before retaining other
substantial resources, extend shared resource accounting to cover them; do not
give every effect an independent unbounded cache. This document describes an
extension boundary, not implemented preparation for those future effects.

## Adding a blurred renderer

Create the renderer once at module scope. Ordinary Konva shapes whose pixels are
fully described by serializable node attributes can use `cacheKey: "attributes"`:

```ts
const rectangleBlur = createBlurRenderer<KonvaRect>({
  cacheKey: "attributes",
  draw: (node, context) => KonvaRect.prototype._sceneFunc.call(node, context),
});
```

In the element's component, call
`useRenderPreparation(nodeRef, rectangleBlur, preparationVersion)` and use
`rectangleBlur.draw` as its blurred `sceneFunc`. The node's `blurRadius` is in
local coordinates. The factory handles the screen-space conversion.

Use `ready(node, signal)` to load fonts or decode assets before rasterization.
Use `overhang(node)` when ink extends beyond the node's layout bounds.

For external images, video, canvas content, or custom drawing with state outside
node attributes, supply a `cacheKey(node)` function. Its string must identify
**all pixel-affecting inputs**, including the asset revision and drawing style.
Return `undefined` for a state that cannot safely be cached. The default attribute
path rejects non-serializable assets instead of guessing their identity.

Each factory has its own cache namespace. Two different rendering algorithms
cannot accidentally reuse each other's pixels on the same node.

## Timeline participation

Register one `PreparationPolicy` per renderer in `Editor/previewPreparation.ts`.
The policy declares candidate items and can use the scene's capabilities. The
generic collector and scheduler do not need a new branch for each effect.

The scene must mount each selected candidate at its intended preparation pose,
keep it hidden outside its cue, and retain the node until the scene revision
changes or unmounts. Use the shared candidate IDs and revision for this. A
renderer mounted only at cue time cannot be prepared before playback.

Text's drawing/font adapter is `Lyrics/LyricPreview/drawBlurredText.ts`; its
selection policy is `textBlurPreparation.ts`. Text currently samples the cue's
initial pose. This refactor does not add temporal sampling or cache every frame.
Changing focus, animated gradients, shadows, and other incompatible states still
use the live renderer. The cache retains the existing 64 MiB budget and size
eligibility limits; preparation does not promise to cache an entire project.

## Rules for extensions

- Reuse the factory and hook for canvas blur. Do not copy a worker queue, cache
  budget, polling loop, lifecycle cleanup, or playback guard into a new element.
- Other expensive render operations can implement `PreparedRenderer<T>` and use
  the same registration hook and playback gate without depending on Konva blur.
- Scope invalidation to project/viewport changes and asset revisions. Live frame
  updates must not restart preparation; never draw stale cached pixels.
- Cancellation must release work, and late results must not resurrect a removed
  element. Preparation failures retain the live-rendering fallback.
- Add coverage for the adapter's pixel identity and bounds. Shared tests already
  cover text and non-text blur, worker pixel parity, lifecycle, memory retention,
  cancellation, and playback gating. Browser timing still needs browser testing.
