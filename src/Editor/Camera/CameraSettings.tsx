import { Flex, View } from "@adobe/react-spectrum";
import { useCallback, useMemo } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { getElementType, isItemRenderEnabled } from "../utils";
import { useAudioPositionSelector } from "../AudioTimeline/useAudioPosition";
import BaseCameraSettings from "./BaseCameraSettings";
import CameraOverrides from "./CameraOverrides";
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
      modifyCameraSettings(key, [selectedCamera.id], value);
    }
  }

  if (!selectedCamera) {
    return null;
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column">
        <BaseCameraSettings
          settings={settings}
          onChange={updateSetting}
          isActive={activity === "base"}
        />
        <CameraOverrides
          camera={selectedCamera}
          lyricTexts={lyricTexts}
          settings={settings}
          activity={activity}
          onChange={(overrides) => updateSetting("overrides", overrides)}
        />
      </Flex>
    </View>
  );
}
