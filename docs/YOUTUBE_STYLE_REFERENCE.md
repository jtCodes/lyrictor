# YouTube Style Reference

## Reference

- Video: https://www.youtube.com/shorts/7FalY-hzkDU
- Title: Bleach | 4K anime edit | - Hikari | Ichigo | Rukia | Byakuya | Shinji | Clovis Reyes VDYCD
- Author: neyller_

## Note On Analysis

The Shorts page could not be fully played from the current tool environment because YouTube redirected the page fetch through Google sign-in. These notes are based on the public metadata, thumbnail, and the established visual language common to high-impact anime edit shorts.

## Style Characteristics To Target

- Center-weighted character framing with strong subject isolation.
- Cool, high-contrast grading with bloom and soft atmospheric glow.
- Beat-synced impact motion: punch-ins, micro-pans, and abrupt shake.
- Aggressive transitions: flashes, smears, echo frames, and directional cuts.
- Whole-frame post-processing rather than text-only effects.
- Short-lived duplicated layers or offset color channels to create energy during hits.

## What Lyrictor Already Has Nearby

- Timed text blur.
- RGB glitch for lyric text.
- Ash fade particle-style text effect.
- Beat-reactive visualizer and vignette-style radial behavior.

These are useful building blocks, but they mostly operate at the lyric or overlay layer. This reference style depends more on scene-level motion and post-processing.

## Recommended Additions

### 1. Camera Transform Track

Add a scene or clip-level camera track with keyframes for:

- Scale
- Position
- Rotation
- Shake intensity

Why this matters:

Most anime edit energy comes from camera language rather than from text effects. Fast punch-ins, handheld-style shake, slight angle offsets, and short motion bursts do more for this look than adding another lyric effect.

### 2. Global Post-Effects Stack

Add a reusable post-processing layer for media or the full scene:

- Bloom
- Chromatic aberration
- Directional motion blur
- Sharpen
- Film grain
- Vignette

Why this matters:

The target look is driven by frame-wide treatment. Lyrictor already has local blur and glitch behavior, but this style needs those ideas applied to the full composition.

### 3. Impact Transition Primitives

Add a small set of reusable transition blocks:

- White flash
- Frame smear
- Frame hold
- Echo frame
- Directional wipe or slice

Why this matters:

Anime shorts usually recycle a tight transition vocabulary on beat. A few strong primitives will cover a large amount of the style surface.

### 4. Beat-Synced Automation Lanes

Generalize beat-reactive behavior so multiple properties can be driven by music:

- Zoom amount
- Bloom strength
- Blur amount
- Shake amplitude
- Flash opacity

Why this matters:

The visualizer already proves the app has some audio-reactive thinking. Extending that concept into a general automation system would make this kind of edit much easier to build.

### 5. Layer Duplication And Ghost Trails

Add short-lived duplicate-frame and additive-blend styling options:

- Offset duplicate layer
- Tintable duplicate layer
- Ghost trail decay
- Additive or screen blend modes

Why this matters:

This is a common AMV and Shorts trick for adding impact without needing fully custom compositing per shot.

## Highest-Value MVP Pack

If only a small set should be built first, prioritize this order:

1. Camera keyframes
2. Impact shake
3. Scene bloom
4. Chromatic aberration
5. Flash transition

This set will move Lyrictor much closer to the reference look faster than expanding the lyric text effect library.

## Product Direction Summary

The main gap is not more lyric decoration. The main gap is composition control over the full frame.

If Lyrictor can control camera motion, whole-scene post-processing, and beat-synced impact transitions, it will be able to reproduce a large share of this anime-edit language while keeping the current lyric-focused tooling as a differentiator.