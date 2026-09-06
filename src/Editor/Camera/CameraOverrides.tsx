import { useEffect, useState } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import { InspectorNumber, InspectorRange, InspectorSelect, InspectorToggle } from "../Settings/Inspector";
import CameraValuesEditor from "./CameraValuesEditor";
import { subscribeToUserSeek } from "../AudioTimeline/audioSeekEvents";
import { getCurrentAudioPosition, useAudioPositionSelector } from "../AudioTimeline/useAudioPosition";
import { LyricText } from "../types";
import { isItemRenderEnabled, isTextItem } from "../utils";
import {
  getCameraFocusCues,
  getCameraFocusTargetsById,
} from "./focusTarget";
import {
  createCameraOverride,
  getActiveCameraOverrideAtOffset,
  resolveCameraSettingsAtPosition,
} from "./overrides";
import {
  CameraOverride,
  CameraSettings,
  CameraValues,
  normalizeCameraZPosition,
  normalizeCameraValues,
  sortCameraOverridesByStartTime,
} from "./store";

const DEFAULT_TRANSITION_DURATION = 1;
const MINIMUM_TRANSITION_DURATION = 0.01;

function getInsertionOffset(position: number, cameraStart: number, duration: number) {
  return Math.max(0, Math.min(
    duration - Math.min(MINIMUM_TRANSITION_DURATION, duration),
    position - cameraStart
  ));
}

function AddAtPlayheadButton({ cameraStart, duration, onClick }: {
  cameraStart: number;
  duration: number;
  onClick: () => void;
}) {
  const { playing } = useAudioPlayer();
  const offset = useAudioPositionSelector(
    ({ position }) => getInsertionOffset(position, cameraStart, duration).toFixed(2),
    { highRefreshRate: true, active: playing }
  );

  return <button type="button" className="inspector-button inspector-add-change" disabled={duration <= 0}
    title={`Add a camera change ${offset} s from camera start. Insertion stays within the camera item.`}
    aria-label={`Add camera change at ${offset} seconds from camera start`}
    onClick={event => {
      if (event.detail > 0) event.currentTarget.blur();
      onClick();
    }}>
    <span>+ Add</span><span aria-hidden="true">·</span>
    <span className="inspector-insertion-time" style={{ width: `${Math.max(7, duration.toFixed(2).length + 2)}ch` }}>{offset} s</span>
  </button>;
}

function constrainOverride(
  cameraOverride: CameraOverride,
  itemDuration: number
) {
  const minimumDuration = Math.min(
    MINIMUM_TRANSITION_DURATION,
    itemDuration
  );
  const startOffset = Math.min(
    cameraOverride.startOffset,
    Math.max(0, itemDuration - minimumDuration)
  );

  return {
    ...cameraOverride,
    startOffset,
    endOffset: Math.min(
      itemDuration,
      Math.max(startOffset + minimumDuration, cameraOverride.endOffset)
    ),
  };
}

function getCoveredFocusTargets(
  cameraOverride: CameraOverride,
  camera: LyricText,
  lyricTexts: LyricText[]
) {
  const absoluteStart = camera.start + cameraOverride.startOffset;
  const absoluteEnd = camera.start + cameraOverride.endOffset;

  return lyricTexts
    .filter(
      (lyricText) =>
        lyricText.id !== camera.id &&
        isTextItem(lyricText) &&
        isItemRenderEnabled(lyricText) &&
        lyricText.text.trim().length > 0 &&
        lyricText.start <= absoluteEnd &&
        lyricText.end >= absoluteStart
    )
    .sort((left, right) => left.start - right.start || left.id - right.id);
}

