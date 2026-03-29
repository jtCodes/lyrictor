import { Button, Checkbox, Flex, Slider, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { Group, Text as KonvaText } from "react-konva";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import {
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../../types";
import { DirectionPicker } from "../DirectionPicker";
import { averageDirectionDegrees, getDirectionVector } from "../direction";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import {
  clamp,
  constrainTimedEffectRange,
  easeOutCubic,
  getTimedEffectProgress,
} from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import { GlitchTextEffect, TEXT_EFFECT_TYPE_GLITCH } from "../types";
import { DEFAULT_GLITCH_SETTINGS, GlitchSettings } from "./types";

const GLITCH_RED = "rgba(255, 72, 102, 0.92)";
const GLITCH_CYAN = "rgba(77, 232, 255, 0.92)";

function seededValue(seed: number) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `glitch-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(settings?: Partial<GlitchSettings>): GlitchSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_GLITCH_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_GLITCH_SETTINGS.reverse,
    intensity: settings?.intensity ?? DEFAULT_GLITCH_SETTINGS.intensity,
    splitAmount: settings?.splitAmount ?? DEFAULT_GLITCH_SETTINGS.splitAmount,
    jitterAmount:
      settings?.jitterAmount ?? DEFAULT_GLITCH_SETTINGS.jitterAmount,
    flickerAmount:
      settings?.flickerAmount ?? DEFAULT_GLITCH_SETTINGS.flickerAmount,
    flickerSpeed:
      settings?.flickerSpeed ?? DEFAULT_GLITCH_SETTINGS.flickerSpeed,
    animationDirection:
      settings?.animationDirection ?? DEFAULT_GLITCH_SETTINGS.animationDirection,
    startPercent:
      settings?.startPercent ?? DEFAULT_GLITCH_SETTINGS.startPercent,
    endPercent: settings?.endPercent ?? DEFAULT_GLITCH_SETTINGS.endPercent,
  };
}

export function createGlitchEffect(
  settings?: Partial<GlitchSettings>
): GlitchSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `glitch-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
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

function getNormalizedGlitchEffect(
  settings: Partial<GlitchSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): GlitchTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_GLITCH,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getGlitchEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(lyricText, TEXT_EFFECT_TYPE_GLITCH);

  return genericEffects.map((effect, effectIndex) =>
    getSettingsValue(getNormalizedGlitchEffect(effect, lyricText.id, effectIndex))
  );
}

export function setGlitchEffectsForLyricText(
  lyricText: LyricText,
  effects: GlitchSettings[]
) {
  const normalizedGenericEffects = effects.map((effect, effectIndex) =>
    getNormalizedGlitchEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_GLITCH,
    normalizedGenericEffects
  );
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getGlitchEffectsFromLyricText(lyricText)[effectIndex] ??
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
    return DEFAULT_GLITCH_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled)
    .length;
  const reverseCount = selectedSettings.filter((settings) => settings.reverse)
    .length;
  const totalIntensity = selectedSettings.reduce(
    (sum, settings) => sum + settings.intensity,
    0
  );
  const totalSplitAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.splitAmount,
    0
  );
  const totalJitterAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.jitterAmount,
    0
  );
  const totalFlickerAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.flickerAmount,
    0
  );
  const totalFlickerSpeed = selectedSettings.reduce(
    (sum, settings) => sum + settings.flickerSpeed,
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
    intensity: totalIntensity / selectedSettings.length,
    splitAmount: totalSplitAmount / selectedSettings.length,
    jitterAmount: totalJitterAmount / selectedSettings.length,
    flickerAmount: totalFlickerAmount / selectedSettings.length,
    flickerSpeed: totalFlickerSpeed / selectedSettings.length,
    animationDirection: averageDirectionDegrees(
      selectedSettings,
      DEFAULT_GLITCH_SETTINGS.animationDirection
    ),
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

function getGlitchTextNodeProps(lyricText: LyricText, previewWidth: number) {
  return {
    text: lyricText.text,
    fontStyle: String(lyricText.fontWeight ?? 400),
    fontFamily: lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME,
    fontSize:
      (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth ||
      DEFAULT_TEXT_PREVIEW_FONT_SIZE,
    width: lyricText.width
      ? Math.min(previewWidth, lyricText.width * previewWidth)
      : undefined,
    perfectDrawEnabled: false,
    listening: false,
  } as const;
}

function getGlitchPrimaryTextState(
  lyricText: LyricText,
  position: number,
  previewWidth: number
) {
  const effects = getGlitchEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return {
      xOffset: 0,
      yOffset: 0,
      opacity: 1,
    };
  }

  return effects.reduce(
    (combinedState, effect, effectIndex) => {
      const effectProgress = getTimedEffectProgress(lyricText, position, effect);

      if (!effectProgress.hasStarted || effectProgress.hasEnded) {
        return combinedState;
      }

      const progress = easeOutCubic(effectProgress.timelineProgress);
      const intensity = clamp(effectProgress.settings.intensity, 0.1, 1);
      const splitAmount = clamp(effectProgress.settings.splitAmount, 0, 1);
      const jitterAmount = clamp(effectProgress.settings.jitterAmount, 0, 1);
      const flickerAmount = clamp(effectProgress.settings.flickerAmount, 0, 1);
      const flickerSpeed = clamp(effectProgress.settings.flickerSpeed, 0, 1);
      const directionVector = getDirectionVector(effectProgress.settings.animationDirection);
      const lateralVector = {
        x: -directionVector.y,
        y: directionVector.x,
      };
      const progressScale = (0.18 + progress * 0.82) * intensity;
      const splitDistance = previewWidth * 0.007 * splitAmount * progressScale;
      const jitterDistance = previewWidth * 0.004 * jitterAmount * progressScale;
      const jitterWave = Math.sin(
        position * 36 + lyricText.id * 0.13 + effectIndex * 0.7
      );
      const flickerFrequency = 12 + Math.pow(flickerSpeed, 1.35) * 220;
      const flickerWave = Math.sin(
        position * flickerFrequency + lyricText.id * 0.17 + effectIndex * 0.9
      );
      const directionalOffset = {
        x: directionVector.x * splitDistance,
        y: directionVector.y * splitDistance,
      };
      const jitterOffset = {
        x: lateralVector.x * jitterDistance * jitterWave,
        y: lateralVector.y * jitterDistance * jitterWave,
      };
      const opacity = clamp(
        0.86 + Math.max(0, flickerWave) * flickerAmount * 0.14,
        0,
        1
      );

      return {
        xOffset: combinedState.xOffset + directionalOffset.x * 0.32 + jitterOffset.x,
        yOffset: combinedState.yOffset + directionalOffset.y * 0.32 + jitterOffset.y,
        opacity: Math.min(combinedState.opacity, opacity),
      };
    },
    {
      xOffset: 0,
      yOffset: 0,
      opacity: 1,
    }
  );
}

export function getGlitchPrimaryTextOffset(
  lyricText: LyricText,
  position: number,
  previewWidth: number
) {
  const state = getGlitchPrimaryTextState(lyricText, position, previewWidth);

  return {
    xOffset: state.xOffset,
    yOffset: state.yOffset,
  };
}

export function getGlitchPrimaryTextOpacity(
  lyricText: LyricText,
  position: number,
  previewWidth: number
) {
  return getGlitchPrimaryTextState(lyricText, position, previewWidth).opacity;
}

export function GlitchPreview({
  lyricText,
  x,
  y,
  previewWidth,
  position,
}: {
  lyricText: LyricText;
  x: number;
  y: number;
  previewWidth: number;
  position: number;
}) {
  const effects = getGlitchEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );
  const textNodeProps = useMemo(
    () => getGlitchTextNodeProps(lyricText, previewWidth),
    [
      lyricText.fontName,
      lyricText.fontSize,
      lyricText.fontWeight,
      lyricText.text,
      lyricText.width,
      previewWidth,
    ]
  );

  const passes = useMemo(() => {
    if (effects.length === 0 || !lyricText.text.trim()) {
      return [];
    }

    return effects.flatMap((effect, effectIndex) => {
      const effectProgress = getTimedEffectProgress(lyricText, position, effect);

      if (!effectProgress.hasStarted || effectProgress.hasEnded) {
        return [];
      }

      const progress = easeOutCubic(effectProgress.timelineProgress);
      const intensity = clamp(effectProgress.settings.intensity, 0.1, 1);
      const splitAmount = clamp(effectProgress.settings.splitAmount, 0, 1);
      const jitterAmount = clamp(effectProgress.settings.jitterAmount, 0, 1);
      const flickerAmount = clamp(effectProgress.settings.flickerAmount, 0, 1);
      const flickerSpeed = clamp(effectProgress.settings.flickerSpeed, 0, 1);
      const directionVector = getDirectionVector(effectProgress.settings.animationDirection);
      const lateralVector = {
        x: -directionVector.y,
        y: directionVector.x,
      };
      const progressScale = (0.2 + progress * 0.8) * intensity;
      const splitDistance = previewWidth * 0.018 * splitAmount * progressScale;
      const jitterDistance = previewWidth * 0.008 * jitterAmount * progressScale;
      const jitterWave = Math.sin(
        position * 36 + lyricText.id * 0.13 + effectIndex * 0.7
      );
      const flickerFrequency = 12 + Math.pow(flickerSpeed, 1.35) * 220;
      const flickerWave = Math.sin(
        position * flickerFrequency + lyricText.id * 0.17 + effectIndex * 0.9
      );
      const flickerOpacity =
        0.45 + (1 - flickerAmount) * 0.18 + Math.max(0, flickerWave) * flickerAmount * 0.42;
      const directionalOffset = {
        x: directionVector.x * splitDistance,
        y: directionVector.y * splitDistance,
      };
      const jitterOffset = {
        x: lateralVector.x * jitterDistance * jitterWave,
        y: lateralVector.y * jitterDistance * jitterWave,
      };

      return [
        {
          id: `${effect.id ?? buildFallbackEffectId(lyricText.id, effectIndex)}-cyan`,
          x: x - directionalOffset.x + jitterOffset.x,
          y: y - directionalOffset.y + jitterOffset.y,
          fill: GLITCH_CYAN,
          opacity: flickerOpacity,
        },
        {
          id: `${effect.id ?? buildFallbackEffectId(lyricText.id, effectIndex)}-red`,
          x: x + directionalOffset.x - jitterOffset.x,
          y: y + directionalOffset.y - jitterOffset.y,
          fill: GLITCH_RED,
          opacity: flickerOpacity * 0.96,
        },
      ];
    });
  }, [effects, lyricText.id, lyricText.text, position, previewWidth, x, y]);

  if (passes.length === 0) {
    return null;
  }

  return (
    <Group listening={false}>
      {passes.map((pass) => (
        <KonvaText
          key={pass.id}
          x={pass.x}
          y={pass.y}
          fill={pass.fill}
          opacity={pass.opacity}
          {...textNodeProps}
        />
      ))}
    </Group>
  );
}

