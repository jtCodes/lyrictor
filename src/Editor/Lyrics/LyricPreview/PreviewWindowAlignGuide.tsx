import { useEffect, useState } from "react";
import { Stage, Layer, Rect, Line } from "react-konva";

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
  const [showGuides, setShowGuides] = useState<boolean>(false);

  const centerX = previewWidth / 2;
  const centerY = previewHeight / 2;

  useEffect(() => {
    const centerX = previewWidth / 2;
    const centerY = previewHeight / 2;
    // Determine if the box is close to the center, within a tolerance of 5 pixels
    const isNearCenterX = Math.abs(boxX + boxWidth / 2 - centerX) <= 5;
    const isNearCenterY = Math.abs(boxY + boxHeight / 2 - centerY) <= 5;
    setShowGuides(isNearCenterX || isNearCenterY);
  }, [boxX, boxY, boxWidth, boxHeight, previewWidth, previewHeight]);

  return (
    <Layer width={previewWidth} height={previewHeight}>
      {showGuides && (
        <>
          <Line
            points={[centerX, 0, centerX, previewHeight]}
            stroke="#DAA520"
            strokeWidth={2}
          />
          <Line
            points={[0, centerY, previewWidth, centerY]}
            stroke="#DAA520"
            strokeWidth={2}
          />
        </>
      )}
    </Layer>
  );
}
