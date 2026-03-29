import { Checkbox, Flex, Slider, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { Circle, Group, Star } from "react-konva";
import Konva from "konva";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import {
  DEFAULT_TEXT_PREVIEW_FONT_COLOR,
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../../types";
import { AshFadeSettings, DEFAULT_ASH_FADE_SETTINGS } from "./types";
import {
  clamp,
  constrainTimedEffectRange,
  easeOutCubic,
  getTimedEffectProgress,
} from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import { AshFadeTextEffect, TEXT_EFFECT_TYPE_ASH_FADE } from "../types";

const PARTICLE_COUNT = 26;
const MAX_SPARKLE_AMOUNT = 3;

function seededValue(seed: number) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function rgbToRgbaString(color?: {
  r: number;
  g: number;
  b: number;
  a?: number;
}) {
  if (!color) {
    return DEFAULT_TEXT_PREVIEW_FONT_COLOR;
  }

  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
}

function transparentRgbToRgbaString(color?: {
  r: number;
  g: number;
  b: number;
}) {
  if (!color) {
    return "rgba(255, 255, 255, 0)";
  }

  return `rgba(${color.r}, ${color.g}, ${color.b}, 0)`;
}

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `ash-fade-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(settings?: Partial<AshFadeSettings>): AshFadeSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_ASH_FADE_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_ASH_FADE_SETTINGS.reverse,
    intensity: settings?.intensity ?? DEFAULT_ASH_FADE_SETTINGS.intensity,
    textFade: settings?.textFade ?? DEFAULT_ASH_FADE_SETTINGS.textFade,
    sparkleAmount:
      settings?.sparkleAmount ?? DEFAULT_ASH_FADE_SETTINGS.sparkleAmount,
    particleSharpness:
      settings?.particleSharpness ?? DEFAULT_ASH_FADE_SETTINGS.particleSharpness,
    wind: settings?.wind ?? DEFAULT_ASH_FADE_SETTINGS.wind,
    startPercent:
      settings?.startPercent ?? DEFAULT_ASH_FADE_SETTINGS.startPercent,
    endPercent: settings?.endPercent ?? DEFAULT_ASH_FADE_SETTINGS.endPercent,
  };
}

export function createAshFadeEffect(
  settings?: Partial<AshFadeSettings>
): AshFadeSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `ash-fade-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
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

function getNormalizedAshFadeEffect(
  settings: Partial<AshFadeSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): AshFadeTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_ASH_FADE,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getAshFadeEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(lyricText, TEXT_EFFECT_TYPE_ASH_FADE);

  if (genericEffects.length > 0) {
    return genericEffects.map((effect, effectIndex) =>
      getSettingsValue(
        getNormalizedAshFadeEffect(effect, lyricText.id, effectIndex)
      )
    );
  }

  if (lyricText.ashFadeEffects && lyricText.ashFadeEffects.length > 0) {
    return lyricText.ashFadeEffects.map((effect, effectIndex) =>
      getNormalizedAshFadeEffect(effect, lyricText.id, effectIndex)
    );
  }

  if (lyricText.ashFadeSettings) {
    return [getNormalizedAshFadeEffect(lyricText.ashFadeSettings, lyricText.id, 0)];
  }

  return [];
}

export function setAshFadeEffectsForLyricText(
  lyricText: LyricText,
  effects: AshFadeSettings[]
) {
  const normalizedGenericEffects = effects.map((effect, effectIndex) =>
    getNormalizedAshFadeEffect(effect, lyricText.id, effectIndex)
  );
  const normalizedEffects = normalizedGenericEffects.map((effect) =>
    getSettingsValue(effect)
  );

  const lyricTextWithGenericEffects = replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_ASH_FADE,
    normalizedGenericEffects
  );

  return {
    ...lyricTextWithGenericEffects,
    ashFadeEffects: normalizedEffects,
    ashFadeSettings: normalizedEffects[0],
  };
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getAshFadeEffectsFromLyricText(lyricText)[effectIndex] ??
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
    return DEFAULT_ASH_FADE_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled)
    .length;
  const reverseCount = selectedSettings.filter((settings) => settings.reverse)
    .length;
  const totalIntensity = selectedSettings.reduce(
    (sum, settings) => sum + settings.intensity,
    0
  );
  const totalTextFade = selectedSettings.reduce(
    (sum, settings) => sum + settings.textFade,
    0
  );
  const totalSparkleAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.sparkleAmount,
    0
  );
  const totalParticleSharpness = selectedSettings.reduce(
    (sum, settings) => sum + settings.particleSharpness,
    0
  );
  const totalWind = selectedSettings.reduce(
    (sum, settings) => sum + settings.wind,
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
    textFade: totalTextFade / selectedSettings.length,
    sparkleAmount: totalSparkleAmount / selectedSettings.length,
    particleSharpness: totalParticleSharpness / selectedSettings.length,
    wind: totalWind / selectedSettings.length,
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

function getEffectFadeProgress(
  lyricText: LyricText,
  position: number,
  effect: AshFadeSettings
) {
  const effectProgress = getTimedEffectProgress(
    lyricText,
    position,
    effect
  );
  const intensity = clamp(effectProgress.settings.intensity, 0.1, 1);
  const textFade = clamp(effectProgress.settings.textFade, 0, 1);
  const fadeProgress = clamp(
    effectProgress.timelineProgress * (1 - intensity) +
      easeOutCubic(effectProgress.timelineProgress) * intensity,
    0,
    1
  );

  return {
    ...effectProgress,
    fadeProgress,
    opacity: 1 - fadeProgress * textFade,
  };
}

function getDominantAshFadeEffect(lyricText: LyricText, position: number) {
  const effects = getAshFadeEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return undefined;
  }

  return effects.reduce<
    | {
        fadeProgress: number;
        opacity: number;
        rawProgress: number;
        settings: AshFadeSettings;
      }
    | undefined
  >((dominantEffect, effect) => {
    const effectProgress = getEffectFadeProgress(lyricText, position, effect);

    if (!dominantEffect || effectProgress.opacity < dominantEffect.opacity) {
      return effectProgress;
    }

    return dominantEffect;
  }, undefined);
}

