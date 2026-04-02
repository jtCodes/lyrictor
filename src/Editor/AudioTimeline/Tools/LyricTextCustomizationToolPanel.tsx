import { Button, Flex, Item, Picker, View, Well, Text } from "@adobe/react-spectrum";
import { useMemo, useState } from "react";
import { useProjectStore } from "../../../Project/store";
import { EditingMode } from "../../../Project/types";
import { useEditorStore } from "../../store";
import {
  AllTextPreviewOverlaySettingRow,
  CenterTextPositionRow,
  FontColorSettingRow,
  FontSettingRow,
  FontSizeSettingRow,
  FontWeightSettingRow,
  ItemRenderSettingRow,
  ItemOpacitySettingRow,
  LetterSpacingSettingRow,
  ShadowBlurColorSettingRow,
  ShadowBlurSettingRow,
  TextCaseSettingRow,
  TextFillOpacitySettingRow,
  TextGlowBlurSettingRow,
  TextGlowColorSettingRow,
  TextPositionSettingRow,
  TextReferenceTextAreaRow,
} from "./CustomizationSettingRow";
import { TextCustomizationSettingType } from "./types";
import Alert from "@spectrum-icons/workflow/Alert";
import {
  AshFadeSettingsSection,
  createAshFadeEffect,
  getAshFadeEffectsFromLyricText,
  setAshFadeEffectsForLyricText,
} from "../../Lyrics/Effects/AshFade/AshFadeEffect";
import {
  BlurSettingsSection,
  createBlurEffect,
  getBlurEffectsFromLyricText,
  setBlurEffectsForLyricText,
} from "../../Lyrics/Effects/Blur/BlurEffect";
import {
  createFloatingEffect,
  FloatingSettingsSection,
  getFloatingEffectsFromLyricText,
  setFloatingEffectsForLyricText,
} from "../../Lyrics/Effects/Floating/FloatingEffect";
import {
  createGlitchEffect,
  getGlitchEffectsFromLyricText,
  GlitchSettingsSection,
  setGlitchEffectsForLyricText,
} from "../../Lyrics/Effects/Glitch/GlitchEffect";
import {
  TEXT_EFFECT_TYPE_ASH_FADE,
  TEXT_EFFECT_TYPE_BLUR,
  TEXT_EFFECT_TYPE_FLOATING,
  TEXT_EFFECT_TYPE_GLITCH,
  TextEffect,
} from "../../Lyrics/Effects/types";

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;
const FOOTER_HEIGHT = 94;

type EffectRowDescriptor = {
  type: TextEffect["type"];
  effectIndex: number;
};

function getOrderedEffectRowDescriptorsForLyricText(
  lyricText: ReturnType<typeof useProjectStore.getState>["lyricTexts"][number]
): EffectRowDescriptor[] {
  const orderedTextEffects = lyricText.textEffects ?? [];

  if (orderedTextEffects.length > 0) {
    const effectTypeCounts: Record<TextEffect["type"], number> = {
      [TEXT_EFFECT_TYPE_ASH_FADE]: 0,
      [TEXT_EFFECT_TYPE_BLUR]: 0,
      [TEXT_EFFECT_TYPE_FLOATING]: 0,
      [TEXT_EFFECT_TYPE_GLITCH]: 0,
    };

    return orderedTextEffects.map((effect) => {
      const effectIndex = effectTypeCounts[effect.type];
      effectTypeCounts[effect.type] += 1;

      return {
        type: effect.type,
        effectIndex,
      };
    });
  }

  return getAshFadeEffectsFromLyricText(lyricText).map((_, effectIndex) => ({
    type: TEXT_EFFECT_TYPE_ASH_FADE,
    effectIndex,
  }));
}

