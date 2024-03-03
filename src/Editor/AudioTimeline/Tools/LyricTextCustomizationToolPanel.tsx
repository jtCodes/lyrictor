import {
  View,
  Text,
  RangeSlider,
  Slider,
  TextArea,
} from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import {
  FontSettingRow,
  FontSizeSettingRow,
  FontWeightSettingRow,
  TextReferenceTextAreaRow,
} from "./CustomizationSettingRow";

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;

export default function LyricTextCustomizationToolPanel({
  height,
}: {
  height: number;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const selectedPreviewTextIds = useEditorStore(
    (state) => state.selectedPreviewTextIds
  );

  const selectedLyricText = useMemo(
    () =>
      lyricTexts.find((lyricText) => selectedPreviewTextIds.has(lyricText.id)),
    [selectedPreviewTextIds]
  );

  return (
    <View
      width={CUSTOMIZATION_PANEL_WIDTH}
      height={height}
      backgroundColor={"gray-200"}
      overflow={"hidden hidden"}
    >
      <View
        height={HEADER_HEIGHT}
        backgroundColor={"gray-200"}
        paddingStart={10}
        paddingEnd={10}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 200,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "start",
          }}
        >
          {selectedLyricText?.text ?? "-"}
        </span>
      </View>
      {selectedLyricText?.text ? (
        <View
          overflow={"hidden auto"}
          height={height - HEADER_HEIGHT - 20}
          paddingY={10}
          key={selectedLyricText.id}
        >
          <TextReferenceTextAreaRow value={selectedLyricText.text} />
          <FontSizeSettingRow selectedLyricText={selectedLyricText} />
          <FontWeightSettingRow selectedLyricText={selectedLyricText} />
          <FontSettingRow selectedLyricText={selectedLyricText} />
        </View>
      ) : null}
    </View>
  );
}
