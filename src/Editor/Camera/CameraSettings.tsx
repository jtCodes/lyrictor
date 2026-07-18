import { Flex, Text, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { useEditorStore } from "../store";
import { getElementType } from "../utils";
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
      <Flex direction="column" gap="size-300">
        <CustomizationSettingRow
          label="Lens model"
          value="35mm equivalent"
          settingComponent={
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                lineHeight: 1.5,
              }}
            >
              50mm keeps the original framing. Shorter lenses widen the frame;
              longer lenses crop in and compress the background. Lens
              distortion is applied automatically.
            </Text>
          }
        />
        <CustomizationSettingRow
          label="Focal length"
          value={`${Math.round(settings.focalLength)}mm`}
          hideHeader={true}
          settingComponent={
            <EffectSlider
              label="Focal length"
              labelVariant="setting-row"
              minValue={18}
              maxValue={200}
              step={1}
              value={settings.focalLength}
              onChange={(value) => updateSetting("focalLength", value)}
            />
          }
        />
        <CustomizationSettingRow
          label="Focus distance"
          value={`${Math.round(settings.focusDistance * 100)}`}
          hideHeader={true}
          settingComponent={
            <EffectSlider
              label="Focus distance"
              labelVariant="setting-row"
              minValue={0}
              maxValue={100}
              step={1}
              value={Math.round(settings.focusDistance * 100)}
              onChange={(value) => updateSetting("focusDistance", value / 100)}
            />
          }
        />
        <CustomizationSettingRow
          label="Focus change speed"
          value={`${Math.round(settings.focusChangeSpeed)}`}
          hideHeader={true}
          settingComponent={
            <EffectSlider
              label="Focus change speed (slow → fast)"
              labelVariant="setting-row"
              minValue={0}
              maxValue={100}
              step={1}
              value={settings.focusChangeSpeed}
              onChange={(value) => updateSetting("focusChangeSpeed", value)}
            />
          }
        />
        <CustomizationSettingRow
          label="Focus guide"
          value="Z position"
          settingComponent={
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                lineHeight: 1.5,
              }}
            >
              Z 0 is nearest and Z 100 is farthest. Text matching the focus
              distance stays sharp; other Z positions become progressively
              softer.
            </Text>
          }
        />
      </Flex>
    </View>
  );
}
