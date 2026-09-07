import { ReactNode } from "react";
import { View } from "@adobe/react-spectrum";
import LyricPreview from "../Editor/Lyrics/LyricPreview/LyricPreview";
import { EditingMode, VideoAspectRatio } from "./types";

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
    </View>
  );
}
