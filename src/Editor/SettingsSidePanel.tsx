import { View, Flex } from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import LyricTextCustomizationToolPanel from "./AudioTimeline/Tools/LyricTextCustomizationToolPanel";
import ElementSettings from "./ElementSettings";
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
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const selectedLyricTextIdArray = useMemo(
    () => Array.from(selectedLyricTextIds),
    [selectedLyricTextIds]
  );
  const singleSelectedLyricId =
    selectedLyricTextIds.size === 1 ? selectedLyricTextIdArray[0] : undefined;
  const isMultiSelected = selectedLyricTextIds.size > 1;
  const [lastSingleLyricId, setLastSingleLyricId] = useState<number | undefined>(
    singleSelectedLyricId
  );

  useEffect(() => {
    if (singleSelectedLyricId === undefined) {
      return;
    }

    setLastSingleLyricId(singleSelectedLyricId);
  }, [singleSelectedLyricId]);

  const activeSingleLyricId = singleSelectedLyricId ?? lastSingleLyricId;

  return (
    <View height="100%" UNSAFE_style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          flexShrink: 0,
        }}
      >
        {[
          { key: "text_settings" as const, label: "Text" },
          { key: "element_settings" as const, label: "Elements" },
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
      <View
        flex={1}
        overflow={"hidden"}
        UNSAFE_style={{ minHeight: 0 }}
      >
        {tabId === "text_settings" ? (
          <div
            style={{
              position: "relative",
              height: "100%",
              paddingTop: 10,
              boxSizing: "border-box",
            }}
          >
            {isMultiSelected ? (
              <div style={{ position: "relative", height: "100%", width: "100%" }}>
                <Flex justifyContent={"center"} height="100%">
                  <LyricTextCustomizationToolPanel
                    height={"100%"}
                    width={containerWidth - 20}
                  />
                </Flex>
              </div>
            ) : null}

            {!isMultiSelected && activeSingleLyricId !== undefined ? (
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  display: singleSelectedLyricId !== undefined ? "block" : "none",
                }}
              >
                <Flex justifyContent={"center"} height="100%">
                  <LyricTextCustomizationToolPanel
                    key={activeSingleLyricId}
                    height={"100%"}
                    width={containerWidth - 20}
                    lyricTextId={activeSingleLyricId}
                  />
                </Flex>
              </div>
            ) : null}

            {!isMultiSelected && singleSelectedLyricId === undefined ? (
              <Flex justifyContent={"center"} height="100%">
                <LyricTextCustomizationToolPanel
                  height={"100%"}
                  width={containerWidth - 20}
                />
              </Flex>
            ) : null}

          </div>
        ) : null}
        {tabId === "element_settings" ? (
          <div
            style={{
              position: "relative",
              height: "100%",
              paddingTop: 10,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <Flex justifyContent={"center"}>
                <ElementSettings width={containerWidth - 20} />
              </Flex>
            </div>
          </div>
        ) : null}
        {tabId === "image_settings" ? (
          <div
            style={{
              position: "relative",
              height: "100%",
              paddingTop: 10,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <Flex justifyContent={"center"}>
                <ImageSettings width={containerWidth - 20} />
              </Flex>
            </div>
          </div>
        ) : null}
      </View>
    </View>
  );
}
