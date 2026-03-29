import { Button, Flex, View, Well, Text } from "@adobe/react-spectrum";
import { useMemo } from "react";
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

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;
const FOOTER_HEIGHT = 64;

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
      {ashFadeSettingRows}
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
      {ashFadeSettingRows}
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
      <Button
        variant="accent"
        style="fill"
        isDisabled={selectedIds.length === 0}
        onPress={addAshFadeEffect}
      >
        Add Effect
      </Button>
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
