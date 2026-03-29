import { Checkbox, RangeSlider } from "@adobe/react-spectrum";
import { TimedEffectSettings } from "./shared";

export function TimedEffectControls({
  width,
  settings,
  isDisabled,
  onTimingChange,
  onReverseChange,
  timingLabel = "Effect Timing",
  reverseLabel = "Reverse",
  hideReverse = false,
}: {
  width: number | string;
  settings: TimedEffectSettings;
  isDisabled: boolean;
  onTimingChange: (range: { start: number; end: number }) => void;
  onReverseChange: (reverse: boolean) => void;
  timingLabel?: string;
  reverseLabel?: string;
  hideReverse?: boolean;
}) {
  return (
    <>
      <RangeSlider
        width={width}
        label={timingLabel}
        formatOptions={{ style: "percent", maximumFractionDigits: 0 }}
        minValue={0}
        maxValue={1}
        step={0.01}
        value={{
          start: settings.startPercent,
          end: settings.endPercent,
        }}
        isDisabled={isDisabled}
        onChange={onTimingChange}
      />
      {hideReverse ? null : (
        <Checkbox
          isSelected={settings.reverse}
          isDisabled={isDisabled}
          onChange={onReverseChange}
        >
          {reverseLabel}
        </Checkbox>
      )}
    </>
  );
}