import { ActionButton, Flex, Text, View } from "@adobe/react-spectrum";
import Close from "@spectrum-icons/workflow/Close";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
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
    <View
      paddingX={12}
      paddingY={12}
      UNSAFE_style={{
        background: "rgba(72, 201, 255, 0.055)",
        boxShadow: "inset 0 0 0 1px rgba(72, 201, 255, 0.18)",
        borderRadius: 10,
      }}
    >
      <Flex direction="column" gap="size-150">
        <Flex justifyContent="space-between" alignItems="center">
          <Flex direction="column" gap="size-50">
            <Text>Pre-override · From</Text>
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                fontSize: 11,
              }}
            >
              Camera state at Start
            </Text>
          </Flex>
          <ActionButton
            aria-label="Remove pre-override camera state"
            onPress={onRemove}
          >
            <Close />
          </ActionButton>
        </Flex>
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
          label="Focus change speed (slow → fast)"
          minValue={0}
          maxValue={100}
          step={1}
          value={values.focusChangeSpeed}
          onChange={(focusChangeSpeed) =>
            updateValue("focusChangeSpeed", focusChangeSpeed)
          }
        />
      </Flex>
    </View>
  );
}
