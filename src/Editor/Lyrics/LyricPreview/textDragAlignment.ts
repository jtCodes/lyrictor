import { LyricText } from "../../types";
import { estimateTextBounds } from "./textCentering";

export type DragGuide = {
  orientation: "vertical" | "horizontal";
  position: number;
};

type DragBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SnapAnchor = {
  position: number;
  offset: number;
};

type SnapTarget = {
  position: number;
};

type ResolvedAxisSnap = {
  delta: number;
  guide?: DragGuide;
};

export type ResolvedTextDragAlignment = {
  x: number;
  y: number;
  guides: DragGuide[];
};

const SNAP_THRESHOLD_PX = 8;

function getBestAxisSnap(
  anchors: SnapAnchor[],
  targets: SnapTarget[],
  orientation: DragGuide["orientation"]
): ResolvedAxisSnap {
  let bestMatch: ResolvedAxisSnap = { delta: 0 };
  let bestDistance = Number.POSITIVE_INFINITY;

  anchors.forEach((anchor) => {
    targets.forEach((target) => {
      const delta = target.position - anchor.position;
      const distance = Math.abs(delta);

      if (distance > SNAP_THRESHOLD_PX || distance >= bestDistance) {
        return;
      }

      bestDistance = distance;
      bestMatch = {
        delta,
        guide: {
          orientation,
          position: target.position,
        },
      };
    });
  });

  return bestMatch;
}

export function resolveTextDragAlignment({
  dragBounds,
  previewWidth,
  previewHeight,
  peerTextItems,
}: {
  dragBounds: DragBounds;
  previewWidth: number;
  previewHeight: number;
  peerTextItems: LyricText[];
}): ResolvedTextDragAlignment {
  const verticalAnchors: SnapAnchor[] = [
    { position: dragBounds.x, offset: 0 },
    { position: dragBounds.x + dragBounds.width / 2, offset: dragBounds.width / 2 },
    { position: dragBounds.x + dragBounds.width, offset: dragBounds.width },
  ];
  const horizontalAnchors: SnapAnchor[] = [
    { position: dragBounds.y, offset: 0 },
    { position: dragBounds.y + dragBounds.height / 2, offset: dragBounds.height / 2 },
    { position: dragBounds.y + dragBounds.height, offset: dragBounds.height },
  ];

  const verticalTargets: SnapTarget[] = [{ position: previewWidth / 2 }];
  const horizontalTargets: SnapTarget[] = [{ position: previewHeight / 2 }];

  peerTextItems.forEach((item) => {
    const bounds = estimateTextBounds(item, previewWidth);
    const x = item.textX * previewWidth;
    const y = item.textY * previewHeight;

    verticalTargets.push(
      { position: x },
      { position: x + bounds.width / 2 },
      { position: x + bounds.width }
    );
    horizontalTargets.push(
      { position: y },
      { position: y + bounds.height / 2 },
      { position: y + bounds.height }
    );
  });

  const xSnap = getBestAxisSnap(verticalAnchors, verticalTargets, "vertical");
  const ySnap = getBestAxisSnap(horizontalAnchors, horizontalTargets, "horizontal");

  return {
    x: dragBounds.x + xSnap.delta,
    y: dragBounds.y + ySnap.delta,
    guides: [xSnap.guide, ySnap.guide].filter(
      (guide): guide is DragGuide => Boolean(guide)
    ),
  };
}