import { Flex, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../Project/store";
import { useEditorStore } from "./store";
import {
  ItemOpacitySettingRow,
  ItemRenderSettingRow,
} from "./AudioTimeline/Tools/CustomizationSettingRow";
import ParticlesSettings from "./Particles/ParticlesSettings";
import { getElementType } from "./utils";
import AudioVisualizerSettings from "./Visualizer/AudioVisualizerSettings";

function formatElementTime(seconds: number) {
  const totalSeconds = Math.max(0, seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
}

function ElementSettingsHeader({
  width,
  title,
  selectedElementId,
  start,
  end,
}: {
  width: number;
  title: string;
  selectedElementId: number;
  start: number;
  end: number;
}) {
  return (
    <View paddingX={10} paddingTop={4} paddingBottom={10} width={width}>
      <View
        UNSAFE_style={{
          background: "rgba(255, 255, 255, 0.045)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          borderRadius: 12,
        }}
        paddingX={12}
        paddingY={10}
      >
        <Flex direction="column" gap="size-50">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.52)",
            }}
          >
            Editing Element
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.92)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.55)",
            }}
          >
            Item #{selectedElementId} · {formatElementTime(start)} - {formatElementTime(end)}
          </div>
        </Flex>
      </View>
    </View>
  );
}

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
        <ElementSettingsHeader
          width={width}
          title="Visualizer"
          selectedElementId={selectedElement.id}
          start={selectedElement.start}
          end={selectedElement.end}
        />
        <ItemRenderSettingRow selectedLyricText={selectedElement} />
        <ItemOpacitySettingRow selectedLyricText={selectedElement} />
        <AudioVisualizerSettings width={width} />
      </View>
    );
  }

  if (selectedElement && getElementType(selectedElement) === "particle") {
    return (
      <View width={width}>
        <ElementSettingsHeader
          width={width}
          title="Particles"
          selectedElementId={selectedElement.id}
          start={selectedElement.start}
          end={selectedElement.end}
        />
        <ItemRenderSettingRow selectedLyricText={selectedElement} />
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