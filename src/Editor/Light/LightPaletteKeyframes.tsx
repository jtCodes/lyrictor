import { ActionButton, Flex, Text } from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { useState } from "react";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import SettingsHelpTooltip from "../AudioTimeline/Tools/SettingsHelpTooltip";
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
  const endOffset = Math.min(
    itemDuration,
    Math.max(startOffset + minimumDuration, keyframe.endOffset)
  );

  return {
    ...keyframe,
    startOffset,
    endOffset,
    transitionDuration: Math.min(
      Math.max(0, keyframe.transitionDuration ?? 0),
      (endOffset - startOffset) / 2
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
  const [expandedKeyframeId, setExpandedKeyframeId] = useState<string>();

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

    const addedKeyframeId =
      existingIndex >= 0
        ? nextKeyframes[existingIndex].id
        : nextKeyframe.id;
    onChange(nextKeyframes.sort((a, b) => a.startOffset - b.startOffset));
    setExpandedKeyframeId(addedKeyframeId);
  }

  function removeKeyframe(id: string) {
    onChange(
      settings.paletteKeyframes.filter((keyframe) => keyframe.id !== id)
    );
    if (expandedKeyframeId === id) {
      setExpandedKeyframeId(undefined);
    }
  }

  return (
    <CustomizationSettingRow
      label="Keyframe overrides"
      value={`${settings.paletteKeyframes.length} ranges`}
      headerAction={
        <SettingsHelpTooltip label="About lighting overrides">
          Base lighting remains underneath. An override replaces its colors,
          opacities, and beat response from Start through End, then Base takes
          over again. Times are relative to the Light item.
        </SettingsHelpTooltip>
      }
      settingComponent={
        <Flex direction="column" gap="size-150">
          {settings.paletteKeyframes.map((keyframe, keyframeIndex) => (
            <LightPaletteKeyframeCard
              key={keyframe.id}
              keyframe={constrainKeyframeRange(keyframe, itemDuration)}
              index={keyframeIndex}
              itemDuration={itemDuration}
              isExpanded={expandedKeyframeId === keyframe.id}
              onToggle={() =>
                setExpandedKeyframeId((currentId) =>
                  currentId === keyframe.id ? undefined : keyframe.id
                )
              }
              onChange={(patch) => updateKeyframe(keyframe.id, patch)}
              onRemove={() => removeKeyframe(keyframe.id)}
            />
          ))}
          <ActionButton onPress={addKeyframe}>
            <AddCircle />
            <Text>Add override at playhead</Text>
          </ActionButton>
        </Flex>
      }
    />
  );
}
