import { Flex } from "@adobe/react-spectrum";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { CameraSettings } from "./store";
import CameraHelpTooltip from "./CameraHelpTooltip";
import CameraSettingsSection from "./CameraSettingsSection";

type UpdateCameraSetting = <T extends keyof CameraSettings>(
  key: T,
  value: CameraSettings[T]
) => void;

export default function BaseCameraSettings({
  settings,
  onChange,
}: {
  settings: CameraSettings;
  onChange: UpdateCameraSetting;
}) {
  return (
    <CustomizationSettingRow
      label="Base camera"
      value={`${Math.round(settings.focalLength)}mm · Focus ${Math.round(
        settings.focusDistance * 100
      )} · ${Math.round(settings.rotation)}°`}
      headerAction={
        <CameraHelpTooltip label="About base camera settings">
          This is the camera state at the start of the Camera item. 50mm
          preserves the original framing; shorter lenses widen and longer
          lenses crop in. Z 0 is nearest and Z 100 is farthest.
        </CameraHelpTooltip>
      }
      settingComponent={
        <Flex direction="column" gap="size-100">
          <CameraSettingsSection label="Lens & orientation">
            <Flex direction="column" gap="size-100">
              <EffectSlider
                label="Focal length"
                minValue={18}
                maxValue={200}
                step={1}
                value={settings.focalLength}
                onChange={(focalLength) =>
                  onChange("focalLength", focalLength)
                }
              />
              <EffectSlider
                label="Camera rotation"
                minValue={-180}
                maxValue={180}
                step={1}
                value={settings.rotation}
                onChange={(rotation) => onChange("rotation", rotation)}
              />
            </Flex>
          </CameraSettingsSection>
          <CameraSettingsSection label="Focus">
            <Flex direction="column" gap="size-100">
              <EffectSlider
                label="Focus distance"
                minValue={0}
                maxValue={100}
                step={1}
                value={Math.round(settings.focusDistance * 100)}
                onChange={(focusDistance) =>
                  onChange("focusDistance", focusDistance / 100)
                }
              />
              <EffectSlider
                label="Focus speed (slow → fast)"
                minValue={0}
                maxValue={100}
                step={1}
                value={settings.focusChangeSpeed}
                onChange={(focusChangeSpeed) =>
                  onChange("focusChangeSpeed", focusChangeSpeed)
                }
              />
            </Flex>
          </CameraSettingsSection>
        </Flex>
      }
    />
  );
}
