import { Checkbox, Flex, Slider, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { Circle, Group, Star } from "react-konva";
import Konva from "konva";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import { TextCustomizationSettingType } from "../../../AudioTimeline/Tools/types";
import {
  DEFAULT_TEXT_PREVIEW_FONT_COLOR,
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../../types";
import { AshFadeSettings, DEFAULT_ASH_FADE_SETTINGS } from "./types";

const PARTICLE_COUNT = 26;

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

function getSettingsValue(settings?: Partial<AshFadeSettings>): AshFadeSettings {
  return {
    enabled: settings?.enabled ?? DEFAULT_ASH_FADE_SETTINGS.enabled,
    intensity: settings?.intensity ?? DEFAULT_ASH_FADE_SETTINGS.intensity,
    wind: settings?.wind ?? DEFAULT_ASH_FADE_SETTINGS.wind,
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

function getSettingsFromLyricText(lyricText: LyricText) {
  return getSettingsValue(lyricText.ashFadeSettings);
}

function getAggregateSettings(lyricTexts: LyricText[], ids: number[]) {
  const selectedSettings = lyricTexts
    .filter((lyricText) => ids.includes(lyricText.id))
    .map((lyricText) => getSettingsFromLyricText(lyricText));

  if (selectedSettings.length === 0) {
    return DEFAULT_ASH_FADE_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled)
    .length;
  const totalIntensity = selectedSettings.reduce(
    (sum, settings) => sum + settings.intensity,
    0
  );
  const totalWind = selectedSettings.reduce(
    (sum, settings) => sum + settings.wind,
    0
  );

  return {
    enabled: enabledCount >= Math.ceil(selectedSettings.length / 2),
    intensity: totalIntensity / selectedSettings.length,
    wind: totalWind / selectedSettings.length,
  };
}

function updateSettings(
  lyricTexts: LyricText[],
  ids: number[],
  patch: Partial<AshFadeSettings>
) {
  const baseSettings = getAggregateSettings(lyricTexts, ids);
  return {
    ...baseSettings,
    ...patch,
  };
}

export function getAshFadeTextOpacity(
  lyricText: LyricText,
  position: number
) {
  const settings = getSettingsFromLyricText(lyricText);

  if (!settings.enabled) {
    return 1;
  }

  const duration = Math.max(0.001, lyricText.end - lyricText.start);
  const rawProgress = clamp((position - lyricText.start) / duration, 0, 1);
  const intensity = clamp(settings.intensity, 0.1, 1);
  const fadeProgress = clamp(
    rawProgress * (1 - intensity) + easeOutCubic(rawProgress) * intensity,
    0,
    1
  );
  return 1 - fadeProgress;
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
  const settings = getSettingsFromLyricText(lyricText);

  const particles = useMemo(() => {
    if (!settings.enabled || !lyricText.text.trim()) {
      return [];
    }

    const duration = Math.max(0.001, lyricText.end - lyricText.start);
    const rawProgress = clamp((position - lyricText.start) / duration, 0, 1);
    const progress = easeOutCubic(rawProgress);
    const fontSize =
      (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth ||
      DEFAULT_TEXT_PREVIEW_FONT_SIZE;
    const textBox = measureTextBox({ lyricText, fontSize, previewWidth });
    const windForce = settings.wind * 120;
    const intensity = clamp(settings.intensity, 0.1, 1);

    return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const baseSeed = lyricText.id * 131 + index * 17;
      const offset = seededValue(baseSeed + 1) * 0.72;
      const particleProgress = clamp((progress - offset) / (1 - offset + 0.001), 0, 1);

      if (particleProgress <= 0) {
        return null;
      }

      const localX = seededValue(baseSeed + 2) * textBox.width;
      const localY = seededValue(baseSeed + 3) * textBox.height;
      const swirl = Math.sin(particleProgress * Math.PI * 2 + seededValue(baseSeed + 4) * Math.PI * 2);
      const driftX = localX + windForce * particleProgress + swirl * 10 * intensity;
      const driftY =
        localY - (14 + seededValue(baseSeed + 5) * 36) * particleProgress + swirl * 6;
      const opacity = Math.pow(1 - particleProgress, 1.45) * (0.35 + intensity * 0.6);
      const radius = 0.8 + seededValue(baseSeed + 6) * (2.2 + intensity * 2.8);
      const isSpark = seededValue(baseSeed + 7) > 0.65;
      const color = isSpark
        ? "rgba(255, 245, 210, 0.95)"
        : "rgba(235, 235, 235, 0.65)";

      return {
        id: `${lyricText.id}-${index}`,
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
  }, [lyricText, position, previewWidth, settings.enabled, settings.intensity, settings.wind, x, y]);

  if (!settings.enabled || particles.length === 0) {
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
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  width: number;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const ids = useMemo(
    () => getIds(selectedLyricText, selectedLyricTextIds),
    [selectedLyricText, selectedLyricTextIds]
  );

  const settings = useMemo(() => {
    if (selectedLyricText) {
      return getSettingsFromLyricText(selectedLyricText);
    }

    if (ids) {
      return getAggregateSettings(lyricTexts, ids);
    }

    return DEFAULT_ASH_FADE_SETTINGS;
  }, [ids, lyricTexts, selectedLyricText]);

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<AshFadeSettings>) => {
    modifyLyricTexts(
      TextCustomizationSettingType.ashFadeSettings,
      ids,
      updateSettings(lyricTexts, ids, patch)
    );
  };

  return (
    <CustomizationSettingRow
      label={"Spark Fade"}
      value={settings.enabled ? "On" : "Off"}
      settingComponent={
        <Flex direction={"column"} gap={8} width={width - 20}>
          <Checkbox
            isSelected={settings.enabled}
            onChange={(enabled) => {
              applySettings({ enabled });
            }}
          >
            Enable spark fade
          </Checkbox>
          <View UNSAFE_style={{ opacity: settings.enabled ? 1 : 0.45 }}>
            <Slider
              width={width - 20}
              label="Intensity"
              labelPosition="side"
              minValue={0.1}
              maxValue={1}
              step={0.05}
              value={settings.intensity}
              isDisabled={!settings.enabled}
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
              value={settings.wind}
              isDisabled={!settings.enabled}
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