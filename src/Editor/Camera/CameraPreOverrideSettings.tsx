import { ActionButton, Flex } from "@adobe/react-spectrum";
import Close from "@spectrum-icons/workflow/Close";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { CameraValues } from "./store";

export default function CameraPreOverrideSettings({
  values,
  onChange,
  onRemove,
}: {
  values: CameraValues;
  onChange: (values: CameraValues) => void;
  onRemove: () => void;
}) {
  function updateValue<T extends keyof CameraValues>(
    key: T,
    value: CameraValues[T]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <SettingsSection
      label="Pre-override · From"
      accent
      headerAction={
        <ActionButton
          isQuiet
          aria-label="Remove pre-override camera state"
          onPress={onRemove}
          UNSAFE_style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
        >
          <Close />
        </ActionButton>
      }
    >
      <Flex direction="column" gap="size-100">
        <EffectSlider
          label="Focal length"
          minValue={18}
          maxValue={200}
          step={1}
          value={values.focalLength}
          onChange={(focalLength) => updateValue("focalLength", focalLength)}
        />
        <EffectSlider
          label="Camera rotation"
          minValue={-180}
          maxValue={180}
          step={1}
          value={values.rotation}
          onChange={(rotation) => updateValue("rotation", rotation)}
        />
        <EffectSlider
          label="Focus distance"
          minValue={0}
          maxValue={100}
          step={1}
          value={Math.round(values.focusDistance * 100)}
          onChange={(focusDistance) =>
            updateValue("focusDistance", focusDistance / 100)
          }
        />
        <EffectSlider
          label="Focus speed (slow → fast)"
          minValue={0}
          maxValue={100}
          step={1}
          value={values.focusChangeSpeed}
          onChange={(focusChangeSpeed) =>
            updateValue("focusChangeSpeed", focusChangeSpeed)
          }
        />
      </Flex>
    </SettingsSection>
  );
}
