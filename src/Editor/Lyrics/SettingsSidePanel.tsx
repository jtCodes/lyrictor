import { TabList, Item, Tabs, View, Flex } from "@adobe/react-spectrum";
import LyricTextCustomizationToolPanel from "../AudioTimeline/Tools/LyricTextCustomizationToolPanel";
import AudioVisualizerSettings from "../Visualizer/AudioVisualizerSettings";
import { useEditorStore } from "../store";

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
      <View padding={"size-100"}>
        <Tabs
          aria-label="lyric-settings"
          onSelectionChange={(key: any) => {
            setTabId(key);
          }}
          selectedKey={tabId}
        >
          <TabList
            UNSAFE_style={{ paddingLeft: 10, paddingRight: 10, height: 45 }}
          >
            <Item key="text_settings">Text</Item>
            <Item key="visualizer_settings">Visualizer</Item>
          </TabList>
        </Tabs>
      </View>
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
      </View>
    </View>
  );
}
