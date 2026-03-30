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
        boxShadow: isFullscreen
          ? "none"
          : "inset 0 0 0 1px rgba(255, 255, 255, 0.08), rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
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