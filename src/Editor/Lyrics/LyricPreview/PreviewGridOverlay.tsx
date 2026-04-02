import { Layer, Line, Rect } from "react-konva";

function buildGuidePositions(size: number, divisions: number) {
  return Array.from({ length: divisions - 1 }, (_, index) =>
    (size * (index + 1)) / divisions
  );
}

export function PreviewGridOverlay({
  previewWidth,
  previewHeight,
}: {
  previewWidth: number;
  previewHeight: number;
}) {
  const denseVerticalGuides = buildGuidePositions(previewWidth, 12);
  const denseHorizontalGuides = buildGuidePositions(previewHeight, 12);
  const thirdsVerticalGuides = [previewWidth / 3, (previewWidth * 2) / 3];
  const thirdsHorizontalGuides = [previewHeight / 3, (previewHeight * 2) / 3];
  const centerVerticalGuide = previewWidth / 2;
  const centerHorizontalGuide = previewHeight / 2;

  return (
    <Layer listening={false} width={previewWidth} height={previewHeight}>
      <Rect
        x={0}
        y={0}
        width={previewWidth}
        height={previewHeight}
        stroke="rgba(255, 255, 255, 0.14)"
        strokeWidth={1}
      />
      {denseVerticalGuides.map((x) => (
        <Line
          key={`grid-v-dense-${x}`}
          points={[x, 0, x, previewHeight]}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={1}
          dash={[2, 8]}
        />
      ))}
      {denseHorizontalGuides.map((y) => (
        <Line
          key={`grid-h-dense-${y}`}
          points={[0, y, previewWidth, y]}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={1}
          dash={[2, 8]}
        />
      ))}
      {thirdsVerticalGuides.map((x) => (
        <Line
          key={`grid-v-thirds-${x}`}
          points={[x, 0, x, previewHeight]}
          stroke="rgba(255, 244, 214, 0.26)"
          strokeWidth={1}
          dash={[8, 6]}
        />
      ))}
      {thirdsHorizontalGuides.map((y) => (
        <Line
          key={`grid-h-thirds-${y}`}
          points={[0, y, previewWidth, y]}
          stroke="rgba(255, 244, 214, 0.26)"
          strokeWidth={1}
          dash={[8, 6]}
        />
      ))}
      <Line
        points={[centerVerticalGuide, 0, centerVerticalGuide, previewHeight]}
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth={1}
        dash={[4, 10]}
      />
      <Line
        points={[0, centerHorizontalGuide, previewWidth, centerHorizontalGuide]}
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth={1}
        dash={[4, 10]}
      />
    </Layer>
  );
}