import { Flex, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { getElementType } from "../utils";
import BaseCameraSettings from "./BaseCameraSettings";
import CameraOverrides from "./CameraOverrides";
import {
  CameraSettings as CameraSettingsType,
  normalizeCameraSettings,
} from "./store";

export default function CameraSettings({ width }: { width: number }) {
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
        <BaseCameraSettings settings={settings} onChange={updateSetting} />
        <CameraOverrides
          camera={selectedCamera}
          lyricTexts={lyricTexts}
          settings={settings}
          onChange={(overrides) => updateSetting("overrides", overrides)}
        />
      </Flex>
    </View>
  );
}
