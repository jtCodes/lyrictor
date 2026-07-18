import { memo } from "react";
import { Line } from "react-konva";
import { useEditorStore } from "../store";
import { LyricText } from "../types";
import { getElementType, secondsToPixels, timelineLevelToY } from "../utils";

const TEXT_BOX_COLOR = "rgb(104, 109, 244)";
const IMAGE_BOX_COLOR = "rgb(204, 164, 253)";
const ELEMENT_BOX_COLOR = "#008c87";

function itemColor(item: LyricText) {
  if (item.isImage) {
    return IMAGE_BOX_COLOR;
  }

  return getElementType(item) ? ELEMENT_BOX_COLOR : TEXT_BOX_COLOR;
}

function TimelineItemAnchorLines({
  items,
  selectedItemIds,
  width,
  duration,
  timelineY,
}: {
  items: LyricText[];
  selectedItemIds: Set<number>;
  width: number;
  duration: number;
  timelineY: number;
}) {
  const draggingProgress = useEditorStore(
    (state) => state.draggingLyricTextProgress
  );
  const previewLevels = useEditorStore(
    (state) => state.draggingLyricTextPreviewLevels
  );
  const primaryDraggingId = draggingProgress?.startLyricText.id;
  const draggingTimeDelta = draggingProgress
    ? draggingProgress.endLyricText.start -
      draggingProgress.startLyricText.start
    : 0;

  return (
    <>
      {items.map((item) => {
        const isPrimaryDragging = item.id === primaryDraggingId;
        const isSecondaryDragging = Boolean(
          draggingProgress &&
            selectedItemIds.has(item.id) &&
            !isPrimaryDragging
        );
        const start = isPrimaryDragging
          ? draggingProgress!.endLyricText.start
          : item.start + (isSecondaryDragging ? draggingTimeDelta : 0);
        const previewLevel = previewLevels?.[item.id];
        const y = isPrimaryDragging
          ? draggingProgress!.endY
          : previewLevel !== undefined
          ? timelineLevelToY(previewLevel, timelineY)
          : timelineLevelToY(item.textBoxTimelineLevel, timelineY);
        const x = secondsToPixels(start, duration, width);

        return (
          <Line
            key={item.id}
            points={[x, y, x, timelineY]}
            stroke={itemColor(item)}
            strokeWidth={0.5}
            opacity={(item.renderEnabled ?? true) ? 1 : 0.35}
            listening={false}
          />
        );
      })}
    </>
  );
}

export default memo(TimelineItemAnchorLines);
