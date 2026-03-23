import { Flex, View, Well, Text } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../../Project/store";
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

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;

export default function LyricTextCustomizationToolPanel({
  height,
  width,
}: {
  height: any;
  width: any;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const selectedLyricTextIdArray = useMemo(
    () => Array.from(selectedLyricTextIds),
    [selectedLyricTextIds]
  );

  const selectedLyricText = useMemo(() => {
    const isSingleSelection = selectedLyricTextIds.size === 1;
    const selectedFromTimeline = isSingleSelection
      ? lyricTexts.find((lyricText) => selectedLyricTextIds.has(lyricText.id))
      : undefined;

    return selectedFromTimeline;
  }, [selectedLyricTextIds, lyricTexts]);

  const isMultipleSelected = useMemo(
    () => selectedLyricTextIds.size > 1,
    [selectedLyricTextIds]
  );

  return (
    <View width={width} height={height} overflow={"hidden hidden"}>
      {!isMultipleSelected && selectedLyricText?.text ? (
        <View
          overflow={"hidden auto"}
          height={height - HEADER_HEIGHT - 20}
          paddingY={10}
          key={selectedLyricText.id}
        >
          <Flex direction={"column"} gap={10}>
            <TextReferenceTextAreaRow lyricText={selectedLyricText} />
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
          </Flex>
        </View>
      ) : isMultipleSelected ? (
        <View
          overflow={"hidden auto"}
          height={height - HEADER_HEIGHT - 20}
          paddingY={10}
        >
          <Flex direction={"column"} gap={10}>
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

            <CenterTextPositionRow
              selectedLyricTextIds={selectedLyricTextIdArray}
            />
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
            <FontWeightSettingRow
              selectedLyricTextIds={selectedLyricTextIdArray}
            />
            <FontSettingRow
              selectedLyricTextIds={selectedLyricTextIdArray}
            />
            <ShadowBlurSettingRow
              selectedLyricTextIds={selectedLyricTextIdArray}
              width={width}
            />
            <ShadowBlurColorSettingRow
              selectedLyricTextIds={selectedLyricTextIdArray}
              width={width}
            />
          </Flex>
        </View>
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