export default function CameraOverrides({
  camera,
  lyricTexts,
  settings,
  onChange,
  onPreviewChange,
  onPreviewChangeEnd,
  activity,
  onBasePreviewChange,
}: {
  camera: LyricText;
  lyricTexts: LyricText[];
  settings: CameraSettings;
  onChange: (overrides: CameraOverride[]) => void;
  onPreviewChange: (overrides: CameraOverride[]) => void;
  onPreviewChangeEnd: () => void;
  activity: string;
  onBasePreviewChange: (patch: Partial<CameraValues>) => void;
}) {
  const itemDuration = Math.max(0, camera.end - camera.start);
  const [editingOverrideId, setEditingOverrideId] = useState<string | undefined>(() => {
    const position = getCurrentAudioPosition();
    return position >= camera.start && position <= camera.end
      ? getActiveCameraOverrideAtOffset(settings.overrides, position - camera.start)?.id
      : undefined;
  });
  const [endpoint, setEndpoint] = useState<"from" | "to">("to");

  useEffect(() => subscribeToUserSeek(position => {
    if (position < camera.start || position > camera.end) return;
    onPreviewChangeEnd();
    setEditingOverrideId(getActiveCameraOverrideAtOffset(settings.overrides, position - camera.start)?.id);
    setEndpoint("to");
  }), [camera.start, camera.end, settings.overrides, onPreviewChangeEnd]);

  function getUpdatedOverrides(
    id: string,
    patch: Partial<CameraOverride>
  ) {
    return settings.overrides.map((cameraOverride) => {
      if (cameraOverride.id !== id) {
        return cameraOverride;
      }

      const nextOverride = constrainOverride(
        { ...cameraOverride, ...patch },
        itemDuration
      );
      const focusTargetIsCovered = nextOverride.focusTargetId !== undefined
        ? getCoveredFocusTargets(
            nextOverride,
            camera,
            lyricTexts
          ).some(
            (lyricText) => lyricText.id === nextOverride.focusTargetId
          )
        : true;

      return focusTargetIsCovered
        ? nextOverride
        : { ...nextOverride, focusTargetId: undefined };
    });
  }

  function updateOverride(id: string, patch: Partial<CameraOverride>) {
    onChange(getUpdatedOverrides(id, patch));
  }

  function previewOverride(id: string, patch: Partial<CameraOverride>) {
    onPreviewChange(getUpdatedOverrides(id, patch));
  }

  function addOverride() {
    if (itemDuration <= 0) {
      return;
    }

    const currentPosition = getCurrentAudioPosition();
    const startOffset = getInsertionOffset(currentPosition, camera.start, itemDuration);
    const endOffset = Math.min(
      itemDuration,
      startOffset + DEFAULT_TRANSITION_DURATION
    );
    const snapshotPosition = camera.start + startOffset;
    const resolvedSettings = resolveCameraSettingsAtPosition(
      settings,
      getCameraFocusCues(lyricTexts),
      getCameraFocusTargetsById(lyricTexts),
      camera.start,
      snapshotPosition
    );
    const nextOverride = createCameraOverride(
      resolvedSettings,
      startOffset,
      endOffset
    );
    const existingIndex = settings.overrides.findIndex(
      (cameraOverride) =>
        Math.abs(cameraOverride.startOffset - startOffset) < 0.01
    );
    const nextOverrides = [...settings.overrides];

    if (existingIndex >= 0) {
      nextOverrides[existingIndex] = {
        ...nextOverride,
        id: nextOverrides[existingIndex].id,
        endOffset: nextOverrides[existingIndex].endOffset,
        focusTargetId: nextOverrides[existingIndex].focusTargetId,
        preOverride: nextOverrides[existingIndex].preOverride,
      };
    } else {
      nextOverrides.push(nextOverride);
    }

    const addedOverrideId =
      existingIndex >= 0
        ? nextOverrides[existingIndex].id
        : nextOverride.id;

    onChange(nextOverrides);
    setEditingOverrideId(addedOverrideId);
  }

  function addPreOverride(id: string) {
    const cameraOverride = settings.overrides.find(
      (override) => override.id === id
    );

    if (!cameraOverride) {
      return;
    }

    const positionImmediatelyBeforeStart = Math.max(
      camera.start,
      camera.start + cameraOverride.startOffset - 0.001
    );
    const resolvedSettings = resolveCameraSettingsAtPosition(
      settings,
      getCameraFocusCues(lyricTexts),
      getCameraFocusTargetsById(lyricTexts),
      camera.start,
      positionImmediatelyBeforeStart
    );

    updateOverride(id, {
      preOverride: normalizeCameraValues(resolvedSettings),
    });
  }

  function removeOverride(id: string) {
    onChange(
      settings.overrides.filter(
        (cameraOverride) => cameraOverride.id !== id
      )
    );

    if (editingOverrideId === id) {
      setEditingOverrideId(undefined);
    }
  }

  const orderedOverrides = sortCameraOverridesByStartTime(settings.overrides);
  const selectedOverride = settings.overrides.find(item => item.id === editingOverrideId);
  const editingStart = endpoint === "from" && Boolean(selectedOverride?.preOverride);
  const values = selectedOverride
    ? editingStart ? selectedOverride.preOverride! : selectedOverride
    : settings;
  const focusCandidates = selectedOverride ? getCoveredFocusTargets(selectedOverride, camera, lyricTexts) : [];
  // Keep an existing target visible even if its text was moved outside the transition.
  const focusTarget = !editingStart && selectedOverride?.focusTargetId !== undefined
    ? lyricTexts.find(item => item.id === selectedOverride.focusTargetId && isTextItem(item) && isItemRenderEnabled(item))
    : undefined;
  if (focusTarget && !focusCandidates.some(item => item.id === focusTarget.id)) focusCandidates.push(focusTarget);
  const activeIndex = orderedOverrides.findIndex(item => activity.endsWith(`:${item.id}`));
  const status = activity === "none" ? "Camera is not active at the playhead"
    : activity === "base" ? "At playhead: initial state"
    : `At playhead: change ${activeIndex + 1}${activity.startsWith("transition:") ? " · transitioning" : " · holding"}`;

  return <>
    <div className="inspector-camera-properties">
    {selectedOverride && <div className="inspector-section inspector-transition-timing">
      <div className="inspector-toolbar">
        <span className="inspector-status">Timing</span>
      </div>
      <div className="inspector-timing">
        <InspectorNumber label="Start" unit="s" slider={false} value={selectedOverride.startOffset}
          min={0} max={Math.max(0, selectedOverride.endOffset - Math.min(0.01, itemDuration))} step={0.01}
          onChange={startOffset => previewOverride(selectedOverride.id, { startOffset })} onCommit={onPreviewChangeEnd} />
        <InspectorNumber label="End" unit="s" slider={false} value={selectedOverride.endOffset}
          min={Math.min(itemDuration, selectedOverride.startOffset + 0.01)} max={itemDuration} step={0.01}
          onChange={endOffset => previewOverride(selectedOverride.id, { endOffset })} onCommit={onPreviewChangeEnd} />
      </div>
      <InspectorRange value={[selectedOverride.startOffset, selectedOverride.endOffset]}
        min={0} max={itemDuration} step={Math.min(0.01, itemDuration) || 0.01} labels={["Start", "End"]}
        onChange={([startOffset, endOffset]) => previewOverride(selectedOverride.id, { startOffset, endOffset })}
        onCommit={onPreviewChangeEnd} />
      <InspectorToggle label="Custom starting state" checked={Boolean(selectedOverride.preOverride)}
        onChange={enabled => { onPreviewChangeEnd(); if (enabled) addPreOverride(selectedOverride.id);
          else { updateOverride(selectedOverride.id, { preOverride: undefined }); setEndpoint("to"); } }} />
      {selectedOverride.preOverride && <InspectorSelect label="Values" value={editingStart ? "from" : "to"}
        options={[{ value: "to", label: "Destination" }, { value: "from", label: "Starting state" }]}
        onChange={next => { onPreviewChangeEnd(); setEndpoint(next as "from" | "to"); }} />}
    </div>}
    <CameraValuesEditor values={focusTarget ? { ...values, focusDistance: normalizeCameraZPosition(focusTarget.cameraZPosition ?? focusTarget.cameraDepth) } : values}
      focusLocked={Boolean(focusTarget)} onCommit={onPreviewChangeEnd}
      onChange={patch => {
        if (!selectedOverride) onBasePreviewChange(patch);
        else previewOverride(selectedOverride.id, editingStart ? { preOverride: { ...values, ...patch } } : patch);
      }}
      focusControl={selectedOverride && !editingStart ? <>
        <InspectorSelect label="Target" value={focusTarget ? String(focusTarget.id) : "manual"}
          options={[{ value: "manual", label: "Manual distance" }, ...focusCandidates.map(item => ({
            value: String(item.id), label: `${item.text.replace(/\s+/g, " ").trim()} · ${item.start.toFixed(2)} s`,
          }))]}
          onChange={id => {
            const target = focusCandidates.find(item => String(item.id) === id);
            updateOverride(selectedOverride.id, target ? { focusTargetId: target.id,
              focusDistance: normalizeCameraZPosition(target.cameraZPosition ?? target.cameraDepth) } : { focusTargetId: undefined });
          }} />
        {focusTarget && <p className="inspector-note">Distance follows this text until the next change.</p>}
      </> : undefined} />
      {selectedOverride && <div className="inspector-end-actions">
        <button type="button" className="inspector-button inspector-button-danger"
          onClick={event => {
            if (event.detail > 0) event.currentTarget.blur();
            onPreviewChangeEnd();
            removeOverride(selectedOverride.id);
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 4h11M6 4V2h4v2M4 4l.5 10h7L12 4M6.5 7v4M9.5 7v4" />
          </svg>
          Remove change
        </button>
      </div>}
    </div>
    <div className="inspector-camera-footer" role="group" aria-label="Camera change actions">
        <button type="button" className="inspector-button inspector-button-quiet inspector-current-override"
          disabled={activity === "none"}
          title={`${status} · Edit state at playhead`} aria-label={`${status}. Edit state at playhead`}
          onClick={event => {
            if (event.detail > 0) event.currentTarget.blur();
            onPreviewChangeEnd();
            setEditingOverrideId(activity === "base" ? undefined : orderedOverrides[activeIndex]?.id);
            setEndpoint("to");
          }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="4" />
            <path d="M8 1v3m0 8v3M1 8h3m8 0h3" />
            <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>{activity === "none" ? "At playhead: outside camera" : status}</span>
        </button>
      <div className="inspector-editing-context">
        <InspectorSelect label="Editing" value={selectedOverride?.id ?? "base"}
          options={[{ value: "base", label: "Initial state" }, ...orderedOverrides.map((item, index) => ({
            value: item.id, label: `Change ${index + 1}`,
          }))]}
          onChange={id => { onPreviewChangeEnd(); setEditingOverrideId(id === "base" ? undefined : id); setEndpoint("to"); }} />
        <AddAtPlayheadButton cameraStart={camera.start} duration={itemDuration}
          onClick={() => { onPreviewChangeEnd(); addOverride(); setEndpoint("to"); }} />
      </div>
    </div>
  </>;
}
