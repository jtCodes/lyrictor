import { Checkbox, Flex, RangeSlider, Slider, View } from "@adobe/react-spectrum";
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

const PARTICLE_COUNT = 26;
const MIN_EFFECT_DURATION = 0.001;
const MIN_EFFECT_PERCENT_SPAN = 0.001;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

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

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `ash-fade-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(settings?: Partial<AshFadeSettings>): AshFadeSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_ASH_FADE_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_ASH_FADE_SETTINGS.reverse,
    intensity: settings?.intensity ?? DEFAULT_ASH_FADE_SETTINGS.intensity,
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

function getLyricDuration(lyricText: LyricText) {
  return Math.max(MIN_EFFECT_DURATION, lyricText.end - lyricText.start);
}

function constrainTimingRange(
  settings: AshFadeSettings,
): AshFadeSettings {
  const startPercent = clamp(settings.startPercent, 0, 1 - MIN_EFFECT_PERCENT_SPAN);
  const endPercent = clamp(
    settings.endPercent,
    startPercent + MIN_EFFECT_PERCENT_SPAN,
    1
  );

  return {
    ...settings,
    startPercent,
    endPercent,
  };
}

function getEffectWindow(lyricText: LyricText, settings: AshFadeSettings) {
  const duration = getLyricDuration(lyricText);
  const constrainedSettings = constrainTimingRange(settings);
  const effectStart =
    lyricText.start + duration * constrainedSettings.startPercent;
  const effectEnd = Math.max(
    effectStart + MIN_EFFECT_DURATION,
    lyricText.start + duration * constrainedSettings.endPercent
  );

  return {
    effectDuration: Math.max(MIN_EFFECT_DURATION, effectEnd - effectStart),
    effectStart,
    settings: constrainedSettings,
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
) {
  return {
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getAshFadeEffectsFromLyricText(lyricText: LyricText) {
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
  const normalizedEffects = effects.map((effect, effectIndex) =>
    getNormalizedAshFadeEffect(effect, lyricText.id, effectIndex)
  );

  return {
    ...lyricText,
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
    wind: totalWind / selectedSettings.length,
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
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
    const { effectDuration, effectStart, settings } = getEffectWindow(
      lyricText,
      effect
    );
    const rawProgress = clamp((position - effectStart) / effectDuration, 0, 1);
    const timelineProgress = settings.reverse ? 1 - rawProgress : rawProgress;
    const intensity = clamp(settings.intensity, 0.1, 1);
    const fadeProgress = clamp(
      timelineProgress * (1 - intensity) +
        easeOutCubic(timelineProgress) * intensity,
      0,
      1
    );

    return Math.min(
      lowestOpacity,
      1 - fadeProgress
    );
  }, 1);
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
      const { effectDuration, effectStart, settings } = getEffectWindow(
        lyricText,
        effect
      );
      const rawProgress = clamp((position - effectStart) / effectDuration, 0, 1);
      const timelineProgress = settings.reverse ? 1 - rawProgress : rawProgress;
      const progress = easeOutCubic(timelineProgress);
      const windForce = settings.wind * 120;
      const intensity = clamp(settings.intensity, 0.1, 1);

      return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
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
        const opacity = settings.reverse
          ? Math.pow(particleProgress, 1.45) * (0.35 + intensity * 0.6)
          : Math.pow(1 - particleProgress, 1.45) * (0.35 + intensity * 0.6);
        const radius =
          0.8 + seededValue(baseSeed + 6) * (2.2 + intensity * 2.8);
        const isSpark = seededValue(baseSeed + 7) > 0.65;
        const color = isSpark
          ? "rgba(255, 245, 210, 0.95)"
          : "rgba(235, 235, 235, 0.65)";

        return {
          id: `${effect.id ?? buildFallbackEffectId(lyricText.id, effectIndex)}-${index}`,
          x: x + driftX,
          y: y + driftY,
          opacity,
          radius,
          isSpark,
          color,
          rotation: seededValue(baseSeed + 8) * 180,
        };
      }).filter(Boolean) as Array<{
        id: string;
        x: number;
        y: number;
        opacity: number;
        radius: number;
        isSpark: boolean;
        color: string;
        rotation: number;
      }>;
    });
  }, [effects, lyricText, position, previewWidth, x, y]);

  if (effects.length === 0 || particles.length === 0) {
    return null;
  }

  return (
    <Group listening={false}>
      {particles.map((particle) =>
        particle.isSpark ? (
          <Star
            key={particle.id}
            x={particle.x}
            y={particle.y}
            numPoints={4}
            innerRadius={particle.radius * 0.45}
            outerRadius={particle.radius}
            rotation={particle.rotation}
            fill={particle.color}
            opacity={particle.opacity}
          />
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
      )}
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
    () => constrainTimingRange(settings),
    [settings]
  );
  const timingRange = useMemo(
    () => ({
      start: constrainedSettings.startPercent,
      end: constrainedSettings.endPercent,
    }),
    [constrainedSettings.endPercent, constrainedSettings.startPercent]
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

        nextEffects[effectIndex] = constrainTimingRange(
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
    const startPercent = clamp(range.start, 0, 1 - MIN_EFFECT_PERCENT_SPAN);
    const endPercent = clamp(
      range.end,
      startPercent + MIN_EFFECT_PERCENT_SPAN,
      1
    );

    applySettings({
      startPercent,
      endPercent,
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
            <Checkbox
              isSelected={constrainedSettings.reverse}
              isDisabled={!constrainedSettings.enabled}
              onChange={(reverse) => {
                applySettings({ reverse });
              }}
            >
              Reverse
            </Checkbox>
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
            <RangeSlider
              width={width - 20}
              label="Timing"
              formatOptions={{ style: "percent", maximumFractionDigits: 0 }}
              minValue={0}
              maxValue={1}
              step={0.01}
              value={timingRange}
              isDisabled={!constrainedSettings.enabled}
              onChange={(range) => {
                applyTimingRange(range);
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