export function getAshFadeTextOpacity(
  lyricText: LyricText,
  position: number
) {
  const effects = getAshFadeEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return 1;
  }

  return effects.reduce((lowestOpacity, effect) => {
    return Math.min(
      lowestOpacity,
      getEffectFadeProgress(lyricText, position, effect).opacity
    );
  }, 1);
}

export function getAshFadeTextRenderProps(
  lyricText: LyricText,
  position: number,
  previewWidth: number
) {
  const dominantEffect = getDominantAshFadeEffect(lyricText, position);
  const baseFill = rgbToRgbaString(lyricText.fontColor);

  if (!dominantEffect) {
    return {
      fill: baseFill,
    };
  }

  const visibleRatio = clamp(dominantEffect.opacity, 0, 1);

  if (visibleRatio >= 0.995) {
    return {
      fill: baseFill,
    };
  }

  const fontSize =
    (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth ||
    DEFAULT_TEXT_PREVIEW_FONT_SIZE;
  const textBox = measureTextBox({ lyricText, fontSize, previewWidth });
  const transparentFill = transparentRgbToRgbaString(lyricText.fontColor);
  const edge = clamp(visibleRatio, 0, 1);
  const feather = 0.08;
  const gradientStops = [
    0,
    baseFill,
    Math.max(0, edge - feather),
    baseFill,
    Math.min(1, edge + feather),
    transparentFill,
    1,
    transparentFill,
  ];

  return {
    fillPriority: "linear-gradient" as const,
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: Math.max(1, textBox.width), y: 0 },
    fillLinearGradientColorStops: gradientStops,
  };
}

