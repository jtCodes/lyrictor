import { View, Flex } from "@adobe/react-spectrum";
import LyricTextCustomizationToolPanel from "./AudioTimeline/Tools/LyricTextCustomizationToolPanel";
import AudioVisualizerSettings from "./Visualizer/AudioVisualizerSettings";
import ImageSettings from "./Image/ImageSettings";
import { useEditorStore } from "./store";
import "../theme.css";

export default function SettingsSidePanel({
  maxRowHeight,
  containerWidth,
}: {
  maxRowHeight: number;
  containerWidth: number;
}) {
  const tabId = useEditorStore((state) => state.customizationPanelTabId);
  const setTabId = useEditorStore((state) => state.setCustomizationPanelTabId);

  return (
    <View>
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {[
          { key: "text_settings" as const, label: "Text" },
          { key: "visualizer_settings" as const, label: "Visualizer" },
          { key: "image_settings" as const, label: "Image" },
        ].map((tab) => (
          <button
            key={tab.key}
            className="side-panel-tab"
            onClick={() => setTabId(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "10px 14px 8px",
              border: "none",
              borderBottom:
                tabId === tab.key
                  ? "2px solid rgba(255, 255, 255, 0.6)"
                  : "2px solid transparent",
              borderRadius: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0.3,
              transition: "all 0.15s ease",
              background: "transparent",
              color:
                tabId === tab.key
                  ? "rgba(255, 255, 255, 0.85)"
                  : "rgba(255, 255, 255, 0.4)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <View maxHeight={maxRowHeight - 64} overflow={"auto"}>
        {tabId === "text_settings" ? (
          <Flex justifyContent={"center"} marginTop={10}>
            <LyricTextCustomizationToolPanel
              height={"100%"}
              width={containerWidth - 20}
            />
          </Flex>
        ) : null}
        {tabId === "visualizer_settings" ? (
          <Flex justifyContent={"center"} marginTop={10}>
            <AudioVisualizerSettings width={containerWidth - 20} />
          </Flex>
        ) : null}
        {tabId === "image_settings" ? (
          <Flex justifyContent={"center"} marginTop={10}>
            <ImageSettings width={containerWidth - 20} />
          </Flex>
        ) : null}
      </View>
    </View>
  );
}
