# Design & UX Preferences (Lyrictor)

## Core Principles
- **Seamless blending over hard boundaries** — Never show sharp container edges, visible borders, or hard cutoffs between UI sections and the background.
- **Transparency-based masking** — Use CSS `mask-image` / `WebkitMaskImage` gradients to fade content into the background rather than overlaying colored gradients (which require color-matching against dynamic backgrounds).
- **Scroll containers should fade at edges** — Apply mask-image on a fixed wrapper *around* the scroll container (not inside it) so items gradually become transparent as they approach the viewport edges.
- **No visible UI chrome** — Avoid anything that creates a "panel" or "box" feel: no `rounded-lg` on scroll wrappers, no visible overflow boundaries, no opaque overlays.
- **Dynamic background awareness** — Since the immersive background is a blurred live preview with dynamic colors, effects must be color-agnostic (masks, not colored overlays).
- **Subtle & invisible > decorative** — Polish should be felt, not seen. If a user notices an effect as an "effect", it's too heavy.

## Techniques That Work
- `mask-image: linear-gradient(...)` on containers for edge fading
- `box-shadow: inset ...` for soft border effects (instead of real CSS `border`)
- Gradual multi-stop gradients (4+ stops) for smooth transitions

## Techniques That Don't Work / Were Rejected
- Colored gradient overlays on top of content (can't match dynamic background)
- `backdrop-filter: blur()` on pseudo-elements (creates visible dark bars)
- Per-item opacity/blur based on scroll position (looks muddy, expensive)
- `rounded-lg` or `overflow: hidden` on list wrappers (creates visible container edge)
