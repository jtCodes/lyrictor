import { ReactNode } from "react";
import { View } from "@adobe/react-spectrum";
import LyricPreview from "../Editor/Lyrics/LyricPreview/LyricPreview";
import { EditingMode, VideoAspectRatio } from "./types";
import { usePlaybackPreparationState } from "./PlaybackPreparationProvider";

export default function ProjectPreviewSurface({
  width,
  height,
  editingMode,
  resolution,
  isFullscreen = false,
  isEditMode = false,
  children,
}: {
  width: number;
  height: number;
  editingMode: EditingMode;
  resolution?: VideoAspectRatio;
  isFullscreen?: boolean;
  isEditMode?: boolean;
  children?: ReactNode;
}) {
  const preparation = usePlaybackPreparationState();
  return (
    <View
      position="relative"
      width={width}
      height={height}
      overflow="hidden"
      UNSAFE_style={{
        borderRadius: isFullscreen || isEditMode ? 0 : 8,
        border: isFullscreen || isEditMode ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
        background: isFullscreen ? "black" : undefined,
        boxSizing: "border-box",
      }}
    >
      <View overflow="hidden" position="absolute">
        <LyricPreview
          maxHeight={height}
          maxWidth={width}
          resolution={resolution}
          isEditMode={isEditMode}
          editingMode={editingMode}
        />
      </View>
      {children}
      {preparation.preparing ? (
        <div role="status" aria-live="polite" style={{
          position: "absolute", top: 12, left: 12, zIndex: 30, pointerEvents: "none",
          padding: "6px 9px", borderRadius: 5, background: "rgba(16,18,22,0.88)",
          color: "rgba(255,255,255,0.85)", fontSize: 12, fontVariantNumeric: "tabular-nums",
        }}>
          Preparing preview… {preparation.completed}/{preparation.total}
          {preparation.queued ? " · Playback will start when ready" : ""}
        </div>
      ) : null}
    </View>
  );
}
