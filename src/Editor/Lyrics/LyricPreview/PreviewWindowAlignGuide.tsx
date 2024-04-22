import { useEffect, useState } from "react";
import { Layer, Line } from "react-konva";

type PreviewWindowAlignGuideProps = {
  previewWidth: number;
  previewHeight: number;
  boxWidth: number;
  boxHeight: number;
  boxX: number;
  boxY: number;
};

export default function PreviewWindowAlignGuide({
  previewWidth,
  previewHeight,
  boxWidth,
  boxHeight,
  boxX,
  boxY,
}: PreviewWindowAlignGuideProps) {
  const [showVerticalGuide, setShowVerticalGuide] = useState<boolean>(false);
  const [showHorizontalGuide, setShowHorizontalGuide] =
    useState<boolean>(false);

  const centerX = previewWidth / 2;
  const centerY = previewHeight / 2;

  useEffect(() => {
    // Vertical proximity checks: center, left edge, and right edge of the box
    const isNearCenterX = Math.abs(boxX + boxWidth / 2 - centerX) <= 5;
    const isNearLeftEdge = Math.abs(boxX - centerX) <= 5;
    const isNearRightEdge = Math.abs(boxX + boxWidth - centerX) <= 5;

    // Horizontal proximity checks: center, top edge, and bottom edge of the box
    const isNearCenterY = Math.abs(boxY + boxHeight / 2 - centerY) <= 5;
    const isNearTopEdge = Math.abs(boxY - centerY) <= 5;
    const isNearBottomEdge = Math.abs(boxY + boxHeight - centerY) <= 5;

    // Update states based on any edge being near the center
    setShowVerticalGuide(isNearCenterX || isNearLeftEdge || isNearRightEdge);
    setShowHorizontalGuide(isNearCenterY || isNearTopEdge || isNearBottomEdge);
  }, [boxX, boxY, boxWidth, boxHeight, previewWidth, previewHeight]);

  return (
    <Layer width={previewWidth} height={previewHeight}>
      {showVerticalGuide && (
        <Line
          points={[centerX, 0, centerX, previewHeight]}
          stroke="#DAA520"
          strokeWidth={1}
        />
      )}
      {showHorizontalGuide && (
        <Line
          points={[0, centerY, previewWidth, centerY]}
          stroke="#DAA520"
          strokeWidth={1}
        />
      )}
    </Layer>
  );
}
