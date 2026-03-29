import { Button, Checkbox, Flex, View } from "@adobe/react-spectrum";
import Konva from "konva";
import { useMemo } from "react";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import { LyricText } from "../../../types";
import { EffectSlider } from "../EffectSlider";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import {
  clamp,
  constrainTimedEffectRange,
  easeOutCubic,
  getTimedEffectProgress,
} from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import { BlurTextEffect, TEXT_EFFECT_TYPE_BLUR } from "../types";
import { BlurSettings, DEFAULT_BLUR_SETTINGS } from "./types";

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `blur-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(settings?: Partial<BlurSettings>): BlurSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_BLUR_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_BLUR_SETTINGS.reverse,
    amount: settings?.amount ?? DEFAULT_BLUR_SETTINGS.amount,
    startPercent: settings?.startPercent ?? DEFAULT_BLUR_SETTINGS.startPercent,
    endPercent: settings?.endPercent ?? DEFAULT_BLUR_SETTINGS.endPercent,
  };
}

export function createBlurEffect(settings?: Partial<BlurSettings>): BlurSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `blur-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
  };
}

function getIds(
  selectedLyricText?: LyricText,
  selectedLyricTextIds?: number[]
) {
  if (selectedLyricText) {
    return [selectedLyricText.id];
  }

  if (selectedLyricTextIds && selectedLyricTextIds.length > 0) {
    return selectedLyricTextIds;
  }

  return undefined;
}

function getNormalizedBlurEffect(
  settings: Partial<BlurSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): BlurTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_BLUR,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getBlurEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(lyricText, TEXT_EFFECT_TYPE_BLUR);

  return genericEffects.map((effect, effectIndex) =>
    getSettingsValue(getNormalizedBlurEffect(effect, lyricText.id, effectIndex))
  );
}

export function setBlurEffectsForLyricText(
  lyricText: LyricText,
  effects: BlurSettings[]
) {
  const normalizedGenericEffects = effects.map((effect, effectIndex) =>
    getNormalizedBlurEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_BLUR,
    normalizedGenericEffects
  );
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getBlurEffectsFromLyricText(lyricText)[effectIndex] ??
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
    return DEFAULT_BLUR_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled).length;
  const reverseCount = selectedSettings.filter((settings) => settings.reverse).length;
  const totalAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.amount,
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
    reverse: reverseCount >= Math.ceil(selectedSettings.length / 2),
    amount: totalAmount / selectedSettings.length,
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

export function getTextBlurRenderProps(
  lyricText: LyricText,
  position: number,
  previewWidth: number
) {
  const effects = getBlurEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return {};
  }

  const blurRadius = effects.reduce((maxBlurRadius, effect) => {
    const effectProgress = getTimedEffectProgress(lyricText, position, effect);

    if (!effectProgress.hasStarted || effectProgress.hasEnded) {
      return maxBlurRadius;
    }

    const progress = easeOutCubic(effectProgress.timelineProgress);
    const nextBlurRadius = clamp(effectProgress.settings.amount, 0, 1) * progress * previewWidth * 0.018;

    return Math.max(maxBlurRadius, nextBlurRadius);
  }, 0);

  if (blurRadius <= 0.01) {
    return {};
  }

  return {
    filters: [Konva.Filters.Blur],
    blurRadius,
  };
}

export function BlurSettingsSection({
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

    return DEFAULT_BLUR_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<BlurSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects: BlurSettings[] = [
          ...getBlurEffectsFromLyricText(lyricText),
        ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createBlurEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange({
          ...nextEffects[effectIndex],
          ...patch,
        });

        return setBlurEffectsForLyricText(lyricText, nextEffects);
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

        const nextEffects = getBlurEffectsFromLyricText(lyricText).filter(
          (_, currentEffectIndex) => currentEffectIndex !== effectIndex
        );

        return setBlurEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  return (
    <CustomizationSettingRow
      label={`Text Blur ${effectIndex + 1}`}
      value={
        constrainedSettings.enabled
          ? constrainedSettings.reverse
            ? "Fade Out"
            : "Fade In"
          : "Off"
      }
      prominentLabel={true}
      settingComponent={
        <Flex direction="column" gap={8} width="100%" UNSAFE_style={{ minWidth: 0 }}>
          <Checkbox
            isSelected={constrainedSettings.enabled}
            onChange={(enabled) => {
              applySettings({ enabled });
            }}
          >
            Enable text blur
          </Checkbox>
          <View width="100%" UNSAFE_style={{ opacity: constrainedSettings.enabled ? 1 : 0.45, minWidth: 0 }}>
            <TimedEffectControls
              width="100%"
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              timingLabel="Blur Timing"
              reverseLabel="Fade Out"
              onTimingChange={(range) => {
                applySettings({
                  startPercent: range.start,
                  endPercent: range.end,
                });
              }}
              onReverseChange={(reverse) => {
                applySettings({ reverse });
              }}
            />
            <EffectSlider
              label="Blur Amount"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.amount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(amount) => {
                applySettings({ amount });
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