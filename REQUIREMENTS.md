# Lyrictor — Application Requirements

> **⚠️ WIP — This document is a work in progress.** It was generated from a codebase analysis and may not accurately reflect intended behavior or final requirements. Always confirm with the project owner before referencing or using this as a source of truth.

## Overview

Lyrictor is a web-based editor for creating lyric animations for music. Users sync lyrics to audio tracks and apply visual effects, customizations, and animations. The app supports real-time preview, multiple editing modes, AI-generated backgrounds, image imports, audio visualizers, and video export.

---

## Homepage

### Featured Project Preview
- Display a featured project loaded from Firebase (`featured.json`)
- Real-time lyric preview with playback controls overlay (play/pause, seek slider, time display)
- Fullscreen viewing mode — preserves audio session across fullscreen toggle
- Auto-hide playback controls after 2.5s of inactivity (mouse idle)
- Loading state with progress indicator

### Project List
- Grid of existing user project cards
- Click a project card to load it into the featured preview with autoplay
- Display project name, album art thumbnail, and author

### Immersive Background
- Blurred live preview of the current lyric animation behind the homepage layout
- Color-agnostic — uses CSS `mask-image` gradients (not colored overlays)
- Fades smoothly into the page background

### Navigation
- "Create" button navigates to `/edit` with a blank project
- Project cards load data into state and preview on the homepage

---

## Project Management

### Project Data Model
- **id**: unique identifier
- **projectDetail**: name, audio file name/URL, local vs remote, resolution, album art, editing mode
- **lyricTexts**: array of timed lyric text objects
- **lyricReference**: full lyrics (Draft.js JSON)
- **generatedImageLog**: AI-generated image history
- **promptLog**: AI prompt history
- **images**: imported image items

### Creation
- Two audio source modes: local file upload (drag-and-drop) or stream URL
- Project name input
- Two editing modes:
  - **Custom (free)**: free-form lyric placement on canvas
  - **Vertical Scrolled (static)**: Apple Music-style linear scrolling lyrics
- Aspect ratio selection: 16:9 (landscape) or 9:16 (portrait)

### Save / Load
- Save persists project to Firebase
- Demo projects cannot be saved
- Load from project list popup in the editor
- Loads all data: lyric texts, lyric reference, images, project settings

### Delete
- Delete existing projects from the project list

---

## Audio

### Upload & Playback
- MP3 format support
- Local file upload or remote stream URL
- Howler.js via `react-use-audio-player`
- Global `Howler.stop()` on audio source change to prevent double audio
- Separate `AudioPlayerProvider` per route (`/` and `/edit`)

### Audio Timeline
- Interactive Konva.js canvas with waveform visualization
- Waveform line plot from audio data fetched via HTTP
- Horizontal scroll to pan, keyboard zoom (`+` / `-`)
- ~90px waveform graph height
- Cursor position syncs with audio playback position

### Playback Controls
- Play/pause toggle (Space key or button)
- Current time / total duration display
- Seek via slider or timeline click
- Auto-pause when popups open
- Auto-stop when switching projects

---

## Lyric Editing

### Text Box Model
- Unique ID, start/end time (seconds)
- Text content
- Normalized X/Y position (0–1) on preview canvas
- Optional custom width/height
- Font: name, size, weight, color
- Shadow: blur, color
- Timeline level for layered overlap handling
- Flags for image or visualizer mode

### Creating Lyrics
- "Add Lyric Text" button at current playhead position
- Create from selected text in lyric reference view
- Auto-assigns unique ID and appropriate timeline level
- Default position: center (0.5, 0.5)

### Lyric Reference View
- Draft.js rich text editor for full lyrics
- Button to add selected text to timeline
- Stored as JSON, unsaved changes tracked separately

### Text Customization
- Font size (default: 20px)
- Font weight (default: 400)
- Font name (default: Inter Variable)
- Font color (default: white)
- Shadow blur (default: 0)
- Shadow color

### Available Fonts
Big Shoulders Inline Display, Caveat, Comfortaa, Dancing Script, Darker Grotesque, Edu NSW ACT Foundation, Inter (default), Merienda, Montserrat, Open Sans, Red Hat Display, Roboto Mono, Roboto

---

## Lyric Preview

### Real-Time Display
- Konva.js Stage rendering
- Responsive scaling to container dimensions
- Shows currently active lyrics based on audio position
- Auto-hides inactive lyrics outside time range

### Free Mode
- Text boxes freely positioned and sized on canvas
- Drag to reposition, resize handles on corners
- Position stored as normalized coordinates
- Album art displayed as background image layer

