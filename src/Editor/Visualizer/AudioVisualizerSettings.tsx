import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";

export default function AudioVisualizerSettings() {
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
    return <div>{JSON.stringify(visualizerSettingSelected)}</div>;
  }

  return <div>AudioVisualizerSettings</div>;
}
