import { TabList, Item, Tabs, View } from "@adobe/react-spectrum";
import { useProjectStore } from "../../Project/store";
import LyricReferenceView from "./LyricReferenceView";
import { useState } from "react";
import Images from "@spectrum-icons/workflow/Images";
import Note from "@spectrum-icons/workflow/Note";

export default function LyricsSidePanel({
  maxRowHeight,
  containerWidth,
}: {
  maxRowHeight: number;
  containerWidth: number;
}) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const [tabId, setTabId] = useState<"lyrics" | "images">("lyrics");

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
            <Item key="lyrics">
              <span>
                <Note />
              </span>
              <span style={{ marginLeft: 5 }}>Lyrics</span>
            </Item>
            {/* <Item key="images">
              <span>
                <Images />
              </span>
              <span style={{ marginLeft: 5 }}>Images</span>
            </Item> */}
          </TabList>
        </Tabs>
      </View>
      <View maxHeight={maxRowHeight - 64} overflow={"auto"}>
        {tabId === "lyrics" && lyricReference !== undefined ? (
          <LyricReferenceView key={editingProject?.name} />
        ) : null}
      </View>
    </View>
  );
}
