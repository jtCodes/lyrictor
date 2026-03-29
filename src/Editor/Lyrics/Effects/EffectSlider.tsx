import { Flex, Slider, Text } from "@adobe/react-spectrum";

function formatSliderValue(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export function EffectSlider({
  label,
  value,
  minValue,
  maxValue,
  step,
  isDisabled,
  onChange,
}: {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  isDisabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Flex direction="column" gap={4} width="100%" UNSAFE_style={{ minWidth: 0 }}>
      <Flex justifyContent="space-between" alignItems="center" gap={12}>
        <Text
          UNSAFE_style={{
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.86)",
            minWidth: 0,
          }}
        >
          {label}
        </Text>
        <Text
          UNSAFE_style={{
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.82)",
            flexShrink: 0,
          }}
        >
          {formatSliderValue(value)}
        </Text>
      </Flex>
      <Slider
        width="100%"
        aria-label={label}
        showValueLabel={false}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        value={value}
        isDisabled={isDisabled}
        onChange={onChange}
      />
    </Flex>
  );
}