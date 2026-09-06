import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { LyricText } from "../types";
import { getElementType, isItemRenderEnabled } from "../utils";
import { useAudioPositionSelector } from "../AudioTimeline/useAudioPosition";
import CameraOverrides from "./CameraOverrides";
import { InspectorToggle } from "../Settings/Inspector";
import { TextCustomizationSettingType } from "../AudioTimeline/Tools/types";
import { getActiveCameraOverrideAtOffset } from "./overrides";
import {
  CameraSettings as CameraSettingsType,
  normalizeCameraSettings,
} from "./store";

export default function CameraSettings({ width }: { width: number }) {
  const { playing } = useAudioPlayer();
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyCameraSettings = useProjectStore(
    (state) => state.modifyCameraSettings
  );
  const commitLyricTextsPreview = useProjectStore(
    (state) => state.commitLyricTextsPreview
  );
  const cameraEditStartRef = useRef<LyricText[] | undefined>(undefined);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const selectedCamera = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find(
      (item) =>
        getElementType(item) === "camera" && selectedLyricTextIds.has(item.id)
    );
  }, [lyricTexts, selectedLyricTextIds]);
  const settings = useMemo(
    () => normalizeCameraSettings(selectedCamera?.cameraSettings),
    [selectedCamera?.cameraSettings]
  );
  const selectCameraActivity = useCallback(
    ({ position }: { position: number }) => {
      if (
        !selectedCamera ||
        !isItemRenderEnabled(selectedCamera) ||
        position < selectedCamera.start ||
        position > selectedCamera.end
      ) {
        return "none";
      }

      const relativePosition = position - selectedCamera.start;
      const activeOverride = getActiveCameraOverrideAtOffset(
        settings.overrides,
        relativePosition
      );

      if (!activeOverride) {
        return "base";
      }

      return relativePosition < activeOverride.endOffset
        ? `transition:${activeOverride.id}`
        : `override:${activeOverride.id}`;
    },
    [selectedCamera, settings.overrides]
  );
  const activity = useAudioPositionSelector(selectCameraActivity, {
    highRefreshRate: true,
    active: Boolean(selectedCamera) && playing,
  });

  function updateSetting<T extends keyof CameraSettingsType>(
    key: T,
    value: CameraSettingsType[T]
  ) {
    if (selectedCamera) {
      commitSettingPreview();
      const previousLyricTexts = useProjectStore.getState().lyricTexts;
      modifyCameraSettings(key, [selectedCamera.id], value);
      commitLyricTextsPreview(previousLyricTexts);
    }
  }

  function previewSetting<T extends keyof CameraSettingsType>(
    key: T,
    value: CameraSettingsType[T]
  ) {
    if (selectedCamera) {
      cameraEditStartRef.current ??=
        useProjectStore.getState().lyricTexts;
      modifyCameraSettings(key, [selectedCamera.id], value);
    }
  }

  function commitSettingPreview() {
    if (cameraEditStartRef.current) {
      commitLyricTextsPreview(cameraEditStartRef.current);
      cameraEditStartRef.current = undefined;
    }
  }

  useEffect(() => () => {
    if (cameraEditStartRef.current) {
      commitLyricTextsPreview(cameraEditStartRef.current);
      cameraEditStartRef.current = undefined;
    }
  }, [selectedCamera?.id, commitLyricTextsPreview]);

  if (!selectedCamera) {
    return null;
  }

  return (
    <div className="settings-inspector inspector-camera" style={{ width, maxWidth: "100%" }}>
      <div className="inspector-toolbar">
        <strong>Camera</strong>
        <InspectorToggle label="Enabled" checked={isItemRenderEnabled(selectedCamera)} onChange={enabled => {
          commitSettingPreview();
          const previousLyricTexts = useProjectStore.getState().lyricTexts;
          useProjectStore.getState().modifyLyricTexts(TextCustomizationSettingType.renderEnabled, [selectedCamera.id], enabled);
          commitLyricTextsPreview(previousLyricTexts);
        }} />
      </div>
      <p className="inspector-note">{selectedCamera.start.toFixed(2)}–{selectedCamera.end.toFixed(2)} s · Camera item</p>
      <CameraOverrides
        key={selectedCamera.id}
        camera={selectedCamera}
        lyricTexts={lyricTexts}
        settings={settings}
        activity={activity}
        onBasePreviewChange={patch => {
          for (const [key, value] of Object.entries(patch)) {
            previewSetting(key as keyof CameraSettingsType, value);
          }
        }}
        onChange={overrides => updateSetting("overrides", overrides)}
        onPreviewChange={overrides => previewSetting("overrides", overrides)}
        onPreviewChangeEnd={commitSettingPreview}
      />
    </div>
  );
}
