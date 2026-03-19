# Lyrictor

Lyrictor is a browser-based lyric video editor with a magnetic-style timeline, beat-reactive visuals, and built-in AI image generation.

Make lyric videos that look intentional, dynamic, and production-ready without leaving the browser.

<img width="1749" height="1197" alt="Screenshot 2026-03-17 at 2 09 51 PM" src="https://github.com/user-attachments/assets/deca1207-ddf3-4a50-9f10-bda3ae7d5a26" />
<img width="1633" height="1197" alt="Screenshot 2026-03-17 at 10 12 56 PM" src="https://github.com/user-attachments/assets/0fda8e90-01d0-4d58-96b2-20aed8fdca95" />
<img width="1650" height="1178" alt="Screenshot 2026-03-19 at 3 46 36 PM" src="https://github.com/user-attachments/assets/bbf8afa2-9cc3-4a7d-986c-243a1ac6cd4c" />
<img width="1650" height="1178" alt="Screenshot 2026-03-19 at 3 48 39 PM" src="https://github.com/user-attachments/assets/c7c1d536-c46b-4d90-af3c-02dcfbd4620f" />

## Why Lyrictor

- Timeline-first workflow inspired by professional NLEs
- Native lyric syncing and layered timeline items (text, images, visualizer blocks)
- AI image generation directly in the editor
- Two creative modes: free layout and Apple Music-style vertical sync mode
- Browser export pipeline for ready-to-share video output

## Standout Features

### AI Image Generation (Built In)

- Generate backgrounds and scene images from prompts without leaving your project
- OpenRouter image model support (including Gemini and GPT image models)
- Optional local Stable Diffusion support
- Prompt history and generated image log for fast iteration and reuse
- Prompt suggestion flow for faster creative ideation

### Pro-Style Timeline Editing

- Interactive waveform timeline with zoom, pan, and precise placement
- Layered timeline levels for overlapping visual moments
- Collision-aware lane behavior for cleaner sequencing
- Multi-select editing and timeline-driven text/image/visualizer management

### Two Editing Modes

- Free mode: move and style lyric text anywhere on canvas
- Static sync mode: Apple Music-style vertical scrolling lyric presentation

### Beat-Reactive Visualizer

- Audio-reactive visualizer blocks on the same timeline as lyrics
- Real-time intensity changes driven by audio analysis

### Export and Publishing

- In-browser video export pipeline (landscape and portrait workflows)
- Project save/load and publish flow for discoverable public projects

## Demo

Stephen Sanchez - Until I Found You

[![Demo video](https://img.youtube.com/vi/To29kD8vPoI/0.jpg)](https://www.youtube.com/watch?v=To29kD8vPoI)

Lyrictor + AI (Preview)

[![AI demo video](https://img.youtube.com/vi/6oVsjVHntP8/0.jpg)](https://www.youtube.com/watch?v=6oVsjVHntP8)

## Tech Stack

- React + TypeScript
- React Spectrum
- Zustand
- Konva
- waveform-data
- react-use-audio-player + Howler
- Firebase (auth + data)

## Local Development

```bash
yarn
yarn dev
```

Build for production:

```bash
yarn build
```

## Roadmap

- More text animation presets and transitions
- Richer timeline tooling and editing ergonomics
- Expanded sharing and discovery workflows