export default function LyricTextCustomizationToolPanel({
  height,
  width,
}: {
  height: any;
  width: any;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const editingMode = useProjectStore((state) => state.editingProject?.editingMode);
  const updateLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const selectedLyricTextIdArray = useMemo(
    () => Array.from(selectedLyricTextIds),
    [selectedLyricTextIds]
  );

  const selectedLyricText = useMemo(() => {
    const isSingleSelection = selectedLyricTextIds.size === 1;
    return isSingleSelection
      ? lyricTexts.find((lyricText) => selectedLyricTextIds.has(lyricText.id))
      : undefined;
  }, [selectedLyricTextIds, lyricTexts]);

  const isMultipleSelected = useMemo(
    () => selectedLyricTextIds.size > 1,
    [selectedLyricTextIds]
  );
  const [effectTypeToAdd, setEffectTypeToAdd] = useState<string>(
    TEXT_EFFECT_TYPE_ASH_FADE
  );
  const selectedIds = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    }

    return selectedLyricTextIdArray;
  }, [selectedLyricText, selectedLyricTextIdArray]);
  const selectedLyrics = useMemo(
    () => lyricTexts.filter((lyricText) => selectedIds.includes(lyricText.id)),
    [lyricTexts, selectedIds]
  );
  const ashFadeEffectCount = useMemo(
    () =>
      selectedLyrics.reduce((maxCount, lyricText) => {
        return Math.max(maxCount, getAshFadeEffectsFromLyricText(lyricText).length);
      }, 0),
    [selectedLyrics]
  );
  const glitchEffectCount = useMemo(
    () =>
      selectedLyrics.reduce((maxCount, lyricText) => {
        return Math.max(maxCount, getGlitchEffectsFromLyricText(lyricText).length);
      }, 0),
    [selectedLyrics]
  );
  const floatingEffectCount = useMemo(
    () =>
      selectedLyrics.reduce((maxCount, lyricText) => {
        return Math.max(maxCount, getFloatingEffectsFromLyricText(lyricText).length);
      }, 0),
    [selectedLyrics]
  );
  const blurEffectCount = useMemo(
    () =>
      selectedLyrics.reduce((maxCount, lyricText) => {
        return Math.max(maxCount, getBlurEffectsFromLyricText(lyricText).length);
      }, 0),
    [selectedLyrics]
  );
  const isVerticalProject = editingMode === EditingMode.static;

  const addAshFadeEffect = () => {
    if (selectedIds.length === 0) {
      return;
    }

    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!selectedIds.includes(lyricText.id)) {
          return lyricText;
        }

        return setAshFadeEffectsForLyricText(lyricText, [
          ...getAshFadeEffectsFromLyricText(lyricText),
          createAshFadeEffect({ enabled: true }),
        ]);
      }),
      false
    );
  };

  const addGlitchEffect = () => {
    if (selectedIds.length === 0) {
      return;
    }

    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!selectedIds.includes(lyricText.id)) {
          return lyricText;
        }

        return setGlitchEffectsForLyricText(lyricText, [
          ...getGlitchEffectsFromLyricText(lyricText),
          createGlitchEffect({ enabled: true }),
        ]);
      }),
      false
    );
  };

  const addBlurEffect = () => {
    if (selectedIds.length === 0) {
      return;
    }

    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!selectedIds.includes(lyricText.id)) {
          return lyricText;
        }

        return setBlurEffectsForLyricText(lyricText, [
          ...getBlurEffectsFromLyricText(lyricText),
          createBlurEffect({ enabled: true }),
        ]);
      }),
      false
    );
  };

  const addFloatingEffect = () => {
    if (selectedIds.length === 0) {
      return;
    }

    updateLyricTexts(
      lyricTexts.map((lyricText) => {
        if (!selectedIds.includes(lyricText.id)) {
          return lyricText;
        }

        return setFloatingEffectsForLyricText(lyricText, [
          ...getFloatingEffectsFromLyricText(lyricText),
          createFloatingEffect({ enabled: true }),
        ]);
      }),
      false
    );
  };

  const addSelectedEffect = () => {
    if (effectTypeToAdd === TEXT_EFFECT_TYPE_BLUR) {
      addBlurEffect();
      return;
    }

    if (effectTypeToAdd === TEXT_EFFECT_TYPE_FLOATING) {
      addFloatingEffect();
      return;
    }

    if (effectTypeToAdd === TEXT_EFFECT_TYPE_GLITCH) {
      addGlitchEffect();
      return;
    }

    addAshFadeEffect();
  };

  const effectRowDescriptors = useMemo(() => {
    if (!selectedLyricText && !isMultipleSelected) {
      return [];
    }

    const orderedDescriptors: EffectRowDescriptor[] = [];
    const seenDescriptorKeys = new Set<string>();

    selectedLyrics.forEach((lyricText) => {
      getOrderedEffectRowDescriptorsForLyricText(lyricText).forEach(
        (descriptor) => {
          const descriptorKey = `${descriptor.type}:${descriptor.effectIndex}`;

          if (seenDescriptorKeys.has(descriptorKey)) {
            return;
          }

          seenDescriptorKeys.add(descriptorKey);
          orderedDescriptors.push(descriptor);
        }
      );
    });

    const maxEffectCounts: Array<[TextEffect["type"], number]> = [
      [TEXT_EFFECT_TYPE_ASH_FADE, ashFadeEffectCount],
      [TEXT_EFFECT_TYPE_BLUR, blurEffectCount],
      [TEXT_EFFECT_TYPE_FLOATING, floatingEffectCount],
      [TEXT_EFFECT_TYPE_GLITCH, glitchEffectCount],
    ];

    maxEffectCounts.forEach(([type, maxCount]) => {
      for (let effectIndex = 0; effectIndex < maxCount; effectIndex += 1) {
        const descriptorKey = `${type}:${effectIndex}`;

        if (seenDescriptorKeys.has(descriptorKey)) {
          continue;
        }

        seenDescriptorKeys.add(descriptorKey);
        orderedDescriptors.push({ type, effectIndex });
      }
    });

    return orderedDescriptors;
  }, [
    ashFadeEffectCount,
    blurEffectCount,
    floatingEffectCount,
    glitchEffectCount,
    isMultipleSelected,
    selectedLyricText,
    selectedLyrics,
  ]);
  const effectSettingRows = useMemo(
    () =>
      effectRowDescriptors.map(({ type, effectIndex }) => {
        const commonProps = {
          selectedLyricText,
          selectedLyricTextIds: isMultipleSelected
            ? selectedLyricTextIdArray
            : undefined,
          effectIndex,
          width,
        };

        if (type === TEXT_EFFECT_TYPE_ASH_FADE) {
          return (
            <AshFadeSettingsSection
              key={`${isMultipleSelected ? "multi" : "single"}-${type}-${effectIndex}`}
              {...commonProps}
            />
          );
        }

        if (type === TEXT_EFFECT_TYPE_BLUR) {
          return (
            <BlurSettingsSection
              key={`${isMultipleSelected ? "multi" : "single"}-${type}-${effectIndex}`}
              {...commonProps}
            />
          );
        }

        if (type === TEXT_EFFECT_TYPE_FLOATING) {
          return (
            <FloatingSettingsSection
              key={`${isMultipleSelected ? "multi" : "single"}-${type}-${effectIndex}`}
              {...commonProps}
            />
          );
        }

        return (
          <GlitchSettingsSection
            key={`${isMultipleSelected ? "multi" : "single"}-${type}-${effectIndex}`}
            {...commonProps}
          />
        );
      }),
    [
      effectRowDescriptors,
      isMultipleSelected,
      selectedLyricText,
      selectedLyricTextIdArray,
      width,
    ]
  );
  const totalEffectCount = ashFadeEffectCount + blurEffectCount + glitchEffectCount;
  const totalFloatingAwareEffectCount =
    ashFadeEffectCount +
    blurEffectCount +
    floatingEffectCount +
    glitchEffectCount;
  const effectsStatusText = useMemo(() => {
    if (selectedIds.length <= 1) {
      if (totalFloatingAwareEffectCount === 0) {
        return "No effects on this lyric";
      }

      return `${totalFloatingAwareEffectCount} effect${totalFloatingAwareEffectCount === 1 ? "" : "s"} on this lyric`;
    }

    if (totalFloatingAwareEffectCount === 0) {
      return `No effects on ${selectedIds.length} selected lyrics`;
    }

    return `${totalFloatingAwareEffectCount} effect slot${totalFloatingAwareEffectCount === 1 ? "" : "s"} across ${selectedIds.length} selected lyrics`;
  }, [selectedIds.length, totalFloatingAwareEffectCount]);

  const singleSelectionCustomSettings = selectedLyricText ? (
    <>
      <ItemRenderSettingRow selectedLyricText={selectedLyricText} />
      <ItemOpacitySettingRow selectedLyricText={selectedLyricText} />
      <CenterTextPositionRow selectedLyricText={selectedLyricText} />
      <TextPositionSettingRow
        label="X Offset"
        selectedLyricText={selectedLyricText}
        settingKey={TextCustomizationSettingType.textX}
        width={width}
      />
      <TextPositionSettingRow
        label="Y Offset"
        selectedLyricText={selectedLyricText}
        settingKey={TextCustomizationSettingType.textY}
        width={width}
      />
      <FontColorSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <TextCaseSettingRow selectedLyricText={selectedLyricText} />
      <TextFillOpacitySettingRow selectedLyricText={selectedLyricText} />
      <FontSizeSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <LetterSpacingSettingRow selectedLyricText={selectedLyricText} />
      <FontWeightSettingRow selectedLyricText={selectedLyricText} />
      <FontSettingRow selectedLyricText={selectedLyricText} />
      <ShadowBlurSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <TextGlowBlurSettingRow selectedLyricText={selectedLyricText} />
      <ShadowBlurColorSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <TextGlowColorSettingRow selectedLyricText={selectedLyricText} />
      {effectSettingRows}
    </>
  ) : null;

  const multiSelectionCustomSettings = (
    <>
      <Well UNSAFE_style={{ backgroundColor: "#300000" }}>
        <Alert aria-label="Negative Alert" color="negative" />
        <Text UNSAFE_style={{ paddingLeft: 5, paddingRight: 10 }}>
          The settings below will be applied to all{" "}
          <span style={{ fontWeight: 600 }}>
            {selectedLyricTextIds.size}
          </span>{" "}
          selected lyric texts
        </Text>
      </Well>
      <ItemRenderSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <ItemOpacitySettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <CenterTextPositionRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <TextPositionSettingRow
        label="X Offset"
        selectedLyricTextIds={selectedLyricTextIdArray}
        settingKey={TextCustomizationSettingType.textX}
        width={width}
      />
      <TextPositionSettingRow
        label="Y Offset"
        selectedLyricTextIds={selectedLyricTextIdArray}
        settingKey={TextCustomizationSettingType.textY}
        width={width}
      />
      <FontColorSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <TextCaseSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <TextFillOpacitySettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <FontSizeSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <LetterSpacingSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <FontWeightSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <FontSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <ShadowBlurSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <TextGlowBlurSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <ShadowBlurColorSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <TextGlowColorSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      {effectSettingRows}
    </>
  );

  const verticalSelectionMessage = (
    <View
      UNSAFE_style={{
        fontStyle: "italic",
        color: "lightgray",
        opacity: 0.8,
        padding: "0 10px",
      }}
    >
      Text settings are only available for a single selected lyric in vertical projects.
    </View>
  );

  const showFooter =
    selectedIds.length > 0 && !isVerticalProject && (!!selectedLyricText?.text || isMultipleSelected);
  const contentHeight = showFooter
    ? height - HEADER_HEIGHT - FOOTER_HEIGHT - 20
    : height - HEADER_HEIGHT - 20;
  const footer = showFooter ? (
    <View
      paddingX={10}
      paddingTop={8}
      paddingBottom={10}
      UNSAFE_style={{
        background: "linear-gradient(180deg, rgba(18, 20, 22, 0.72), rgba(18, 20, 22, 0.92))",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <Flex direction="column" gap={8}>
        <Flex direction="column" gap={2}>
          <Text>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.96)",
              }}
            >
              Effects
            </span>
          </Text>
          <Text>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.62)",
              }}
            >
              {effectsStatusText}
            </span>
          </Text>
        </Flex>
        <Flex gap={8} alignItems="end">
          <View flex width="100%" UNSAFE_style={{ flex: 1, minWidth: 0 }}>
            <Picker
              aria-label="Effect Type"
              width="100%"
              selectedKey={effectTypeToAdd}
              onSelectionChange={(key) => {
                if (key) {
                  setEffectTypeToAdd(String(key));
                }
              }}
            >
              <Item key={TEXT_EFFECT_TYPE_ASH_FADE}>Spark Fade</Item>
              <Item key={TEXT_EFFECT_TYPE_BLUR}>Text Blur</Item>
              <Item key={TEXT_EFFECT_TYPE_FLOATING}>Floating Motion</Item>
              <Item key={TEXT_EFFECT_TYPE_GLITCH}>RGB Glitch</Item>
            </Picker>
          </View>
          <Button
            variant="accent"
            isDisabled={selectedIds.length === 0}
            onPress={addSelectedEffect}
            UNSAFE_style={{ minWidth: 72 }}
          >
            Add
          </Button>
        </Flex>
      </Flex>
    </View>
  ) : null;

  return (
    <View width={width} height={height} overflow={"hidden hidden"}>
      {!isMultipleSelected && selectedLyricText?.text ? (
        <Flex direction={"column"} height={height} key={selectedLyricText.id}>
          <View overflow={"hidden auto"} height={contentHeight} paddingY={10}>
            <Flex direction={"column"} gap={10}>
              <AllTextPreviewOverlaySettingRow />
              <TextReferenceTextAreaRow lyricText={selectedLyricText} />
              {!isVerticalProject ? singleSelectionCustomSettings : null}
            </Flex>
          </View>
          {footer}
        </Flex>
      ) : isMultipleSelected ? (
        <Flex direction={"column"} height={height}>
          <View overflow={"hidden auto"} height={contentHeight} paddingY={10}>
            <Flex direction={"column"} gap={10}>
              <AllTextPreviewOverlaySettingRow />
              {isVerticalProject ? verticalSelectionMessage : multiSelectionCustomSettings}
            </Flex>
          </View>
          {footer}
        </Flex>
      ) : (
        <Flex direction={"column"} gap={10} UNSAFE_style={{ paddingTop: 10 }}>
          <AllTextPreviewOverlaySettingRow />
          <View
            UNSAFE_style={{
              fontStyle: "italic",
              color: "lightgray",
              opacity: 0.8,
              padding: "0 10px",
            }}
          >
            No lyric text selected
          </View>
        </Flex>
      )}
    </View>
  );
}
