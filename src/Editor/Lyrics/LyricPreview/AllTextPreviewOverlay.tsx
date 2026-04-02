import { KonvaEventObject } from "konva/lib/Node";
import { Layer, Text } from "react-konva";
import { useMemo } from "react";
import { LyricText } from "../../types";
import { isItemRenderEnabled, isTextItem } from "../../utils";

function isTimelineTextItem(lyricText: LyricText) {
  return (
    isTextItem(lyricText) &&
    isItemRenderEnabled(lyricText) &&
    lyricText.text.trim().length > 0 &&
    lyricText.end > lyricText.start &&
    lyricText.textBoxTimelineLevel >= 1
  );
}

function formatCueTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
}

export function AllTextPreviewOverlay({
  lyricTexts,
  previewWidth,
  previewHeight,
  selectedLyricTextIds,
  onSelectLyricText,
  onDragMoveLyricText,
  onDragEndLyricText,
}: {
  lyricTexts: LyricText[];
  previewWidth: number;
  previewHeight: number;
  selectedLyricTextIds: Set<number>;
  onSelectLyricText: (lyricText: LyricText) => void;
  onDragMoveLyricText: (
    evt: KonvaEventObject<DragEvent>,
    lyricText: LyricText
  ) => void;
  onDragEndLyricText: (
    evt: KonvaEventObject<DragEvent>,
    lyricText: LyricText
  ) => void;
}) {
  const renderedLyricTexts = useMemo(
    () => lyricTexts.filter((lyricText) => isTimelineTextItem(lyricText)),
    [lyricTexts]
  );

  return (
    <Layer width={previewWidth} height={previewHeight}>
      {renderedLyricTexts.map((lyricText) => {
        const x = lyricText.textX * previewWidth;
        const y = lyricText.textY * previewHeight;
        const fontSize =
          (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth;
        const width = lyricText.width
          ? Math.min(previewWidth, lyricText.width * previewWidth)
          : undefined;
        const letterSpacing = ((lyricText.letterSpacing ?? 0) / 1000) * previewWidth;
        const isSelected = selectedLyricTextIds.has(lyricText.id);

        return (
          <>
            <Text
              key={`${lyricText.id}-time`}
              x={x}
              y={Math.max(0, y - 18)}
              text={formatCueTime(lyricText.start)}
              fontSize={11}
              fontFamily="Roboto Mono Variable"
              fill={isSelected ? "rgba(255, 224, 148, 0.98)" : "rgba(255, 214, 122, 0.92)"}
              shadowColor="rgba(0, 0, 0, 0.45)"
              shadowBlur={4}
              perfectDrawEnabled={false}
              listening={false}
            />
            <Text
              key={`${lyricText.id}-text`}
              x={x}
              y={y}
              text={lyricText.text}
              width={width}
              fontStyle={String(lyricText.fontWeight ?? 400)}
              fontFamily={lyricText.fontName ?? "Inter Variable"}
              fontSize={fontSize}
              letterSpacing={letterSpacing}
              fill={isSelected ? "rgba(255, 255, 255, 0.82)" : "rgba(255, 255, 255, 0.36)"}
              stroke={isSelected ? "rgba(255, 245, 208, 0.46)" : "rgba(255, 255, 255, 0.18)"}
              strokeWidth={isSelected ? 0.75 : 0.4}
              perfectDrawEnabled={false}
              draggable
              onClick={() => onSelectLyricText(lyricText)}
              onTap={() => onSelectLyricText(lyricText)}
              onDragStart={() => onSelectLyricText(lyricText)}
              onDragMove={(evt) => onDragMoveLyricText(evt, lyricText)}
              onDragEnd={(evt) => onDragEndLyricText(evt, lyricText)}
            />
          </>
        );
      })}
    </Layer>
  );
}