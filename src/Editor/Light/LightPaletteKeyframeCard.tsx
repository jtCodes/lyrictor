import {
  ActionButton,
  Flex,
  Item,
  Picker,
  Text,
  View,
} from "@adobe/react-spectrum";
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
import { BeatIntensitySetting } from "../Visualizer/AudioVisualizerSettings";
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
  const maximumTransitionDuration =
    (keyframe.endOffset - keyframe.startOffset) / 2;
  const transitionDuration = keyframe.transitionDuration ?? 0;
  const fieldOpacities =
    keyframe.fieldOpacities ?? keyframe.fieldColors.map(() => 1);
  const fieldBeatReactive =
    keyframe.fieldBeatReactive ??
    keyframe.fieldColors.map(() => ({
      intensity: 0,
      focus: 0.15,
      affectsSize: true,
      affectsOpacity: true,
    }));

  function updateFieldBeatReactive(
    fieldIndex: number,
    patch: Partial<(typeof fieldBeatReactive)[number]>
  ) {
    const nextFieldBeatReactive = fieldBeatReactive.map((settings, index) =>
      index === fieldIndex ? { ...settings, ...patch } : settings
    );

    onChange({ fieldBeatReactive: nextFieldBeatReactive });
  }

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

        <Flex direction="column" gap="size-100">
          <Text>Transition</Text>
          <Picker
            aria-label={`Override ${index + 1} transition`}
            width="100%"
            selectedKey={transitionDuration > 0 ? "smooth" : "none"}
            onSelectionChange={(key) =>
              onChange({
                transitionDuration:
                  key === "smooth"
                    ? Math.min(0.25, maximumTransitionDuration)
                    : 0,
              })
            }
          >
            <Item key="none">None</Item>
            <Item key="smooth">Smooth fade in and out</Item>
          </Picker>
        </Flex>
        {transitionDuration > 0 ? (
          <RangeSlider
            label="Transition duration"
            value={transitionDuration}
            min={Math.min(0.01, maximumTransitionDuration)}
            max={maximumTransitionDuration}
            step={Math.min(0.01, maximumTransitionDuration)}
            onChange={(transitionDuration) =>
              onChange({ transitionDuration })
            }
          />
        ) : null}

        <ActionButton
          isQuiet
          onPress={() => setColorsExpanded((isExpanded) => !isExpanded)}
        >
          {colorsExpanded ? <ChevronDown /> : <ChevronRight />}
          <Text>
            {colorsExpanded
              ? "Hide override lighting"
              : "Edit override lighting"}
          </Text>
        </ActionButton>

        {colorsExpanded ? (
          <Flex direction="column" gap="size-150">
            <View
              paddingX={12}
              paddingY={12}
              UNSAFE_style={{
                background: "rgba(255, 255, 255, 0.04)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.09)",
                borderRadius: 10,
              }}
            >
              <Flex direction="column" gap="size-125">
                <OverrideSectionLabel>Background</OverrideSectionLabel>
                <ColorPickerComponent
                  color={keyframe.baseColor}
                  onChange={(color: ColorResult) =>
                    onChange({ baseColor: color.rgb })
                  }
                  label={`Override ${index + 1} background color`}
                />
                <EffectSlider
                  label="Opacity"
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                  value={keyframe.baseOpacity ?? 1}
                  onChange={(baseOpacity) => onChange({ baseOpacity })}
                />
              </Flex>
            </View>
            {keyframe.fieldColors.map((fieldColor, fieldIndex) => (
              <View
                key={fieldIndex}
                paddingX={12}
                paddingY={12}
                UNSAFE_style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow:
                    "inset 0 0 0 1px rgba(255, 255, 255, 0.09)",
                  borderRadius: 10,
                }}
              >
                <Flex direction="column" gap="size-150">
                  <OverrideSectionLabel>{`Field ${fieldIndex + 1}`}</OverrideSectionLabel>

                  <Flex direction="column" gap="size-125">
                    <Text
                      UNSAFE_style={{
                        color: "rgba(255, 255, 255, 0.62)",
                        fontSize: 11,
                      }}
                    >
                      Appearance
                    </Text>
                    <ColorPickerComponent
                      color={fieldColor}
                      onChange={(color: ColorResult) => {
                        const fieldColors = [...keyframe.fieldColors];
                        fieldColors[fieldIndex] = color.rgb;
                        onChange({ fieldColors });
                      }}
                      label={`Override ${index + 1} field ${fieldIndex + 1} color`}
                    />
                    <EffectSlider
                      label="Opacity"
                      value={fieldOpacities[fieldIndex] ?? 1}
                      minValue={0}
                      maxValue={1}
                      step={0.01}
                      onChange={(opacity) => {
                        const nextFieldOpacities = [...fieldOpacities];
                        nextFieldOpacities[fieldIndex] = opacity;
                        onChange({ fieldOpacities: nextFieldOpacities });
                      }}
                    />
                  </Flex>

                  <View
                    height={1}
                    UNSAFE_style={{
                      background: "rgba(255, 255, 255, 0.09)",
                    }}
                  />

                  <Flex direction="column" gap="size-125">
                    <Text
                      UNSAFE_style={{
                        color: "rgba(255, 255, 255, 0.62)",
                        fontSize: 11,
                      }}
                    >
                      Beat response
                    </Text>
                    <BeatIntensitySetting
                      beatSyncIntensity={fieldBeatReactive[fieldIndex].intensity}
                      onIntensityChange={(intensity) =>
                        updateFieldBeatReactive(fieldIndex, { intensity })
                      }
                      onSelectedChange={(isSelected) =>
                        updateFieldBeatReactive(fieldIndex, {
                          intensity: isSelected ? 1 : 0,
                        })
                      }
                      label="Beat intensity"
                      maxValue={2}
                    />
                    {fieldBeatReactive[fieldIndex].intensity > 0 ? (
                      <Flex direction="column" gap="size-125">
                        <EffectSlider
                          label="Frequency focus"
                          value={fieldBeatReactive[fieldIndex].focus}
                          minValue={0}
                          maxValue={1}
                          step={0.01}
                          onChange={(focus) =>
                            updateFieldBeatReactive(fieldIndex, { focus })
                          }
                        />
                        <Picker
                          aria-label={`Override ${index + 1} field ${fieldIndex + 1} beat affects`}
                          label="Beat affects"
                          width="100%"
                          selectedKey={
                            fieldBeatReactive[fieldIndex].affectsSize &&
                            fieldBeatReactive[fieldIndex].affectsOpacity
                              ? "both"
                              : fieldBeatReactive[fieldIndex].affectsSize
                              ? "size"
                              : "brightness"
                          }
                          onSelectionChange={(key) => {
                            if (typeof key !== "string") {
                              return;
                            }

                            updateFieldBeatReactive(fieldIndex, {
                              affectsSize: key === "size" || key === "both",
                              affectsOpacity:
                                key === "brightness" || key === "both",
                            });
                          }}
                        >
                          <Item key="brightness">Brightness</Item>
                          <Item key="size">Size</Item>
                          <Item key="both">Size + brightness</Item>
                        </Picker>
                      </Flex>
                    ) : null}
                  </Flex>
                </Flex>
              </View>
            ))}
          </Flex>
        ) : null}
      </Flex>
    </View>
  );
}

function OverrideSectionLabel({ children }: { children: string }) {
  return (
    <Text
      UNSAFE_style={{
        color: "rgba(255, 255, 255, 0.92)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
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
          step={step}
          value={value}
          onChange={onChange}
        />
      }
    />
  );
}