export function GlitchSettingsSection({
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

    return DEFAULT_GLITCH_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<GlitchSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects: GlitchSettings[] = [
          ...getGlitchEffectsFromLyricText(lyricText),
        ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createGlitchEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange({
          ...nextEffects[effectIndex],
          ...patch,
        });

        return setGlitchEffectsForLyricText(lyricText, nextEffects);
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

        const nextEffects = getGlitchEffectsFromLyricText(lyricText).filter(
          (_, currentEffectIndex) => currentEffectIndex !== effectIndex
        );

        return setGlitchEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  return (
    <CustomizationSettingRow
      label={`RGB Glitch ${effectIndex + 1}`}
      value={constrainedSettings.enabled ? "On" : "Off"}
      prominentLabel={true}
      settingComponent={
        <Flex direction="column" gap={8} width={width - 20}>
          <Checkbox
            isSelected={constrainedSettings.enabled}
            onChange={(enabled) => {
              applySettings({ enabled });
            }}
          >
            Enable RGB glitch
          </Checkbox>
          <View UNSAFE_style={{ opacity: constrainedSettings.enabled ? 1 : 0.45 }}>
            <TimedEffectControls
              width={width - 20}
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
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
            <Slider
              width={width - 20}
              label="Intensity"
              labelPosition="side"
              minValue={0.1}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.intensity}
              isDisabled={!constrainedSettings.enabled}
              onChange={(intensity) => {
                applySettings({ intensity });
              }}
            />
            <Slider
              width={width - 20}
              label="Split"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.splitAmount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(splitAmount) => {
                applySettings({ splitAmount });
              }}
            />
            <Slider
              width={width - 20}
              label="Jitter"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.jitterAmount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(jitterAmount) => {
                applySettings({ jitterAmount });
              }}
            />
            <Slider
              width={width - 20}
              label="Flicker"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.flickerAmount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(flickerAmount) => {
                applySettings({ flickerAmount });
              }}
            />
            <Slider
              width={width - 20}
              label="Flicker Speed"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.flickerSpeed}
              isDisabled={!constrainedSettings.enabled}
              onChange={(flickerSpeed) => {
                applySettings({ flickerSpeed });
              }}
            />
            <DirectionPicker
              width={width - 20}
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              label="Split Direction"
              description="Sets the direction the red and cyan channel split travels." 
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