import { ActionButton, Flex, Item, Picker, Text, View } from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import Close from "@spectrum-icons/workflow/Close";
import { ColorResult } from "react-color";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { getCurrentAudioPosition } from "../AudioTimeline/useAudioPosition";
import { LyricText } from "../types";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import {
  createLightPaletteKeyframe,
  resolveLightPalette,
} from "./paletteKeyframes";
import {
  LightKeyframeTransition,
  LightPaletteKeyframe,
  LightSettings,
} from "./store";

function colorTint(color: LightPaletteKeyframe["baseColor"], alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export default function LightPaletteKeyframes({
  light,
  settings,
  presetColors,
  onChange,
}: {
  light: LyricText;
  settings: LightSettings;
  presetColors?: string[];
  onChange: (keyframes: LightPaletteKeyframe[]) => void;
}) {
  function updateKeyframe(
    id: string,
    patch: Partial<LightPaletteKeyframe>
  ) {
    onChange(
      settings.paletteKeyframes
        .map((keyframe) =>
          keyframe.id === id ? { ...keyframe, ...patch } : keyframe
        )
        .sort((a, b) => a.offset - b.offset)
    );
  }

  function addKeyframe() {
    const currentPosition = getCurrentAudioPosition();
    const itemDuration = Math.max(0, light.end - light.start);
    const offset = Math.max(
      0,
      Math.min(itemDuration, currentPosition - light.start)
    );
    const currentPalette = resolveLightPalette(
      settings,
      light.start,
      currentPosition
    );
    const nextKeyframes = [...settings.paletteKeyframes];

    if (nextKeyframes.length === 0 && offset > 0.01) {
      nextKeyframes.push(createLightPaletteKeyframe(settings, 0));
    }

    const existingIndex = nextKeyframes.findIndex(
      (keyframe) => Math.abs(keyframe.offset - offset) < 0.01
    );
    const nextKeyframe = createLightPaletteKeyframe(
      settings,
      offset,
      currentPalette
    );

    if (existingIndex >= 0) {
      nextKeyframes[existingIndex] = {
        ...nextKeyframe,
        id: nextKeyframes[existingIndex].id,
        transition: nextKeyframes[existingIndex].transition,
      };
    } else {
      nextKeyframes.push(nextKeyframe);
    }

    onChange(nextKeyframes.sort((a, b) => a.offset - b.offset));
  }

  function removeKeyframe(id: string) {
    onChange(
      settings.paletteKeyframes.filter((keyframe) => keyframe.id !== id)
    );
  }

  return (
    <>
      <CustomizationSettingRow
        label="Color animation"
        value={`${settings.paletteKeyframes.length} keyframes`}
        settingComponent={
          <Flex direction="column" gap="size-125">
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              Move the playhead inside this Light item, then capture its current
              palette. Field positions stay unchanged.
            </Text>
            <ActionButton onPress={addKeyframe}>
              <AddCircle />
              <Text>Add keyframe at playhead</Text>
            </ActionButton>
          </Flex>
        }
      />
      {settings.paletteKeyframes.map((keyframe, keyframeIndex) => (
        <View
          key={keyframe.id}
          marginX={10}
          marginBottom={10}
          paddingX={12}
          paddingY={12}
          UNSAFE_style={{
            background: colorTint(keyframe.baseColor, 0.16),
            boxShadow: `inset 0 0 0 1px ${colorTint(
              keyframe.baseColor,
              0.3
            )}`,
            borderRadius: 14,
          }}
        >
          <Flex direction="column" gap="size-150">
            <Flex
              justifyContent="space-between"
              alignItems="center"
              gap="size-100"
            >
              <Text>{`Keyframe ${keyframeIndex + 1} · ${keyframe.offset.toFixed(
                2
              )}s`}</Text>
              <ActionButton
                aria-label={`Remove color keyframe ${keyframeIndex + 1}`}
                onPress={() => removeKeyframe(keyframe.id)}
              >
                <Close />
              </ActionButton>
            </Flex>
            <KeyframeTimeSlider
              value={keyframe.offset}
              max={Math.max(0.01, light.end - light.start)}
              onChange={(offset) => updateKeyframe(keyframe.id, { offset })}
            />
            <Picker
              aria-label={`Keyframe ${keyframeIndex + 1} transition`}
              width="100%"
              selectedKey={keyframe.transition}
              onSelectionChange={(key) => {
                if (key) {
                  updateKeyframe(keyframe.id, {
                    transition: key as LightKeyframeTransition,
                  });
                }
              }}
            >
              <Item key="smooth">Smooth transition</Item>
              <Item key="cut">Instant cut</Item>
            </Picker>
            <Flex direction="column" gap="size-100">
              <Text>Base color</Text>
              <ColorPickerComponent
                color={keyframe.baseColor}
                onChange={(color: ColorResult) =>
                  updateKeyframe(keyframe.id, { baseColor: color.rgb })
                }
                label={`Keyframe ${keyframeIndex + 1} base color`}
                presetColors={presetColors}
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
                    updateKeyframe(keyframe.id, { fieldColors });
                  }}
                  label={`Keyframe ${keyframeIndex + 1} field ${
                    fieldIndex + 1
                  } color`}
                  presetColors={presetColors}
                />
              </Flex>
            ))}
          </Flex>
        </View>
      ))}
    </>
  );
}

function KeyframeTimeSlider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <CustomizationSettingRow
      label="Keyframe time"
      value={value.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label="Keyframe time"
          labelVariant="setting-row"
          minValue={0}
          maxValue={max}
          step={0.01}
          value={value}
          onChange={onChange}
        />
      }
    />
  );
}
