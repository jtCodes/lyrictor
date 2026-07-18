import { ActionButton, Flex, Text } from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { getCurrentAudioPosition } from "../AudioTimeline/useAudioPosition";
import { LyricText } from "../types";
import { createLightPaletteKeyframe } from "./paletteKeyframes";
import LightPaletteKeyframeCard from "./LightPaletteKeyframeCard";
import { LightPaletteKeyframe, LightSettings } from "./store";

const DEFAULT_OVERRIDE_DURATION = 1;
const MINIMUM_OVERRIDE_DURATION = 0.01;

function constrainKeyframeRange(
  keyframe: LightPaletteKeyframe,
  itemDuration: number
) {
  const minimumDuration = Math.min(MINIMUM_OVERRIDE_DURATION, itemDuration);
  const startOffset = Math.min(
    keyframe.startOffset,
    Math.max(0, itemDuration - minimumDuration)
  );

  return {
    ...keyframe,
    startOffset,
    endOffset: Math.min(
      itemDuration,
      Math.max(startOffset + minimumDuration, keyframe.endOffset)
    ),
  };
}

export default function LightPaletteKeyframes({
  light,
  settings,
  onChange,
}: {
  light: LyricText;
  settings: LightSettings;
  onChange: (keyframes: LightPaletteKeyframe[]) => void;
}) {
  const itemDuration = Math.max(0, light.end - light.start);

  function updateKeyframe(
    id: string,
    patch: Partial<LightPaletteKeyframe>
  ) {
    onChange(
      settings.paletteKeyframes
        .map((keyframe) =>
          keyframe.id === id
            ? constrainKeyframeRange(
                { ...keyframe, ...patch },
                itemDuration
              )
            : keyframe
        )
        .sort((a, b) => a.startOffset - b.startOffset)
    );
  }

  function addKeyframe() {
    if (itemDuration <= 0) {
      return;
    }

    const currentPosition = getCurrentAudioPosition();
    const currentOffset = Math.max(
      0,
      Math.min(itemDuration, currentPosition - light.start)
    );
    const overrideDuration = Math.min(DEFAULT_OVERRIDE_DURATION, itemDuration);
    const startOffset = Math.min(
      currentOffset,
      Math.max(0, itemDuration - overrideDuration)
    );
    const endOffset = Math.min(itemDuration, startOffset + overrideDuration);
    const nextKeyframe = createLightPaletteKeyframe(
      settings,
      startOffset,
      endOffset
    );
    const existingIndex = settings.paletteKeyframes.findIndex(
      (keyframe) => Math.abs(keyframe.startOffset - startOffset) < 0.01
    );
    const nextKeyframes = [...settings.paletteKeyframes];

    if (existingIndex >= 0) {
      nextKeyframes[existingIndex] = {
        ...nextKeyframe,
        id: nextKeyframes[existingIndex].id,
        endOffset: nextKeyframes[existingIndex].endOffset,
      };
    } else {
      nextKeyframes.push(nextKeyframe);
    }

    onChange(nextKeyframes.sort((a, b) => a.startOffset - b.startOffset));
  }

  function removeKeyframe(id: string) {
    onChange(
      settings.paletteKeyframes.filter((keyframe) => keyframe.id !== id)
    );
  }

  return (
    <CustomizationSettingRow
      label="Keyframe overrides"
      value={`${settings.paletteKeyframes.length} ranges`}
      settingComponent={
        <Flex direction="column" gap="size-150">
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.62)",
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            Base lighting remains underneath. An override replaces its colors
            only from Start through End, then Base takes over again. Times are
            relative to the Light item.
          </Text>
          <ActionButton onPress={addKeyframe}>
            <AddCircle />
            <Text>Add override at playhead</Text>
          </ActionButton>
          {settings.paletteKeyframes.map((keyframe, keyframeIndex) => (
            <LightPaletteKeyframeCard
              key={keyframe.id}
              keyframe={constrainKeyframeRange(keyframe, itemDuration)}
              index={keyframeIndex}
              itemDuration={itemDuration}
              onChange={(patch) => updateKeyframe(keyframe.id, patch)}
              onRemove={() => removeKeyframe(keyframe.id)}
            />
          ))}
        </Flex>
      }
    />
  );
}
