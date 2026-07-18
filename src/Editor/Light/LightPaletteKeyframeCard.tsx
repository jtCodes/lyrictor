import { ActionButton, Flex, Text, View } from "@adobe/react-spectrum";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import ChevronRight from "@spectrum-icons/workflow/ChevronRight";
import Close from "@spectrum-icons/workflow/Close";
import { useState } from "react";
import { ColorResult } from "react-color";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { LightPaletteKeyframe } from "./store";

const MINIMUM_KEYFRAME_DURATION = 0.01;

export default function LightPaletteKeyframeCard({
  keyframe,
  index,
  itemDuration,
  onChange,
  onRemove,
}: {
  keyframe: LightPaletteKeyframe;
  index: number;
  itemDuration: number;
  onChange: (patch: Partial<LightPaletteKeyframe>) => void;
  onRemove: () => void;
}) {
  const [colorsExpanded, setColorsExpanded] = useState(false);

  return (
    <View
      paddingX={12}
      paddingY={12}
      UNSAFE_style={{
        background: "rgba(255, 255, 255, 0.035)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
      }}
    >
      <Flex direction="column" gap="size-150">
        <Flex justifyContent="space-between" alignItems="center" gap="size-100">
          <Flex direction="column" gap="size-50">
            <Text>{`Override ${index + 1}`}</Text>
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                fontSize: 11,
              }}
            >
              {`${keyframe.startOffset.toFixed(2)}–${keyframe.endOffset.toFixed(
                2
              )}s`}
            </Text>
          </Flex>
          <ActionButton
            aria-label={`Remove keyframe override ${index + 1}`}
            onPress={onRemove}
          >
            <Close />
          </ActionButton>
        </Flex>

        <RangeSlider
          label="Start time"
          value={keyframe.startOffset}
          min={0}
          max={Math.max(0, keyframe.endOffset - MINIMUM_KEYFRAME_DURATION)}
          onChange={(startOffset) => onChange({ startOffset })}
        />
        <RangeSlider
          label="End time"
          value={keyframe.endOffset}
          min={Math.min(
            itemDuration,
            keyframe.startOffset + MINIMUM_KEYFRAME_DURATION
          )}
          max={Math.max(itemDuration, MINIMUM_KEYFRAME_DURATION)}
          onChange={(endOffset) => onChange({ endOffset })}
        />

        <ActionButton
          isQuiet
          onPress={() => setColorsExpanded((isExpanded) => !isExpanded)}
        >
          {colorsExpanded ? <ChevronDown /> : <ChevronRight />}
          <Text>{colorsExpanded ? "Hide override colors" : "Edit override colors"}</Text>
        </ActionButton>

        {colorsExpanded ? (
          <Flex direction="column" gap="size-125">
            <Flex direction="column" gap="size-100">
              <Text>Background color</Text>
              <ColorPickerComponent
                color={keyframe.baseColor}
                onChange={(color: ColorResult) =>
                  onChange({ baseColor: color.rgb })
                }
                label={`Override ${index + 1} background color`}
              />
            </Flex>
            {keyframe.fieldColors.map((fieldColor, fieldIndex) => (
              <Flex key={fieldIndex} direction="column" gap="size-100">
                <Text>{`Field ${fieldIndex + 1} color`}</Text>
                <ColorPickerComponent
                  color={fieldColor}
                  onChange={(color: ColorResult) => {
                    const fieldColors = [...keyframe.fieldColors];
                    fieldColors[fieldIndex] = color.rgb;
                    onChange({ fieldColors });
                  }}
                  label={`Override ${index + 1} field ${fieldIndex + 1} color`}
                />
              </Flex>
            ))}
          </Flex>
        ) : null}
      </Flex>
    </View>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <CustomizationSettingRow
      label={label}
      value={value.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label={label}
          labelVariant="setting-row"
          minValue={min}
          maxValue={max}
          step={0.01}
          value={value}
          onChange={onChange}
        />
      }
    />
  );
}
