import { Flex } from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import SettingsHelpTooltip from "../AudioTimeline/Tools/SettingsHelpTooltip";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { CameraSettings } from "./store";
import CameraActivityBadge from "./CameraActivityBadge";

type UpdateCameraSetting = <T extends keyof CameraSettings>(
  key: T,
  value: CameraSettings[T]
) => void;

export default function BaseCameraSettings({
  settings,
  onChange,
  isActive,
}: {
  settings: CameraSettings;
  onChange: UpdateCameraSetting;
  isActive: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(!isActive);

  useEffect(() => {
    setIsCollapsed(!isActive);
  }, [isActive]);

  return (
    <CustomizationSettingRow
      label="Base camera"
      value={`${Math.round(settings.focalLength)}mm · FB ${Math.round(
        settings.dollyPosition
      )} · LR ${Math.round(settings.truckPosition)}`}
      headerAction={
        <Flex alignItems="center" gap="size-50">
          <CameraActivityBadge active={isActive} />
          <SettingsHelpTooltip label="About base camera settings">
            This is the camera state at the start of the Camera item. 50mm
            preserves the original framing; shorter lenses widen and longer
            lenses crop in. Camera movement changes perspective: negative moves
            backward and positive moves forward. Z 0 is nearest and Z 100 is
            farthest.
          </SettingsHelpTooltip>
        </Flex>
      }
      isCollapsed={isCollapsed}
      onToggleCollapsed={() => setIsCollapsed((collapsed) => !collapsed)}
      settingComponent={
        <Flex direction="column" gap="size-100">
          <SettingsSection label="Lens & movement">
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
                label="Camera movement (back → forward)"
                minValue={-100}
                maxValue={100}
                step={1}
                value={settings.dollyPosition}
                onChange={(dollyPosition) =>
                  onChange("dollyPosition", dollyPosition)
                }
              />
              <EffectSlider
                label="Camera movement (left → right)"
                minValue={-100}
                maxValue={100}
                step={1}
                value={settings.truckPosition}
                onChange={(truckPosition) =>
                  onChange("truckPosition", truckPosition)
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
              <EffectSlider
                label="Camera tilt (down → up)"
                minValue={-90}
                maxValue={90}
                step={1}
                value={settings.tilt}
                onChange={(tilt) => onChange("tilt", tilt)}
              />
            </Flex>
          </SettingsSection>
          <SettingsSection label="Focus">
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
          </SettingsSection>
        </Flex>
      }
    />
  );
}
