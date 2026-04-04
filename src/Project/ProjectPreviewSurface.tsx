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
  children,
}: {
  width: number;
  height: number;
  editingMode: EditingMode;
  resolution?: VideoAspectRatio;
  isFullscreen?: boolean;
  children?: ReactNode;
}) {
  return (
    <View
      position="relative"
      width={width}
      height={height}
      overflow="hidden"
      UNSAFE_style={{
        borderRadius: isFullscreen ? 0 : 8,
        border: isFullscreen ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
        boxSizing: "border-box",
      }}
    >
      <View overflow="hidden" position="absolute">
        <LyricPreview
          maxHeight={height}
          maxWidth={width}
          resolution={resolution}
          isEditMode={false}
          editingMode={editingMode}
        />
      </View>
      {children}
    </View>
  );
}