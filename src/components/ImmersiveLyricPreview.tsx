import LyricPreview from "../Editor/Lyrics/LyricPreview/LyricPreview";
import { EditingMode, VideoAspectRatio } from "../Project/types";

export default function ImmersiveLyricPreview({
  maxWidth,
  maxHeight,
  resolution,
  editingMode,
}: {
  maxWidth: number;
  maxHeight: number;
  resolution?: VideoAspectRatio;
  editingMode?: EditingMode;
}) {
  return (
    <LyricPreview
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      resolution={resolution}
      isEditMode={false}
      editingMode={editingMode}
      disableAnimation={true}
      hiddenElementTypes={["grain"]}
    />
  );
}