function measureTextBox({
  lyricText,
  fontSize,
  previewWidth,
}: {
  lyricText: LyricText;
  fontSize: number;
  previewWidth: number;
}) {
  const textNode = new Konva.Text({
    text: lyricText.text,
    fontSize,
    fontStyle: String(lyricText.fontWeight ?? 400),
    fontFamily: lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME,
    width: lyricText.width
      ? Math.min(previewWidth, lyricText.width * previewWidth)
      : undefined,
  });

  return {
    width: Math.max(1, textNode.width()),
    height: Math.max(fontSize, textNode.height()),
  };
}

export function AshFadePreview({
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
  const effects = getAshFadeEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  const particles = useMemo(() => {
    if (effects.length === 0 || !lyricText.text.trim()) {
      return [];
    }

    const fontSize =
      (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth ||
      DEFAULT_TEXT_PREVIEW_FONT_SIZE;
    const textBox = measureTextBox({ lyricText, fontSize, previewWidth });

    return effects.flatMap((effect, effectIndex) => {
      const effectProgress = getTimedEffectProgress(
        lyricText,
        position,
        effect
      );
      const progress = easeOutCubic(effectProgress.timelineProgress);
      const windForce = effectProgress.settings.wind * 120;
      const intensity = clamp(effectProgress.settings.intensity, 0.1, 1);
      const sparkleAmount = clamp(
        effectProgress.settings.sparkleAmount,
        0,
        MAX_SPARKLE_AMOUNT
      );
      const particleSharpness = clamp(
        effectProgress.settings.particleSharpness,
        0,
        1
      );
      const sparkleBoost = Math.pow(sparkleAmount, 1.7);
      const particleCount =
        PARTICLE_COUNT +
        Math.round(
          PARTICLE_COUNT * sparkleBoost * 1.8
        );
      const sparkleChance = clamp(0.18 + sparkleBoost * 0.22, 0, 0.96);

      return Array.from({ length: particleCount }, (_, index) => {
        const baseSeed = lyricText.id * 131 + effectIndex * 1009 + index * 17;
        const offset = seededValue(baseSeed + 1) * 0.72;
        const particleProgress = clamp(
          (progress - offset) / (1 - offset + 0.001),
          0,
          1
        );

        if (particleProgress <= 0) {
          return null;
        }

        const localX = seededValue(baseSeed + 2) * textBox.width;
        const localY = seededValue(baseSeed + 3) * textBox.height;
        const swirl = Math.sin(
          particleProgress * Math.PI * 2 +
            seededValue(baseSeed + 4) * Math.PI * 2
        );
        const driftX =
          localX + windForce * particleProgress + swirl * 10 * intensity;
        const driftY =
          localY -
          (14 + seededValue(baseSeed + 5) * 36) * particleProgress +
          swirl * 6;
        const opacity = effectProgress.settings.reverse
          ? Math.pow(particleProgress, 1.45) * (0.35 + intensity * 0.6)
          : Math.pow(1 - particleProgress, 1.45) * (0.35 + intensity * 0.6);
        const radius =
          0.45 + seededValue(baseSeed + 6) * (0.9 + intensity * 1.35);
        const isSpark = seededValue(baseSeed + 7) < sparkleChance;
        const shimmer = seededValue(baseSeed + 9);
        const pointCount = particleSharpness > 0.72 ? 6 : shimmer > 0.55 ? 4 : 5;
        const innerRadius = radius * (0.5 - particleSharpness * 0.34);
        const outerRadius = radius * (0.9 + particleSharpness * 0.55);
        const coreRadius = radius * (0.34 - particleSharpness * 0.16);

        return {
          id: `${effect.id ?? buildFallbackEffectId(lyricText.id, effectIndex)}-${index}`,
          x: x + driftX,
          y: y + driftY,
          opacity: isSpark
            ? Math.min(1, opacity * (1 + sparkleBoost * 0.18))
            : opacity * (0.82 + sparkleAmount * 0.05),
          radius: isSpark
            ? radius * (1 + sparkleBoost * 0.1)
            : radius * (0.9 + sparkleAmount * 0.06),
          isSpark,
          color: isSpark ? "rgba(255, 255, 255, 0.98)" : "rgba(185, 185, 185, 0.52)",
          coreColor: isSpark
            ? "rgba(255, 255, 255, 0.98)"
            : "rgba(0, 0, 0, 0)",
          rotation: seededValue(baseSeed + 8) * 180,
          pointCount,
          innerRadius,
          outerRadius,
          coreRadius,
        };
      }).filter(Boolean) as Array<{
        id: string;
        x: number;
        y: number;
        opacity: number;
        radius: number;
        isSpark: boolean;
        color: string;
        coreColor: string;
        rotation: number;
        pointCount: number;
        innerRadius: number;
        outerRadius: number;
        coreRadius: number;
      }>;
    });
  }, [effects, lyricText, position, previewWidth, x, y]);

  if (effects.length === 0 || particles.length === 0) {
    return null;
  }

  return (
    <Group listening={false}>
      {particles.map((particle) => (
        particle.isSpark ? (
          <Group
            key={particle.id}
            x={particle.x}
            y={particle.y}
            rotation={particle.rotation}
            opacity={particle.opacity}
          >
            <Star
              numPoints={particle.pointCount}
              innerRadius={particle.innerRadius}
              outerRadius={particle.outerRadius}
              fill={particle.color}
              shadowColor={particle.color}
              shadowBlur={particle.radius * 2.4}
              shadowOpacity={0.45}
            />
            <Circle
              radius={particle.coreRadius}
              fill={particle.coreColor}
            />
          </Group>
        ) : (
          <Circle
            key={particle.id}
            x={particle.x}
            y={particle.y}
            radius={particle.radius}
            fill={particle.color}
            opacity={particle.opacity}
          />
        )
      ))}
    </Group>
  );
}

export function AshFadeSettingsSection({
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

    return DEFAULT_ASH_FADE_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<AshFadeSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

          const nextEffects: AshFadeSettings[] = [
            ...getAshFadeEffectsFromLyricText(lyricText),
          ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createAshFadeEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange(
          {
            ...nextEffects[effectIndex],
            ...patch,
          }
        );

        return setAshFadeEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };
  const applyTimingRange = (range: { start: number; end: number }) => {
    applySettings({
      startPercent: range.start,
      endPercent: range.end,
    });
  };

  return (
    <CustomizationSettingRow
      label={`Spark Fade ${effectIndex + 1}`}
      value={constrainedSettings.enabled ? "On" : "Off"}
      settingComponent={
        <Flex direction={"column"} gap={8} width={width - 20}>
          <Checkbox
            isSelected={constrainedSettings.enabled}
            onChange={(enabled) => {
              applySettings({ enabled });
            }}
          >
            Enable spark fade
          </Checkbox>
          <View UNSAFE_style={{ opacity: constrainedSettings.enabled ? 1 : 0.45 }}>
            <TimedEffectControls
              width={width - 20}
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              onTimingChange={applyTimingRange}
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
              label="Text Fade"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.textFade}
              isDisabled={!constrainedSettings.enabled}
              onChange={(textFade) => {
                applySettings({ textFade });
              }}
            />
            <Slider
              width={width - 20}
              label="Sparkle Amount"
              labelPosition="side"
              minValue={0}
              maxValue={MAX_SPARKLE_AMOUNT}
              step={0.1}
              value={constrainedSettings.sparkleAmount}
              isDisabled={!constrainedSettings.enabled}
              onChange={(sparkleAmount) => {
                applySettings({ sparkleAmount });
              }}
            />
            <Slider
              width={width - 20}
              label="Particle Sharpness"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.particleSharpness}
              isDisabled={!constrainedSettings.enabled}
              onChange={(particleSharpness) => {
                applySettings({ particleSharpness });
              }}
            />
            <Slider
              width={width - 20}
              label="Wind"
              labelPosition="side"
              minValue={0}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.wind}
              isDisabled={!constrainedSettings.enabled}
              onChange={(wind) => {
                applySettings({ wind });
              }}
            />
          </View>
        </Flex>
      }
    />
  );
}

export function getAshFadeFill(lyricText: LyricText) {
  return rgbToRgbaString(lyricText.fontColor);
}