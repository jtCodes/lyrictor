import { Button, Checkbox, Flex, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import { LyricText } from "../../../types";
import { DirectionPicker } from "../DirectionPicker";
import { averageDirectionDegrees, getDirectionVector } from "../direction";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import { EffectSlider } from "../EffectSlider";
import {
  clamp,
  constrainTimedEffectRange,
  getTimedEffectProgress,
} from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import { FloatingTextEffect, TEXT_EFFECT_TYPE_FLOATING } from "../types";
import { DEFAULT_FLOATING_SETTINGS, FloatingSettings } from "./types";

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `floating-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(settings?: Partial<FloatingSettings>): FloatingSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_FLOATING_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_FLOATING_SETTINGS.reverse,
    distance: settings?.distance ?? DEFAULT_FLOATING_SETTINGS.distance,
    preStartSeconds:
      settings?.preStartSeconds ?? DEFAULT_FLOATING_SETTINGS.preStartSeconds,
    speed: settings?.speed ?? DEFAULT_FLOATING_SETTINGS.speed,
    animationDirection:
      settings?.animationDirection ?? DEFAULT_FLOATING_SETTINGS.animationDirection,
    startPercent: settings?.startPercent ?? DEFAULT_FLOATING_SETTINGS.startPercent,
    endPercent: settings?.endPercent ?? DEFAULT_FLOATING_SETTINGS.endPercent,
  };
}

export function createFloatingEffect(
  settings?: Partial<FloatingSettings>
): FloatingSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `floating-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
  };
}

function getIds(selectedLyricText?: LyricText, selectedLyricTextIds?: number[]) {
  if (selectedLyricText) {
    return [selectedLyricText.id];
  }

  if (selectedLyricTextIds && selectedLyricTextIds.length > 0) {
    return selectedLyricTextIds;
  }

  return undefined;
}

function getNormalizedFloatingEffect(
  settings: Partial<FloatingSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): FloatingTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_FLOATING,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getFloatingEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(lyricText, TEXT_EFFECT_TYPE_FLOATING);

  return genericEffects.map((effect, effectIndex) =>
    getSettingsValue(getNormalizedFloatingEffect(effect, lyricText.id, effectIndex))
  );
}

export function setFloatingEffectsForLyricText(
  lyricText: LyricText,
  effects: FloatingSettings[]
) {
  const normalizedGenericEffects = effects.map((effect, effectIndex) =>
    getNormalizedFloatingEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_FLOATING,
    normalizedGenericEffects
  );
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getFloatingEffectsFromLyricText(lyricText)[effectIndex] ??
    getSettingsValue(undefined)
  );
}

