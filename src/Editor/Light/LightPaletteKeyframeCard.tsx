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
import { ColorResult, RGBColor } from "react-color";
import { ColorPickerComponent } from "../AudioTimeline/Tools/CustomizationSettingRow";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { BeatIntensitySetting } from "../Visualizer/AudioVisualizerSettings";
import {
  LightBeatReactiveSettings,
  LightPaletteKeyframe,
} from "./store";

const MINIMUM_KEYFRAME_DURATION = 0.01;
const COMPACT_BUTTON_STYLE = {
  width: 26,
  minWidth: 26,
  height: 26,
  minHeight: 26,
  padding: 0,
};

export default function LightPaletteKeyframeCard({
  keyframe,
  index,
  itemDuration,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
}: {
  keyframe: LightPaletteKeyframe;
  index: number;
  itemDuration: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LightPaletteKeyframe>) => void;
  onRemove: () => void;
}) {
  const [expandedFieldIndex, setExpandedFieldIndex] = useState<number>();
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
  const transitionSummary =
    transitionDuration > 0
      ? `Smooth ${transitionDuration.toFixed(2)}s`
      : "Cut";

  function updateFieldBeatReactive(
    fieldIndex: number,
    patch: Partial<LightBeatReactiveSettings>
  ) {
    onChange({
      fieldBeatReactive: fieldBeatReactive.map((settings, index) =>
        index === fieldIndex ? { ...settings, ...patch } : settings
      ),
    });
  }

  return (
    <View
      paddingX={10}
      paddingY={8}
      UNSAFE_style={{
        background: isExpanded
          ? "rgba(255, 255, 255, 0.045)"
          : "rgba(255, 255, 255, 0.025)",
        boxShadow: `inset 0 0 0 1px ${
          isExpanded
            ? "rgba(255, 255, 255, 0.105)"
            : "rgba(255, 255, 255, 0.065)"
        }`,
        borderRadius: 10,
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex alignItems="center" gap="size-75">
          <ActionButton
            isQuiet
            aria-label={`${isExpanded ? "Collapse" : "Expand"} lighting override ${
              index + 1
            }`}
            onPress={onToggle}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </ActionButton>
          <View
            width={12}
            height={12}
            UNSAFE_style={{
              background: rgbString(keyframe.baseColor),
              border: "1px solid rgba(255, 255, 255, 0.5)",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <Flex direction="column" gap="size-25" flex="1" UNSAFE_style={{ minWidth: 0 }}>
            <Flex justifyContent="space-between" alignItems="center" gap="size-75">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{`Override ${
                index + 1
              }`}</span>
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.66)",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                {`${keyframe.startOffset.toFixed(
                  2
                )}–${keyframe.endOffset.toFixed(2)}s`}
              </span>
            </Flex>
            <span
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`${transitionSummary} · ${keyframe.fieldColors.length} fields`}
            </span>
          </Flex>
          <ActionButton
            isQuiet
            aria-label={`Remove lighting override ${index + 1}`}
            onPress={onRemove}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            <Close />
          </ActionButton>
        </Flex>

        {isExpanded ? (
          <Flex direction="column" gap="size-100">
            <SettingsSection label="Override timing">
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Start time"
                  value={keyframe.startOffset}
                  minValue={0}
                  maxValue={Math.max(
                    0,
                    keyframe.endOffset - MINIMUM_KEYFRAME_DURATION
                  )}
                  step={0.01}
                  onChange={(startOffset) => onChange({ startOffset })}
                />
                <EffectSlider
                  label="End time"
                  value={keyframe.endOffset}
                  minValue={Math.min(
                    itemDuration,
                    keyframe.startOffset + MINIMUM_KEYFRAME_DURATION
                  )}
                  maxValue={Math.max(
                    itemDuration,
                    MINIMUM_KEYFRAME_DURATION
                  )}
                  step={0.01}
                  onChange={(endOffset) => onChange({ endOffset })}
                />
                <Picker
                  aria-label={`Override ${index + 1} transition`}
                  label="Edge transition"
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
                {transitionDuration > 0 ? (
                  <EffectSlider
                    label="Transition duration"
                    value={transitionDuration}
                    minValue={Math.min(0.01, maximumTransitionDuration)}
                    maxValue={maximumTransitionDuration}
                    step={Math.min(0.01, maximumTransitionDuration)}
                    onChange={(nextDuration) =>
                      onChange({ transitionDuration: nextDuration })
                    }
                  />
                ) : null}
              </Flex>
            </SettingsSection>

            <SettingsSection label="Background override">
              <Flex direction="column" gap="size-100">
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
            </SettingsSection>

            <SettingsSection label="Field overrides">
              <Flex direction="column" gap="size-100">
                {keyframe.fieldColors.map((fieldColor, fieldIndex) => (
                  <OverrideFieldCard
                    key={fieldIndex}
                    index={fieldIndex}
                    color={fieldColor}
                    opacity={fieldOpacities[fieldIndex] ?? 1}
                    beatReactive={fieldBeatReactive[fieldIndex]}
                    isExpanded={expandedFieldIndex === fieldIndex}
                    onToggle={() =>
                      setExpandedFieldIndex((currentIndex) =>
                        currentIndex === fieldIndex ? undefined : fieldIndex
                      )
                    }
                    onColorChange={(color) => {
                      const fieldColors = [...keyframe.fieldColors];
                      fieldColors[fieldIndex] = color;
                      onChange({ fieldColors });
                    }}
                    onOpacityChange={(opacity) => {
                      const nextFieldOpacities = [...fieldOpacities];
                      nextFieldOpacities[fieldIndex] = opacity;
                      onChange({ fieldOpacities: nextFieldOpacities });
                    }}
                    onBeatChange={(patch) =>
                      updateFieldBeatReactive(fieldIndex, patch)
                    }
                  />
                ))}
              </Flex>
            </SettingsSection>
          </Flex>
        ) : null}
      </Flex>
    </View>
  );
}

function OverrideFieldCard({
  index,
  color,
  opacity,
  beatReactive,
  isExpanded,
  onToggle,
  onColorChange,
  onOpacityChange,
  onBeatChange,
}: {
  index: number;
  color: RGBColor;
  opacity: number;
  beatReactive: LightBeatReactiveSettings;
  isExpanded: boolean;
  onToggle: () => void;
  onColorChange: (color: RGBColor) => void;
  onOpacityChange: (opacity: number) => void;
  onBeatChange: (patch: Partial<LightBeatReactiveSettings>) => void;
}) {
  return (
    <View
      paddingX={8}
      paddingY={7}
      UNSAFE_style={{
        background: "rgba(255, 255, 255, 0.028)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.065)",
        borderRadius: 8,
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex alignItems="center" gap="size-75">
          <ActionButton
            isQuiet
            aria-label={`${isExpanded ? "Collapse" : "Expand"} field ${
              index + 1
            } override`}
            onPress={onToggle}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </ActionButton>
          <View
            width={11}
            height={11}
            UNSAFE_style={{
              background: rgbString(color),
              border: "1px solid rgba(255, 255, 255, 0.45)",
              borderRadius: "50%",
            }}
          />
          <Flex direction="column" gap="size-25" flex="1">
            <Text>{`Field ${index + 1}`}</Text>
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: 10,
              }}
            >
              {`Opacity ${Math.round(opacity * 100)} · Beat ${
                beatReactive.intensity > 0 ? "On" : "Off"
              }`}
            </Text>
          </Flex>
        </Flex>

        {isExpanded ? (
          <Flex direction="column" gap="size-100">
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.58)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Appearance
            </Text>
            <ColorPickerComponent
              color={color}
              onChange={(result: ColorResult) => onColorChange(result.rgb)}
              label={`Override field ${index + 1} color`}
            />
            <EffectSlider
              label="Opacity"
              value={opacity}
              minValue={0}
              maxValue={1}
              step={0.01}
              onChange={onOpacityChange}
            />
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.58)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Beat response
            </Text>
            <BeatIntensitySetting
              beatSyncIntensity={beatReactive.intensity}
              onIntensityChange={(intensity) => onBeatChange({ intensity })}
              onSelectedChange={(isSelected) =>
                onBeatChange({ intensity: isSelected ? 1 : 0 })
              }
              label="Beat intensity"
              maxValue={2}
            />
            {beatReactive.intensity > 0 ? (
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Frequency focus"
                  value={beatReactive.focus}
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                  onChange={(focus) => onBeatChange({ focus })}
                />
                <Picker
                  aria-label={`Override field ${index + 1} beat affects`}
                  label="Beat affects"
                  width="100%"
                  selectedKey={
                    beatReactive.affectsSize && beatReactive.affectsOpacity
                      ? "both"
                      : beatReactive.affectsSize
                        ? "size"
                        : "brightness"
                  }
                  onSelectionChange={(key) => {
                    if (typeof key !== "string") return;
                    onBeatChange({
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
        ) : null}
      </Flex>
    </View>
  );
}

function rgbString(color: RGBColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
