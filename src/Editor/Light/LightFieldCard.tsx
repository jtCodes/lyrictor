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
import { ColorResult } from "react-color";
import { ColorPickerComponent } from "../AudioTimeline/Tools/CustomizationSettingRow";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { BeatIntensitySetting } from "../Visualizer/AudioVisualizerSettings";
import { LightField } from "./store";

const COMPACT_BUTTON_STYLE = {
  width: 26,
  minWidth: 26,
  height: 26,
  minHeight: 26,
  padding: 0,
};

function fieldTint(field: LightField, alpha: number) {
  const { r, g, b } = field.color;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function frequencyFocusLabel(value: number) {
  if (value <= 0.2) return "Bass";
  if (value < 0.4) return "Low-mid";
  if (value <= 0.6) return "Mid";
  if (value < 0.8) return "High-mid";
  return "Treble";
}

function beatResponseLabel(value: number) {
  if (value <= 0) return "Off";
  if (value <= 1) return "Subtle";
  if (value <= 1.5) return "Pulse";
  if (value <= 1.8) return "Punchy";
  return "Flash";
}

function beatTargetKey(field: LightField) {
  if (field.beatReactiveSize && field.beatReactiveOpacity) return "both";
  if (field.beatReactiveSize) return "size";
  return "brightness";
}

export default function LightFieldCard({
  field,
  index,
  presetColors,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
}: {
  field: LightField;
  index: number;
  presetColors?: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LightField>) => void;
  onRemove: () => void;
}) {
  return (
    <View
      paddingX={10}
      paddingY={8}
      UNSAFE_style={{
        background: fieldTint(field, isExpanded ? 0.13 : 0.075),
        boxShadow: `inset 0 0 0 1px ${fieldTint(
          field,
          isExpanded ? 0.3 : 0.2
        )}`,
        borderRadius: 10,
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex alignItems="center" gap="size-75">
          <ActionButton
            isQuiet
            aria-label={`${isExpanded ? "Collapse" : "Expand"} light field ${
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
              background: `rgb(${field.color.r}, ${field.color.g}, ${field.color.b})`,
              border: "1px solid rgba(255, 255, 255, 0.5)",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <Flex direction="column" gap="size-25" flex="1" UNSAFE_style={{ minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{`Field ${
              index + 1
            }`}</span>
            <span
              style={{
                color: "rgba(255, 255, 255, 0.54)",
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`Opacity ${Math.round(field.opacity * 100)} · Motion ${Math.round(
                field.motionAmount * 100
              )} · Beat ${beatResponseLabel(field.beatReactiveIntensity)}`}
            </span>
          </Flex>
          <ActionButton
            isQuiet
            aria-label={`Remove field ${index + 1}`}
            onPress={onRemove}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            <Close />
          </ActionButton>
        </Flex>

        {isExpanded ? (
          <Flex direction="column" gap="size-100">
            <SettingsSection label="Appearance">
              <Flex direction="column" gap="size-100">
                <Flex justifyContent="space-between" alignItems="center">
                  <Text>Color</Text>
                  <ActionButton
                    isQuiet
                    onPress={() =>
                      onChange({ opacity: field.opacity > 0 ? 0 : 0.35 })
                    }
                  >
                    <Text>{field.opacity > 0 ? "Mute" : "Enable"}</Text>
                  </ActionButton>
                </Flex>
                <ColorPickerComponent
                  color={field.color}
                  onChange={(color: ColorResult) =>
                    onChange({ color: color.rgb })
                  }
                  label={`Field ${index + 1} color`}
                  presetColors={presetColors}
                />
                <EffectSlider
                  label="Opacity"
                  value={field.opacity}
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                  onChange={(opacity) => onChange({ opacity })}
                />
              </Flex>
            </SettingsSection>

            <SettingsSection label="Shape & position">
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Horizontal position"
                  value={field.x}
                  minValue={-1}
                  maxValue={2}
                  step={0.01}
                  onChange={(x) => onChange({ x })}
                />
                <EffectSlider
                  label="Vertical position"
                  value={field.y}
                  minValue={-1}
                  maxValue={2}
                  step={0.01}
                  onChange={(y) => onChange({ y })}
                />
                <EffectSlider
                  label="Width"
                  value={field.radiusX}
                  minValue={0.05}
                  maxValue={3.2}
                  step={0.01}
                  onChange={(radiusX) => onChange({ radiusX })}
                />
                <EffectSlider
                  label="Height"
                  value={field.radiusY}
                  minValue={0.05}
                  maxValue={3.2}
                  step={0.01}
                  onChange={(radiusY) => onChange({ radiusY })}
                />
                <EffectSlider
                  label="Rotation"
                  value={field.rotation}
                  minValue={-180}
                  maxValue={180}
                  step={1}
                  onChange={(rotation) => onChange({ rotation })}
                />
              </Flex>
            </SettingsSection>

            <SettingsSection label="Motion & beat">
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Motion amount"
                  value={field.motionAmount}
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                  onChange={(motionAmount) => onChange({ motionAmount })}
                />
                <BeatIntensitySetting
                  beatSyncIntensity={field.beatReactiveIntensity}
                  onIntensityChange={(beatReactiveIntensity) =>
                    onChange({ beatReactiveIntensity })
                  }
                  onSelectedChange={(isSelected) =>
                    onChange({ beatReactiveIntensity: isSelected ? 1 : 0 })
                  }
                  label={`Beat intensity · ${beatResponseLabel(
                    field.beatReactiveIntensity
                  )}`}
                  maxValue={2}
                />
                {field.beatReactiveIntensity > 0 ? (
                  <Flex direction="column" gap="size-100">
                    <EffectSlider
                      label={`Frequency · ${frequencyFocusLabel(
                        field.beatReactiveFocus
                      )}`}
                      value={field.beatReactiveFocus}
                      minValue={0}
                      maxValue={1}
                      step={0.01}
                      onChange={(beatReactiveFocus) =>
                        onChange({ beatReactiveFocus })
                      }
                    />
                    <Picker
                      aria-label={`Field ${index + 1} beat affects`}
                      label="Beat affects"
                      width="100%"
                      selectedKey={beatTargetKey(field)}
                      onSelectionChange={(key) => {
                        if (typeof key !== "string") return;
                        onChange({
                          beatReactiveSize: key === "size" || key === "both",
                          beatReactiveOpacity:
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
            </SettingsSection>
          </Flex>
        ) : null}
      </Flex>
    </View>
  );
}
