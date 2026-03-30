import { View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../Project/store";
import { useEditorStore } from "./store";
import { ItemOpacitySettingRow } from "./AudioTimeline/Tools/CustomizationSettingRow";
import ParticlesSettings from "./Particles/ParticlesSettings";
import { getElementType } from "./utils";
import AudioVisualizerSettings from "./Visualizer/AudioVisualizerSettings";

export default function ElementSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const selectedElement = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find((lyricText) => selectedLyricTextIds.has(lyricText.id));
  }, [lyricTexts, selectedLyricTextIds]);

  if (selectedElement && getElementType(selectedElement) === "visualizer") {
    return (
      <View width={width}>
        <ItemOpacitySettingRow selectedLyricText={selectedElement} />
        <AudioVisualizerSettings width={width} />
      </View>
    );
  }

  if (selectedElement && getElementType(selectedElement) === "particle") {
    return (
      <View width={width}>
        <ItemOpacitySettingRow selectedLyricText={selectedElement} />
        <ParticlesSettings width={width} />
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
      paddingStart={10}
    >
      No element selected
    </View>
  );
}