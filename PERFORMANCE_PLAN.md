# React Rendering Performance Plan

## Goal

Reduce avoidable React render passes without removing effects that correctly synchronize with audio, browser APIs, Firebase, observers, or animation lifecycles.

We will change and verify one item at a time. Each completed item pauses for review before the next item begins.

## Validation for every item

- Preserve existing behavior.
- Run `yarn check-types`.
- Run `git diff --check`.
- Exercise the affected interaction manually.
- Compare render commits with React Profiler when the change affects a hot path.

## Work items

### 1. Derive the playback seeker position

Status: Complete

File: `src/Project/ProjectPlaybackControlsOverlay.tsx`

Problem: `useAudioPosition` renders the component with a new playback position, then an effect copies that value into local state and triggers another render.

Change: Derive the normal seeker position during render. Keep local state only for the temporary value used while the user is seeking.

Expected result: Remove one cascading render from each playback-position update in the featured and published project players.

Validation:

- `yarn check-types`: passed
- `git diff --check`: passed
- Manual playback and seek interaction: approved

### 2. Derive the time-synced lyric scroll offset

Status: Complete

File: `src/Editor/Lyrics/LyricPreview/LinearTimeSyncedLyricPreview.tsx`

Problem: `currentScrollHeight` is copied from `scrollAnchorIndex` and `cumulativeHeights` through an effect.

Change: Calculate the offset during render and remove the duplicated state and effect.

Expected result: Remove the follow-up render when the active lyric scroll anchor changes.

Validation:

- `yarn check-types`: passed
- `git diff --check`: passed
- Manual time-synced lyric playback: approved

### 3. Store timeline pointer-down state in a ref

Status: Skipped after code review

File: `src/Editor/AudioTimeline/AudioTimeline.tsx`

Problem: `isTimelineMouseDown` is only read by pointer handlers, but it is stored in React state and rerenders the timeline when a selection drag starts or ends.

Change: Replace the state with a ref used by the pointer handlers.

Expected result: Avoid full timeline renders caused only by transient pointer bookkeeping.

Review: The same pointer handlers also set or clear `multiSelectDragStartCoord` and `multiSelectDragEndCoord`. Those state updates already require a render, and React batches them with the `isTimelineMouseDown` update. Moving only the boolean to a ref would therefore not reduce render commits.

Decision: Leave the current state unchanged. Revisit only as part of a broader drag-selection state refactor supported by profiler evidence.

### 4. Store resize-start dimensions in refs

Status: Implemented — awaiting manual review

File: `src/Editor/LyricEditor.tsx`

Problem: Three resize-start values are only used by resize event handlers, but updating them rerenders the editor.

Change: Store the left panel, right panel, and timeline resize origins in refs.

Expected result: Avoid an editor render at the start of each resize gesture.

Validation:

- `yarn check-types`: passed
- `git diff --check`: passed
- Manual panel and timeline resizing: awaiting review

### 5. Refactor timeline item geometry synchronization

Status: Pending

File: `src/Editor/AudioTimeline/TextBox.tsx`

Problem: Multiple effects mirror lyric timing and geometry into local state for every mounted timeline item. Relevant prop changes therefore render each item once with stale geometry and again after the effects update state.

Change: Separate geometry derived from props from temporary drag geometry. Preserve the existing multi-drag, resize, collision, and preview behavior.

Expected result: Potentially the largest editor improvement, especially with projects containing many timeline items.

Risk: Higher than the earlier items. Profile first and test all timeline interactions after the refactor.

### 6. Evaluate animation-frame rendering

Status: Pending evaluation

Files:

- `src/Editor/Visualizer/AudioVisualizer.tsx`
- `src/Editor/Particles/Particles.tsx`
- `src/Editor/Light/LightPreviewSurface.tsx`
- `src/Editor/Grain/GrainPreviewSurface.tsx`

Problem: These effects correctly manage animation lifecycles, but their animation callbacks update React state as often as 30–60 times per second.

Change: Only proceed if profiling shows meaningful cost. Possible approaches include reducing update frequency or updating Konva nodes without rerendering the full React component tree.

Expected result: Smoother previews on complex scenes or slower hardware.

Risk: High. This is an architectural optimization, not a routine effect removal.

## Out of scope

Effects that subscribe to Firebase or browser events, manage observers and cleanup, load external data, generate waveforms, preload assets, or control animation lifecycles remain effects unless profiling identifies a specific problem.
