import { Item, Picker, Text } from "@adobe/react-spectrum";
import {
  DirectionalEffectSettings,
  EFFECT_DIRECTION_OPTIONS,
  getNearestDirectionOption,
} from "./direction";

export function DirectionPicker({
  width,
  settings,
  isDisabled,
  onDirectionChange,
  label = "Travel Direction",
  description = "Sets the direction the particles travel and the text wipe follows.",
}: {
  width: number;
  settings: Pick<DirectionalEffectSettings, "animationDirection">;
  isDisabled: boolean;
  onDirectionChange: (directionDegrees: number) => void;
  label?: string;
  description?: string;
}) {
  const selectedDirectionOption = getNearestDirectionOption(
    settings.animationDirection
  );

  return (
    <>
      <Picker
        label={label}
        width={width}
        selectedKey={selectedDirectionOption.key}
        isDisabled={isDisabled}
        onSelectionChange={(key) => {
          const nextDirection = EFFECT_DIRECTION_OPTIONS.find(
            (option) => option.key === key
          );

          if (nextDirection) {
            onDirectionChange(nextDirection.degrees);
          }
        }}
      >
        {EFFECT_DIRECTION_OPTIONS.map((option) => (
          <Item key={option.key}>{option.label}</Item>
        ))}
      </Picker>
      <Text
        UNSAFE_style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.48)",
          lineHeight: 1.45,
          marginTop: -4,
        }}
      >
        {description}
      </Text>
    </>
  );
}