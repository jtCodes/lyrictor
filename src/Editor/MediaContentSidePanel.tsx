import { View } from "@adobe/react-spectrum";
import { useProjectStore } from "../Project/store";
import LyricReferenceView from "./Lyrics/LyricReferenceView";
import { useState } from "react";
import Images from "@spectrum-icons/workflow/Images";
import Note from "@spectrum-icons/workflow/Note";
import ImagesManagerView from "./Image/Imported/ImagesManagerView";
import "../theme.css";

export default function MediaContentSidePanel({
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
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {[
          { key: "lyrics" as const, label: "Lyrics", icon: <Note size="S" /> },
          { key: "images" as const, label: "Images", icon: <Images size="S" /> },
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
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <View maxHeight={maxRowHeight - 64} overflow={"auto"}>
        {tabId === "lyrics" && lyricReference !== undefined ? (
          <LyricReferenceView key={editingProject?.name} />
        ) : null}

        {tabId === "images" ? (
          <ImagesManagerView containerHeight={maxRowHeight - 64} />
        ) : null}
      </View>
    </View>
  );
}
