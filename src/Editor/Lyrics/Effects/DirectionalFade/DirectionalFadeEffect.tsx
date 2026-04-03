import { Button, Checkbox, Flex, Item, Picker, View } from "@adobe/react-spectrum";
import Konva from "konva";
import { useMemo } from "react";
import { useProjectStore } from "../../../../Project/store";
import { CustomizationSettingRow } from "../../../AudioTimeline/Tools/CustomizationSettingRow";
import {
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../../types";
import { isSafariBrowser } from "../../../../utils";
import { DirectionPicker } from "../DirectionPicker";
import { averageDirectionDegrees, getDirectionVector } from "../direction";
import { getTextEffectsByType, replaceTextEffectsByType } from "../effectCollection";
import { EffectSlider } from "../EffectSlider";
import {
  clamp,
  constrainTimedEffectRange,
  easeOutCubic,
  getTimedEffectProgress,
} from "../shared";
import { TimedEffectControls } from "../TimedEffectControls";
import {
  DirectionalFadeTextEffect,
  TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
} from "../types";
import {
  DEFAULT_DIRECTIONAL_FADE_SETTINGS,
  DIRECTIONAL_FADE_EASING_EASE_OUT,
  DIRECTIONAL_FADE_EASING_LINEAR,
  DirectionalFadeEasing,
  DirectionalFadeSettings,
} from "./types";

type TextBoxMeasurement = {
  width: number;
  height: number;
};

type DirectionalFadeRenderProps =
  | {
      isFullyFaded: true;
      opacityMultiplier: 0;
    }
  | {
      isFullyFaded?: false;
      opacityMultiplier?: number;
      fillPriority?: "linear-gradient";
      fillLinearGradientStartPoint?: { x: number; y: number };
      fillLinearGradientEndPoint?: { x: number; y: number };
      fillLinearGradientColorStops?: Array<number | string>;
    };

const measurementCache = new Map<string, TextBoxMeasurement>();
const COMPLETED_DIRECTIONAL_FADE_RENDER_PROPS = {
  opacityMultiplier: 0,
  isFullyFaded: true,
} as const;

function buildFallbackEffectId(lyricTextId: number, effectIndex: number) {
  return `directional-fade-${lyricTextId}-${effectIndex}`;
}

function getSettingsValue(
  settings?: Partial<DirectionalFadeSettings>
): DirectionalFadeSettings {
  return {
    id: settings?.id,
    enabled: settings?.enabled ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.enabled,
    reverse: settings?.reverse ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.reverse,
    amount: settings?.amount ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.amount,
    softness: settings?.softness ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.softness,
    alphaFade:
      settings?.alphaFade ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.alphaFade,
    easing: settings?.easing ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.easing,
    speed: settings?.speed ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.speed,
    animationDirection:
      settings?.animationDirection ??
      DEFAULT_DIRECTIONAL_FADE_SETTINGS.animationDirection,
    startPercent:
      settings?.startPercent ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.startPercent,
    endPercent:
      settings?.endPercent ?? DEFAULT_DIRECTIONAL_FADE_SETTINGS.endPercent,
  };
}

export function createDirectionalFadeEffect(
  settings?: Partial<DirectionalFadeSettings>
): DirectionalFadeSettings {
  return {
    ...getSettingsValue(settings),
    id:
      settings?.id ??
      `directional-fade-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
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

function getNormalizedDirectionalFadeEffect(
  settings: Partial<DirectionalFadeSettings> | undefined,
  lyricTextId: number,
  effectIndex: number
): DirectionalFadeTextEffect {
  return {
    type: TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
    ...getSettingsValue(settings),
    id: settings?.id ?? buildFallbackEffectId(lyricTextId, effectIndex),
  };
}

export function getDirectionalFadeEffectsFromLyricText(lyricText: LyricText) {
  const genericEffects = getTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_DIRECTIONAL_FADE
  );

  return genericEffects.map((effect, effectIndex) =>
    getSettingsValue(
      getNormalizedDirectionalFadeEffect(effect, lyricText.id, effectIndex)
    )
  );
}

export function setDirectionalFadeEffectsForLyricText(
  lyricText: LyricText,
  effects: DirectionalFadeSettings[]
) {
  const normalizedEffects = effects.map((effect, effectIndex) =>
    getNormalizedDirectionalFadeEffect(effect, lyricText.id, effectIndex)
  );

  return replaceTextEffectsByType(
    lyricText,
    TEXT_EFFECT_TYPE_DIRECTIONAL_FADE,
    normalizedEffects
  );
}

function getEffectAtIndex(lyricText: LyricText, effectIndex: number) {
  return (
    getDirectionalFadeEffectsFromLyricText(lyricText)[effectIndex] ??
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
    return DEFAULT_DIRECTIONAL_FADE_SETTINGS;
  }

  const enabledCount = selectedSettings.filter((settings) => settings.enabled).length;
  const reverseCount = selectedSettings.filter((settings) => settings.reverse).length;
  const totalAmount = selectedSettings.reduce(
    (sum, settings) => sum + settings.amount,
    0
  );
  const totalSoftness = selectedSettings.reduce(
    (sum, settings) => sum + settings.softness,
    0
  );
  const totalAlphaFade = selectedSettings.reduce(
    (sum, settings) => sum + settings.alphaFade,
    0
  );
  const totalSpeed = selectedSettings.reduce(
    (sum, settings) => sum + settings.speed,
    0
  );
  const linearCount = selectedSettings.filter(
    (settings) => settings.easing === DIRECTIONAL_FADE_EASING_LINEAR
  ).length;
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
    softness: totalSoftness / selectedSettings.length,
    alphaFade: totalAlphaFade / selectedSettings.length,
    speed: totalSpeed / selectedSettings.length,
    easing:
      linearCount >= Math.ceil(selectedSettings.length / 2)
        ? DIRECTIONAL_FADE_EASING_LINEAR
        : DIRECTIONAL_FADE_EASING_EASE_OUT,
    animationDirection: averageDirectionDegrees(
      selectedSettings,
      DEFAULT_DIRECTIONAL_FADE_SETTINGS.animationDirection
    ),
    startPercent: totalStartPercent / selectedSettings.length,
    endPercent: totalEndPercent / selectedSettings.length,
  };
}

function getDirectionalFadeTextNodeProps(lyricText: LyricText, previewWidth: number) {
  const resolvedFontSize =
    (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth ||
    DEFAULT_TEXT_PREVIEW_FONT_SIZE;

  return {
    text: lyricText.text,
    fontStyle: String(lyricText.fontWeight ?? 400),
    fontFamily: lyricText.fontName,
    fontSize: resolvedFontSize,
    letterSpacing: ((lyricText.letterSpacing ?? 0) / 1000) * previewWidth,
    width: lyricText.width
      ? Math.min(previewWidth, lyricText.width * previewWidth)
      : undefined,
    perfectDrawEnabled: false,
    listening: false,
  } as const;
}

function getMeasurementCacheKey(
  lyricText: LyricText,
  textNodeProps: ReturnType<typeof getDirectionalFadeTextNodeProps>
) {
  return [
    lyricText.text,
    textNodeProps.fontStyle,
    textNodeProps.fontFamily,
    textNodeProps.fontSize,
    textNodeProps.letterSpacing,
    textNodeProps.width ?? "auto",
  ].join("::");
}

function measureTextBox(
  lyricText: LyricText,
  textNodeProps: ReturnType<typeof getDirectionalFadeTextNodeProps>
) {
  const cacheKey = getMeasurementCacheKey(lyricText, textNodeProps);
  const cachedMeasurement = measurementCache.get(cacheKey);

  if (cachedMeasurement) {
    return cachedMeasurement;
  }

  const textNode = new Konva.Text(textNodeProps);
  const measurement = {
    width: Math.max(1, textNode.width()),
    height: Math.max(textNodeProps.fontSize, textNode.height()),
  };

  measurementCache.set(cacheKey, measurement);

  return measurement;
}

function toRgbaString(
  color:
    | {
        r: number;
        g: number;
        b: number;
      }
    | undefined,
  opacity: number
) {
  if (!color) {
    return `rgba(255, 255, 255, ${opacity})`;
  }

  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function dot(point: { x: number; y: number }, normal: { x: number; y: number }) {
  return point.x * normal.x + point.y * normal.y;
}

function getDirectionalFadeProgress(
  settings: DirectionalFadeSettings,
  rawProgress: number
) {
  const clampedRawProgress = clamp(rawProgress, 0, 1);
  const directionalProgress = settings.reverse
    ? 1 - clampedRawProgress
    : clampedRawProgress;
  const curvedProgress =
    settings.easing === DIRECTIONAL_FADE_EASING_LINEAR
      ? directionalProgress
      : easeOutCubic(directionalProgress);
  const signedSpeed = clamp(settings.speed, -5, 5);
  const speedScale =
    signedSpeed >= 0
      ? 1 + signedSpeed
      : 1 / (1 + Math.abs(signedSpeed));

  return settings.reverse
    ? 1 - clamp((1 - curvedProgress) * speedScale, 0, 1)
    : clamp(curvedProgress * speedScale, 0, 1);
}

function getDirectionalFadeState(lyricText: LyricText, position: number) {
  const effects = getDirectionalFadeEffectsFromLyricText(lyricText).filter(
    (effect) => effect.enabled
  );

  if (effects.length === 0) {
    return undefined;
  }

  return effects.reduce<
    | {
        amount: number;
        fadeProgress: number;
        softness: number;
        visibleRatio: number;
        settings: DirectionalFadeSettings;
      }
    | undefined
  >((dominantEffect, effect) => {
    const effectProgress = getTimedEffectProgress(lyricText, position, effect);
    const progress = getDirectionalFadeProgress(
      effectProgress.settings,
      effectProgress.rawProgress
    );
    const amount = clamp(effectProgress.settings.amount, 0, 1);
    const fadeStart = (1 - amount) * 0.55;
    const wipeProgress = clamp(
      (progress - fadeStart) / Math.max(0.0001, 1 - fadeStart),
      0,
      1
    );
    const visibleRatio = clamp(1 - wipeProgress, 0, 1);
    const candidate = {
      amount,
      fadeProgress: progress,
      softness: clamp(effectProgress.settings.softness, 0.05, 1),
      visibleRatio,
      settings: effectProgress.settings,
    };

    if (!dominantEffect || candidate.visibleRatio < dominantEffect.visibleRatio) {
      return candidate;
    }

    return dominantEffect;
  }, undefined);
}

export function getDirectionalFadeTextRenderProps(
  lyricText: LyricText,
  position: number,
  previewWidth: number
): DirectionalFadeRenderProps {
  const state = getDirectionalFadeState(lyricText, position);

  if (!state || !lyricText.text.trim()) {
    return {};
  }

  const textNodeProps = getDirectionalFadeTextNodeProps(lyricText, previewWidth);
  const textBox = measureTextBox(lyricText, textNodeProps);
  const directionVector = getDirectionVector(state.settings.animationDirection);
  const corners = [
    { x: 0, y: 0 },
    { x: textBox.width, y: 0 },
    { x: textBox.width, y: textBox.height },
    { x: 0, y: textBox.height },
  ];
  const projections = corners.map((corner) => dot(corner, directionVector));
  const minProjection = Math.min(...projections);
  const maxProjection = Math.max(...projections);
  const projectionSpan = Math.max(0.0001, maxProjection - minProjection);
  const resolvedVisibleRatio = isSafariBrowser
    ? Math.round(state.visibleRatio * 128) / 128
    : state.visibleRatio;
  const visibleStop = clamp(resolvedVisibleRatio, 0, 1);
  const featherSpan = projectionSpan * (0.08 + state.softness * 0.28);
  const featherStop = featherSpan / projectionSpan;
  const fadeStartStop = clamp(visibleStop - featherStop, 0, 1);
  const fadeEndStop = clamp(visibleStop + featherStop * 0.18, fadeStartStop, 1);
  const opaqueColor = toRgbaString(
    lyricText.fontColor,
    lyricText.textFillOpacity ?? 1
  );
  const featherColor = toRgbaString(
    lyricText.fontColor,
    (lyricText.textFillOpacity ?? 1) * 0.04
  );
  const transparentColor = toRgbaString(lyricText.fontColor, 0);
  const opacityMultiplier =
    1 - clamp(state.fadeProgress, 0, 1) * clamp(state.settings.alphaFade, 0, 1);

  if (visibleStop <= 0.001 || opacityMultiplier <= 0.001) {
    return COMPLETED_DIRECTIONAL_FADE_RENDER_PROPS;
  }

  return {
    opacityMultiplier,
    fillPriority: "linear-gradient" as const,
    fillLinearGradientStartPoint: {
      x: directionVector.x * minProjection,
      y: directionVector.y * minProjection,
    },
    fillLinearGradientEndPoint: {
      x: directionVector.x * maxProjection,
      y: directionVector.y * maxProjection,
    },
    fillLinearGradientColorStops: [
      0,
      opaqueColor,
      fadeStartStop,
      opaqueColor,
      visibleStop,
      featherColor,
      fadeEndStop,
      transparentColor,
      1,
      transparentColor,
    ],
  };
}

export function DirectionalFadeSettingsSection({
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

    return DEFAULT_DIRECTIONAL_FADE_SETTINGS;
  }, [effectIndex, ids, lyricTexts, selectedLyricText]);

  const constrainedSettings = useMemo(
    () => constrainTimedEffectRange(settings),
    [settings]
  );

  if (!ids || ids.length === 0) {
    return null;
  }

  const applySettings = (patch: Partial<DirectionalFadeSettings>) => {
    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!ids.includes(lyricText.id)) {
          return lyricText;
        }

        const nextEffects: DirectionalFadeSettings[] = [
          ...getDirectionalFadeEffectsFromLyricText(lyricText),
        ];

        while (nextEffects.length <= effectIndex) {
          nextEffects.push(createDirectionalFadeEffect());
        }

        nextEffects[effectIndex] = constrainTimedEffectRange({
          ...nextEffects[effectIndex],
          ...patch,
        });

        return setDirectionalFadeEffectsForLyricText(lyricText, nextEffects);
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

        const nextEffects = getDirectionalFadeEffectsFromLyricText(lyricText).filter(
          (_, currentEffectIndex) => currentEffectIndex !== effectIndex
        );

        return setDirectionalFadeEffectsForLyricText(lyricText, nextEffects);
      }),
      false
    );
  };

  return (
    <CustomizationSettingRow
      label={`Directional Fade ${effectIndex + 1}`}
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
            Enable directional fade
          </Checkbox>
          <View width="100%" UNSAFE_style={{ opacity: constrainedSettings.enabled ? 1 : 0.45, minWidth: 0 }}>
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
              onReverseChange={(reverse) => {
                applySettings({ reverse });
              }}
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
              label="Softness"
              minValue={0.05}
              maxValue={1}
              step={0.05}
              value={constrainedSettings.softness}
              isDisabled={!constrainedSettings.enabled}
              onChange={(softness) => {
                applySettings({ softness });
              }}
            />
            <EffectSlider
              label="Alpha Fade"
              minValue={0}
              maxValue={1}
              step={0.01}
              value={constrainedSettings.alphaFade}
              isDisabled={!constrainedSettings.enabled}
              onChange={(alphaFade) => {
                applySettings({ alphaFade });
              }}
            />
            <EffectSlider
              label="Speed"
              minValue={-5}
              maxValue={5}
              step={0.01}
              value={constrainedSettings.speed}
              isDisabled={!constrainedSettings.enabled}
              onChange={(speed) => {
                applySettings({ speed });
              }}
            />
            <Picker
              label="Fade Curve"
              width="100%"
              selectedKey={constrainedSettings.easing}
              isDisabled={!constrainedSettings.enabled}
              onSelectionChange={(key) => {
                if (key) {
                  applySettings({ easing: key as DirectionalFadeEasing });
                }
              }}
            >
              <Item key={DIRECTIONAL_FADE_EASING_EASE_OUT}>Ease Out</Item>
              <Item key={DIRECTIONAL_FADE_EASING_LINEAR}>Linear</Item>
            </Picker>
            <DirectionPicker
              width="100%"
              settings={constrainedSettings}
              isDisabled={!constrainedSettings.enabled}
              label="Fade Direction"
              description="Sets the direction the text gets erased from."
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