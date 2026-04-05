import { View, Flex } from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import LyricTextCustomizationToolPanel from "./AudioTimeline/Tools/LyricTextCustomizationToolPanel";
import ElementSettings from "./ElementSettings";
import ImageSettings from "./Image/ImageSettings";
import { useEditorStore } from "./store";
import { useProjectStore } from "../Project/store";
import { isElementItem, isImageItem } from "./utils";
import "../theme.css";

function usePreservedSingleSelectionId(currentId?: number) {
  const [lastSingleId, setLastSingleId] = useState<number | undefined>(currentId);

  useEffect(() => {
    if (currentId === undefined) {
      return;
    }

    setLastSingleId(currentId);
  }, [currentId]);

  return currentId ?? lastSingleId;
}

function ScrollPreservingSelectionPanel({
  currentId,
  activeId,
  renderSelected,
  renderFallback,
}: {
  currentId?: number;
  activeId?: number;
  renderSelected: (id: number) => React.ReactNode;
  renderFallback: () => React.ReactNode;
}) {
  return (
    <>
      {activeId !== undefined ? (
        <div
          key={activeId}
          style={{
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            display: currentId !== undefined ? "block" : "none",
          }}
        >
          <Flex justifyContent={"center"}>{renderSelected(activeId)}</Flex>
        </div>
      ) : null}

      {currentId === undefined ? (
        <div
          style={{
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Flex justifyContent={"center"}>{renderFallback()}</Flex>
        </div>
      ) : null}
    </>
  );
}

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
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const selectedLyricTextIdArray = useMemo(
    () => Array.from(selectedLyricTextIds),
    [selectedLyricTextIds]
  );
  const singleSelectedLyricId =
    selectedLyricTextIds.size === 1 ? selectedLyricTextIdArray[0] : undefined;
  const singleSelectedElementId = useMemo(() => {
    if (singleSelectedLyricId === undefined) {
      return undefined;
    }

    const selectedItem = lyricTexts.find((lyricText) => lyricText.id === singleSelectedLyricId);
    return selectedItem && isElementItem(selectedItem) ? singleSelectedLyricId : undefined;
  }, [lyricTexts, singleSelectedLyricId]);
  const singleSelectedImageId = useMemo(() => {
    if (singleSelectedLyricId === undefined) {
      return undefined;
    }

    const selectedItem = lyricTexts.find((lyricText) => lyricText.id === singleSelectedLyricId);
    return selectedItem && isImageItem(selectedItem) ? singleSelectedLyricId : undefined;
  }, [lyricTexts, singleSelectedLyricId]);
  const isMultiSelected = selectedLyricTextIds.size > 1;
  const activeSingleLyricId = usePreservedSingleSelectionId(singleSelectedLyricId);
  const activeSingleElementId = usePreservedSingleSelectionId(singleSelectedElementId);
  const activeSingleImageId = usePreservedSingleSelectionId(singleSelectedImageId);

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
            <ScrollPreservingSelectionPanel
              currentId={singleSelectedElementId}
              activeId={activeSingleElementId}
              renderSelected={(lyricTextId) => (
                <ElementSettings
                  key={lyricTextId}
                  width={containerWidth - 20}
                  lyricTextId={lyricTextId}
                />
              )}
              renderFallback={() => <ElementSettings width={containerWidth - 20} />}
            />
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
            <ScrollPreservingSelectionPanel
              currentId={singleSelectedImageId}
              activeId={activeSingleImageId}
              renderSelected={(lyricTextId) => (
                <ImageSettings
                  key={lyricTextId}
                  width={containerWidth - 20}
                  lyricTextId={lyricTextId}
                />
              )}
              renderFallback={() => <ImageSettings width={containerWidth - 20} />}
            />
          </div>
        ) : null}
      </View>
    </View>
  );
}
