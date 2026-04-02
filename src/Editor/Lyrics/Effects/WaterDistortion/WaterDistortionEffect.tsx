import { Button, Checkbox, Flex, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import { LyricText } from "../../../types";
import { DirectionPicker } from "../DirectionPicker";
import { averageDirectionDegrees, getDirectionVector } from "../direction";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import { EffectSlider } from "../EffectSlider";
import { clamp, constrainTimedEffectRange, getTimedEffectProgress } from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import {
  TEXT_EFFECT_TYPE_WATER_DISTORTION,
  WaterDistortionTextEffect,
} from "../types";
import {
  DEFAULT_WATER_DISTORTION_SETTINGS,
  WaterDistortionSettings,
} from "./types";

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `water-distortion-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(
  settings?: Partial<WaterDistortionSettings>
): WaterDistortionSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_WATER_DISTORTION_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_WATER_DISTORTION_SETTINGS.reverse,
    amount: settings?.amount ?? DEFAULT_WATER_DISTORTION_SETTINGS.amount,
    speed: settings?.speed ?? DEFAULT_WATER_DISTORTION_SETTINGS.speed,
    animationDirection:
      settings?.animationDirection ??
      DEFAULT_WATER_DISTORTION_SETTINGS.animationDirection,
    startPercent:
      settings?.startPercent ?? DEFAULT_WATER_DISTORTION_SETTINGS.startPercent,
    endPercent:
      settings?.endPercent ?? DEFAULT_WATER_DISTORTION_SETTINGS.endPercent,
  };
}

export function createWaterDistortionEffect(
  settings?: Partial<WaterDistortionSettings>
): WaterDistortionSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `water-distortion-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
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

function getNormalizedWaterDistortionEffect(
  settings: Partial<WaterDistortionSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): WaterDistortionTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_WATER_DISTORTION,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getWaterDistortionEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_WATER_DISTORTION
  );

  return genericEffects.map((effect, effectIndex) =>
    getSettingsValue(
      getNormalizedWaterDistortionEffect(effect, lyricText.id, effectIndex)
    )
  );
}

export function setWaterDistortionEffectsForLyricText(
  lyricText: LyricText,
  effects: WaterDistortionSettings[]
) {
  const normalizedGenericEffects = effects.map((effect, effectIndex) =>
    getNormalizedWaterDistortionEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_WATER_DISTORTION,
    normalizedGenericEffects
  );
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getWaterDistortionEffectsFromLyricText(lyricText)[effectIndex] ??
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
    return DEFAULT_WATER_DISTORTION_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled).length;
  const totalAmount = selectedSettings.reduce((sum, settings) => sum + settings.amount, 0);
  const totalSpeed = selectedSettings.reduce((sum, settings) => sum + settings.speed, 0);
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
    amount: totalAmount / selectedSettings.length,
    speed: totalSpeed / selectedSettings.length,
    animationDirection: averageDirectionDegrees(
      selectedSettings,
      DEFAULT_WATER_DISTORTION_SETTINGS.animationDirection
    ),
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

export interface WaterDistortionRenderProps {
  xOffset: number;
  yOffset: number;
  skewX: number;
  skewY: number;
  scaleX: number;
  scaleY: number;
}

export function getWaterDistortionRenderProps(
  lyricText: LyricText,
  position: number,
  previewWidth: number,
  previewHeight: number
): WaterDistortionRenderProps {
  const effects = getWaterDistortionEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return {
      xOffset: 0,
      yOffset: 0,
      skewX: 0,
      skewY: 0,
      scaleX: 1,
      scaleY: 1,
    };
  }

  return effects.reduce(
    (combinedProps, effect, effectIndex) => {
      const effectProgress = getTimedEffectProgress(lyricText, position, effect);

      if (!effectProgress.hasStarted || effectProgress.hasEnded) {
        return combinedProps;
      }

      const amount = clamp(effectProgress.settings.amount, 0, 1);
      const speed = clamp(effectProgress.settings.speed, 0, 1);
      const flow = getDirectionVector(effectProgress.settings.animationDirection);
      const lateral = {
        x: -flow.y,
        y: flow.x,
      };
      const timeScale = 0.08 + Math.pow(speed, 2.15) * 2.1;
      const primaryWave = Math.sin(
        position * timeScale * Math.PI * 2 + lyricText.id * 0.23 + effectIndex * 0.71
      );
      const secondaryWave = Math.sin(
        position * timeScale * Math.PI * 3.3 + lyricText.id * 0.41 + effectIndex * 1.07
      );
      const tertiaryWave = Math.cos(
        position * timeScale * Math.PI * 1.7 + lyricText.id * 0.17 + effectIndex * 0.53
      );
      const offsetAmplitude = Math.min(previewWidth, previewHeight) * 0.012 * amount;
      const skewAmplitude = 5.5 * amount;
      const scaleAmplitude = 0.055 * amount;

      return {
        xOffset:
          combinedProps.xOffset +
          (lateral.x * primaryWave + flow.x * secondaryWave * 0.35) * offsetAmplitude,
        yOffset:
          combinedProps.yOffset +
          (lateral.y * primaryWave + flow.y * secondaryWave * 0.35) * offsetAmplitude,
        skewX: combinedProps.skewX + lateral.x * secondaryWave * skewAmplitude,
        skewY: combinedProps.skewY + lateral.y * secondaryWave * skewAmplitude,
        scaleX: combinedProps.scaleX + tertiaryWave * scaleAmplitude,
        scaleY: combinedProps.scaleY - tertiaryWave * scaleAmplitude * 0.7,
      };
    },
    {
      xOffset: 0,
      yOffset: 0,
      skewX: 0,
      skewY: 0,
      scaleX: 1,
      scaleY: 1,
    }
  );
}

export function WaterDistortionSettingsSection({
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

    return DEFAULT_WATER_DISTORTION_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<WaterDistortionSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects: WaterDistortionSettings[] = [
          ...getWaterDistortionEffectsFromLyricText(lyricText),
        ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createWaterDistortionEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange({
          ...nextEffects[effectIndex],
          ...patch,
        });

        return setWaterDistortionEffectsForLyricText(lyricText, nextEffects);
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

        const nextEffects = getWaterDistortionEffectsFromLyricText(lyricText).filter(
          (_, currentEffectIndex) => currentEffectIndex !== effectIndex
        );

        return setWaterDistortionEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  return (
    <CustomizationSettingRow
      label={`Water ${effectIndex + 1}`}
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
            Enable water distortion
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
              timingLabel="Distortion Timing"
              hideReverse
            />
            <EffectSlider
              label="Amount"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.amount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(amount) => {
                applySettings({ amount });
              }}
            />
            <EffectSlider
              label="Speed"
              minValue={0}
              maxValue={1}
              step={0.02}
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
              label="Flow Direction"
              description="Sets the direction the water distortion flows across the text."
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