import { View } from "@adobe/react-spectrum";
import MagicWand from "@spectrum-icons/workflow/MagicWand";
import { useProjectStore } from "../Project/store";
import LyricReferenceView from "./Lyrics/LyricReferenceView";
import { useState } from "react";
import ImagesManagerView from "./Image/Imported/ImagesManagerView";
import EffectsManagerView from "./Effects/EffectsManagerView";
import AIStartingPointView from "./AI/AIStartingPointView";
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
  const [tabId, setTabId] = useState<"lyrics" | "ai" | "images" | "effects">("lyrics");

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
          { key: "lyrics" as const, label: "Lyrics" },
          { key: "images" as const, label: "Images" },
          { key: "effects" as const, label: "Elements" },
          { key: "ai" as const, label: "AI" },
        ].map((tab) => (
          <button
            key={tab.key}
            className="side-panel-tab"
            onClick={() => setTabId(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
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
            {tab.key === "ai" ? <MagicWand size="S" /> : null}
            {tab.label}
          </button>
        ))}
      </div>
      <View flex={1} overflow={"auto"}>
        {tabId === "lyrics" && lyricReference !== undefined ? (
          <LyricReferenceView key={editingProject?.name} />
        ) : null}

        {tabId === "images" ? (
          <ImagesManagerView />
        ) : null}

        {tabId === "ai" ? (
          <AIStartingPointView />
        ) : null}

        {tabId === "effects" ? (
          <EffectsManagerView containerHeight={maxRowHeight - 64} />
        ) : null}
      </View>
    </View>
  );
}
