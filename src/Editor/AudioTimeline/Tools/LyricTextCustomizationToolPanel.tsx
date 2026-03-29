import { Button, Flex, Item, Picker, View, Well, Text } from "@adobe/react-spectrum";
import { ReactElement, useMemo, useState } from "react";
import { useProjectStore } from "../../../Project/store";
import { EditingMode } from "../../../Project/types";
import { useEditorStore } from "../../store";
import {
  CenterTextPositionRow,
  FontColorSettingRow,
  FontSettingRow,
  FontSizeSettingRow,
  FontWeightSettingRow,
  ShadowBlurColorSettingRow,
  ShadowBlurSettingRow,
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
  createGlitchEffect,
  getGlitchEffectsFromLyricText,
  GlitchSettingsSection,
  setGlitchEffectsForLyricText,
} from "../../Lyrics/Effects/Glitch/GlitchEffect";

const EFFECT_TYPE_ASH_FADE = "ashFade";
const EFFECT_TYPE_GLITCH = "glitch";

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;
const FOOTER_HEIGHT = 64;

function EffectSectionDivider({ dividerKey }: { dividerKey: string }) {
  return (
    <View key={dividerKey} paddingX={10} paddingY={8}>
      <View
        height="size-25"
        UNSAFE_style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22) 10%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.22) 90%, rgba(255,255,255,0))",
          boxShadow: "0 0 18px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
          borderRadius: 999,
        }}
      />
    </View>
  );
}

function withEffectDividers(rows: ReactElement[] | null, keyPrefix: string) {
  if (!rows || rows.length <= 1) {
    return rows;
  }

  return rows.flatMap((row, index) => {
    if (index === 0) {
      return [row];
    }

    return [
      <EffectSectionDivider
        key={`${keyPrefix}-divider-${index}`}
        dividerKey={`${keyPrefix}-divider-${index}`}
      />,
      row,
    ];
  });
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
    EFFECT_TYPE_ASH_FADE
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

  const addSelectedEffect = () => {
    if (effectTypeToAdd === EFFECT_TYPE_GLITCH) {
      addGlitchEffect();
      return;
    }

    addAshFadeEffect();
  };

  const ashFadeSettingRows = (selectedLyricText || isMultipleSelected)
    ? Array.from({ length: ashFadeEffectCount }, (_, effectIndex) => (
        <AshFadeSettingsSection
          key={`${isMultipleSelected ? "multi" : "single"}-ash-fade-${effectIndex}`}
          selectedLyricText={selectedLyricText}
          selectedLyricTextIds={
            isMultipleSelected ? selectedLyricTextIdArray : undefined
          }
          effectIndex={effectIndex}
          width={width}
        />
      ))
    : null;
  const glitchSettingRows = (selectedLyricText || isMultipleSelected)
    ? Array.from({ length: glitchEffectCount }, (_, effectIndex) => (
        <GlitchSettingsSection
          key={`${isMultipleSelected ? "multi" : "single"}-glitch-${effectIndex}`}
          selectedLyricText={selectedLyricText}
          selectedLyricTextIds={
            isMultipleSelected ? selectedLyricTextIdArray : undefined
          }
          effectIndex={effectIndex}
          width={width}
        />
      ))
    : null;
  const effectSettingRows = useMemo(
    () => [...(ashFadeSettingRows ?? []), ...(glitchSettingRows ?? [])],
    [ashFadeSettingRows, glitchSettingRows]
  );
  const effectSettingRowsWithDividers = useMemo(
    () =>
      withEffectDividers(
        effectSettingRows,
        `${isMultipleSelected ? "multi" : "single"}-effect`
      ),
    [effectSettingRows, isMultipleSelected]
  );

  const singleSelectionCustomSettings = selectedLyricText ? (
    <>
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
      <FontSizeSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <FontWeightSettingRow selectedLyricText={selectedLyricText} />
      <FontSettingRow selectedLyricText={selectedLyricText} />
      <ShadowBlurSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      <ShadowBlurColorSettingRow
        selectedLyricText={selectedLyricText}
        width={width}
      />
      {effectSettingRowsWithDividers}
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
      <FontSizeSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <FontWeightSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <FontSettingRow selectedLyricTextIds={selectedLyricTextIdArray} />
      <ShadowBlurSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      <ShadowBlurColorSettingRow
        selectedLyricTextIds={selectedLyricTextIdArray}
        width={width}
      />
      {effectSettingRowsWithDividers}
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
    <View paddingX={10} paddingY={8}>
      <Flex direction="column" gap={8}>
        <Picker
          label="Effect Type"
          width="100%"
          selectedKey={effectTypeToAdd}
          onSelectionChange={(key) => {
            if (key) {
              setEffectTypeToAdd(String(key));
            }
          }}
        >
          <Item key={EFFECT_TYPE_ASH_FADE}>Spark Fade</Item>
          <Item key={EFFECT_TYPE_GLITCH}>RGB Glitch</Item>
        </Picker>
        <Button
          variant="accent"
          style="fill"
          isDisabled={selectedIds.length === 0}
          onPress={addSelectedEffect}
        >
          Add Effect
        </Button>
      </Flex>
    </View>
  ) : null;

  return (
    <View width={width} height={height} overflow={"hidden hidden"}>
      {!isMultipleSelected && selectedLyricText?.text ? (
        <Flex direction={"column"} height={height} key={selectedLyricText.id}>
          <View overflow={"hidden auto"} height={contentHeight} paddingY={10}>
            <Flex direction={"column"} gap={10}>
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
              {isVerticalProject ? verticalSelectionMessage : multiSelectionCustomSettings}
            </Flex>
          </View>
          {footer}
        </Flex>
      ) : (
        <View
          UNSAFE_style={{
            fontStyle: "italic",
            color: "lightgray",
            opacity: 0.8,
          }}
        >
          No lyric text selected
        </View>
      )}
    </View>
  );
}