function getAggregateSettings(
  lyricTexts: LyricText[],
  ids: number[],
  effectIndex: number
) {
  const selectedSettings = lyricTexts
    .filter((lyricText) => ids.includes(lyricText.id))
    .map((lyricText) => getEffectAtIndex(lyricText, effectIndex));

  if (selectedSettings.length === 0) {
    return DEFAULT_FLOATING_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled).length;
  const totalDistance = selectedSettings.reduce(
    (sum, settings) => sum + settings.distance,
    0
  );
  const totalSpeed = selectedSettings.reduce((sum, settings) => sum + settings.speed, 0);
  const totalPreStartSeconds = selectedSettings.reduce(
    (sum, settings) => sum + settings.preStartSeconds,
    0
  );
  const totalStartPercent = selectedSettings.reduce(
    (sum, settings) => sum + settings.startPercent,
    0
  );
  const totalEndPercent = selectedSettings.reduce(
    (sum, settings) => sum + settings.endPercent,
    0
  );

  return {
    enabled: enabledCount >= Math.ceil(selectedSettings.length / 2),
    reverse: false,
    distance: totalDistance / selectedSettings.length,
    preStartSeconds: totalPreStartSeconds / selectedSettings.length,
    speed: totalSpeed / selectedSettings.length,
    animationDirection: averageDirectionDegrees(
      selectedSettings,
      DEFAULT_FLOATING_SETTINGS.animationDirection
    ),
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

export function getFloatingTextOffset(
  lyricText: LyricText,
  position: number,
  previewWidth: number,
  previewHeight: number
) {
  const effects = getFloatingEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return { xOffset: 0, yOffset: 0 };
  }

  return effects.reduce(
    (combinedOffset, effect, effectIndex) => {
      const effectProgress = getTimedEffectProgress(lyricText, position, effect);

      if (!effectProgress.hasStarted || effectProgress.hasEnded) {
        return combinedOffset;
      }

      const direction = getDirectionVector(effectProgress.settings.animationDirection);
      const distance =
        clamp(effectProgress.settings.distance, 0, 1) *
        Math.hypot(previewWidth, previewHeight);
      const preStartSeconds = clamp(effectProgress.settings.preStartSeconds, 0, 3);
      const speed = clamp(effectProgress.settings.speed, 0, 1);
      const speedMultiplier = 0.05 + Math.pow(speed, 1.8) * 1.95;
      const preStartProgress = preStartSeconds / effectProgress.effectDuration;
      const driftDistance =
        distance * clamp((effectProgress.timelineProgress + preStartProgress) * speedMultiplier, 0, 1);

      return {
        xOffset: combinedOffset.xOffset + direction.x * driftDistance,
        yOffset: combinedOffset.yOffset + direction.y * driftDistance,
      };
    },
    { xOffset: 0, yOffset: 0 }
  );
}

export function FloatingSettingsSection({
  selectedLyricText,
  selectedLyricTextIds,
  effectIndex,
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  effectIndex: number;
  width: number;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const updateLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const ids = useMemo(
    () => getIds(selectedLyricText, selectedLyricTextIds),
    [selectedLyricText, selectedLyricTextIds]
  );

  const settings = useMemo(() => {
    if (selectedLyricText) {
      return getEffectAtIndex(selectedLyricText, effectIndex);
    }

    if (ids) {
      return getAggregateSettings(lyricTexts, ids, effectIndex);
    }

    return DEFAULT_FLOATING_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<FloatingSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects: FloatingSettings[] = [
          ...getFloatingEffectsFromLyricText(lyricText),
        ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createFloatingEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange({
          ...nextEffects[effectIndex],
          ...patch,
        });

        return setFloatingEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  const removeEffect = () => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects = getFloatingEffectsFromLyricText(lyricText).filter(
          (_, currentEffectIndex) => currentEffectIndex !== effectIndex
        );

        return setFloatingEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  return (
    <CustomizationSettingRow
      label={`Floating ${effectIndex + 1}`}
      value={constrainedSettings.enabled ? "On" : "Off"}
      prominentLabel={true}
      settingComponent={
        <Flex direction="column" gap={8} width="100%" UNSAFE_style={{ minWidth: 0 }}>
          <Checkbox
            isSelected={constrainedSettings.enabled}
            onChange={(enabled) => {
              applySettings({ enabled });
            }}
          >
            Enable floating motion
          </Checkbox>
          <View
            width="100%"
            UNSAFE_style={{
              opacity: constrainedSettings.enabled ? 1 : 0.45,
              minWidth: 0,
            }}
          >
            <TimedEffectControls
              width="100%"
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              onTimingChange={(range) => {
                applySettings({
                  startPercent: range.start,
                  endPercent: range.end,
                });
              }}
              onReverseChange={() => undefined}
              timingLabel="Motion Timing"
              hideReverse
            />
            <EffectSlider
              label="Distance"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.distance}
              isDisabled={!constrainedSettings.enabled}
              onChange={(distance) => {
                applySettings({ distance });
              }}
            />
            <EffectSlider
              label="Pre-Start"
              minValue={0}
              maxValue={3}
              step={0.05}
              value={constrainedSettings.preStartSeconds}
              isDisabled={!constrainedSettings.enabled}
              onChange={(preStartSeconds) => {
                applySettings({ preStartSeconds });
              }}
            />
            <EffectSlider
              label="Speed"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.speed}
              isDisabled={!constrainedSettings.enabled}
              onChange={(speed) => {
                applySettings({ speed });
              }}
            />
            <DirectionPicker
              width="100%"
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              label="Float Direction"
              description="Sets the direction the lyric drifts while it floats."
              onDirectionChange={(animationDirection) => {
                applySettings({ animationDirection });
              }}
            />
          </View>
          <Button variant="negative" style="fill" onPress={removeEffect}>
            Remove effect
          </Button>
        </Flex>
      }
    />
  );
}