### Static / Vertical Mode (Apple Music Style)
- Lyrics centered vertically, scroll as playhead advances
- Current lyric: white, 100% opacity
- Previous/upcoming lyrics: 35% opacity
- Font scale: `Math.min(width, height) * 0.067`
- Smooth scroll transition: 0.75s

### Editing in Preview
- Click to select a lyric text
- Drag to move, resize via corner handles
- Escape key to confirm edits
- Selecting opens the customization panel
- Visual alignment guide during editing

---

## Images

### Import
- File upload via Filepond
- Stored as ImageItem objects with unique IDs
- Thumbnail grid in images manager
- Delete or add to timeline at current playhead position

### Images on Timeline
- Added as a lyric text entry with `isImage=true`
- Timeline level controls z-ordering
- Rendered as background layer in preview
- Highest z-index image wins for a given time range

### AI Image Generation
- Local Stable Diffusion integration (`http://127.0.0.1:7860`)
- POST to `/run/predict/` endpoint
- Checks if local AI service is running before allowing generation
- Parameters: prompt, negative prompt, seed, dimensions, sampler, cfg scale, steps
- Prompt and generated image history with log views

---

## Audio Visualizer

### Visualizer Element
- Added to timeline like a lyric text with `isVisualizer=true`
- Radial gradient rendered as Konva Rect
- Beat-synced intensity via Web Audio API AnalyserNode

### Customization
- Gradient start/end points and radii
- Color stops with beat sync intensity
- Frequency bin analysis (first 10 bins)
- Real-time animation frame updates during playback
- Static intensity (0.65) when paused

---

## Video Export

### Output
- Canvas-based compositing of video + audio
- MediaRecorder API
- Resolution: 1920×1080 (16:9) or 1080×1920 (9:16)
- Framerate: 30 FPS, bitrate: 5 Mbps
- Container: WebM (VP9+Opus preferred, VP8 fallback)
- Downloads as .mp4 with project name

### Free Mode Export Pipeline
1. Black base
2. Album art image (center-cropped, if present)
3. Dark overlay (35% opacity)
4. Konva canvas layers (visualizer + text)

### Static Mode Export Pipeline
1. White base
2. Konva canvases rendered to temp canvas
3. Blur(80px) filter applied
4. Dark tint overlay (30% opacity)
5. DOM text rendering (word-wrapped, centered)
6. Top gradient (0–30% height, 75% opacity)
7. Bottom gradient (50–100% height, 75% opacity)

### Export UX
- Progress modal with percentage
- Cancel button
- Mutes speakers during export (audio records to destination node)

---

## Authentication

- Firebase Authentication with Google OAuth provider
- Login/logout buttons
- User state tracked in App.tsx
- **Note**: Google login currently broken (marked TODO); auth not enforced

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Delete / Backspace | Delete selected lyric texts |
| `+` | Zoom in timeline |
| `-` | Zoom out timeline |
| Cmd/Ctrl + C | Copy selected lyric texts |
| Cmd/Ctrl + V | Paste copied lyric texts |
| Cmd/Ctrl + Z | Undo lyric edits |
| Cmd/Ctrl + Shift + Z | Redo lyric edits |

All shortcuts disabled when text input, textarea, or contentEditable is focused, or when a popup is open.

---

## UI / UX

### Layout
- **Homepage**: Grid with sidebar, featured project, project list, footer
- **Editor**: Grid with header, timeline + preview content area, footer
- Resizable left/right side panels with width persisted in store

### Side Panels
- **Left (Media Content)**: Tabs for Lyrics (reference editor) and Images
- **Right (Settings)**: Tabs for Text customization and Visualizer settings

### Design System
- Adobe React Spectrum (dark theme)
- Framer Motion for animations
- Toast notifications via React Spectrum
- No visible UI chrome on scroll containers — edge fading via `mask-image`

### Platform Support
- Desktop only — mobile shows "not supported" notice
- Responsive to window resize

---

## State Management

### Project Store (Zustand)
- Current editing project, lyric texts, lyric reference
- UI popups, panel widths
- Image items
- Undo/redo history (lyric text state stack)
- Batch edit operations across multiple lyric texts
- `autoPlayRequested` flag for card-click autoplay

### Editor Store (Zustand)
- Timeline interaction state (width, scroll offsets, cursor)
- Selected lyric text IDs
- Customization panel visibility and active tab
- In-progress text editing state
- Preview container ref

---

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- React Router (client-side routing)
- Zustand (state management)
- Konva.js / react-konva (canvas rendering)
- Howler.js / react-use-audio-player (audio)
- Draft.js (rich text editing)
- Adobe React Spectrum (UI components)
- Framer Motion (animations)
- Firebase (auth, storage, database)
- FilePond (file uploads)
- WaveformData (audio waveform)
- MediaRecorder API (video export)
