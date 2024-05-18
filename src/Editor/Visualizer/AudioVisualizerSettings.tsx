import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { View } from "@adobe/react-spectrum";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";

export default function AudioVisualizerSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const visualizerSettingSelected = useMemo(() => {
    if (selectedLyricTextIds.size === 1) {
      return lyricTexts.find(
        (lyricText) =>
          lyricText.isVisualizer && selectedLyricTextIds.has(lyricText.id)
      );
    }
  }, [lyricTexts, selectedLyricTextIds]);

  if (visualizerSettingSelected) {
    return (
      <View width={width}>
        <CustomizationSettingRow
          label={"Color Stops"}
          value={""}
          settingComponent={
            <View>
              <div>haha</div>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View
      UNSAFE_style={{
        fontStyle: "italic",
        color: "lightgray",
        opacity: 0.8,
      }}
    >
      No visualizer setting selected
    </View>
  );
}
