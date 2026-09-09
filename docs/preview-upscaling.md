# Preview upscaling trial

The editor menu's **720p preview upscaling: On/Off** and User Settings →
**Preview quality** control the same device preference. The trial defaults on.
Turn it off to compare native quality. Playback diagnostics reports actual
upscaled layer dimensions, or that the path is inactive.

## Research and choice

- [AMD FSR 1](https://gpuopen.com/fidelityfx-superresolution/) uses spatial
  edge-adaptive upsampling (EASU), followed by contrast-adaptive sharpening
  (RCAS). It accepts color frames without motion vectors or temporal history.
- [Hajime-san/web-fsr](https://github.com/Hajime-san/web-fsr) provides a WebGL
  port and browser video examples. Its MIT-licensed GLSL is vendored in
  `src/Editor/Rendering/upscale`, with the original notices and AMD's license.
- [pmndrs/upscaler](https://github.com/pmndrs/upscaler) provides spatial and
  temporal WebGPU paths integrated with Three.js. Its temporal path expects
  depth, motion, and jitter inputs our Canvas2D/Konva scene does not produce.

This trial uses the WebGL spatial port. It is not NVIDIA DLSS, AI reconstruction,
frame generation, or a whole-song cache. No Three.js dependency is introduced.
The port uses scalar texture samples instead of the reference's texture gathers.
Local adaptations reconstruct premultiplied RGBA for transparent canvas layers,
correct the EASU pixel-center coordinate, guard flat-color divisions, and include
the full neighbor ring and center in RCAS's limiter. RCAS sharpening uses 0.25 attenuation stops to retain stronger edge contrast.

## Rendering and lifetime

`PreviewSceneLayer` caps scene backing stores at 1280×720 (720×1280 in portrait)
and never increases a smaller native backing store. Logical coordinates and hit
canvases stay unchanged. The output is sized to the existing native preview
backing resolution, including device pixel ratio. Particles, lights, visualizers, grain, and ambient scene canvases share this
adapter. Text, grid, and selection layers always stay native: reducing lyric text
to 720p discarded fine letter detail that spatial sharpening could not restore.
Text blur still uses the existing adaptive blur renderer and preparation cache.
Images and DOM/CSS effects retain their existing path.

The shared WebGL 2 backend performs EASU and RCAS only after a Konva scene draw,
then presents a transparent output beside that layer's source canvas. There is
no extra animation clock or frame queue. Resizes update input/output allocations;
unmounting, disabling, and native-sized previews release output resources.
Shader failure, context loss, unsupported WebGL, texture limits, and resource
budget exhaustion restore native rendering. A failed layer does not retry every
frame. Toggle the preference to retry deliberately.

The existing blur preparation/cache pipeline continues to operate on the reduced
scene buffers. It retains its 64 MiB local cap and now shares a 256 MiB tracked
resource ceiling with upscaling textures and per-layer output surfaces. This is
not a cap on all browser memory. Video export temporarily disables preview
upscaling and excludes presentation canvases from its source queries.

## Limits and validation

Upscaling cannot recover all detail absent from 720p. Thin type, small text,
transparent edges, and heavy grain need visual comparison. CSS backdrop filters
still run at their DOM display size; this change does not eliminate that cost.
Large output windows still incur full-resolution upscale and presentation work,
so the performance benefit must be measured on the target project and GPU.

Run `node scripts/tests/preview-upscaling.cjs` for sizing, budget, lifecycle,
resize, cleanup, and fallback checks. Existing blur and preparation tests cover
compatibility. With Vite running, `/scripts/tests/upscale-rendering.html` exercises
shader compilation, orientation, alpha, flat colors, and resizing on the browser
GPU and provides a text/blur comparison. Browser/GPU checks must be run separately
from TypeScript and production builds; neither establishes visual quality or FPS.
