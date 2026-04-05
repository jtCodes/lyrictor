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

  const denseGuideShadow = "rgba(0, 0, 0, 0.34)";
  const denseGuideStroke = "rgba(255, 255, 255, 0.2)";
  const thirdsGuideShadow = "rgba(0, 0, 0, 0.38)";
  const thirdsGuideStroke = "rgba(255, 245, 214, 0.42)";
  const centerGuideShadow = "rgba(0, 0, 0, 0.42)";
  const centerGuideStroke = "rgba(255, 255, 255, 0.34)";

  return (
    <Layer listening={false} width={previewWidth} height={previewHeight}>
      <Rect
        x={0}
        y={0}
        width={previewWidth}
        height={previewHeight}
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={1}
      />
      {denseVerticalGuides.map((x) => (
        <>
          <Line
            key={`grid-v-dense-shadow-${x}`}
            points={[x, 0, x, previewHeight]}
            stroke={denseGuideShadow}
            strokeWidth={2}
            dash={[2, 8]}
          />
          <Line
            key={`grid-v-dense-${x}`}
            points={[x, 0, x, previewHeight]}
            stroke={denseGuideStroke}
            strokeWidth={1}
            dash={[2, 8]}
          />
        </>
      ))}
      {denseHorizontalGuides.map((y) => (
        <>
          <Line
            key={`grid-h-dense-shadow-${y}`}
            points={[0, y, previewWidth, y]}
            stroke={denseGuideShadow}
            strokeWidth={2}
            dash={[2, 8]}
          />
          <Line
            key={`grid-h-dense-${y}`}
            points={[0, y, previewWidth, y]}
            stroke={denseGuideStroke}
            strokeWidth={1}
            dash={[2, 8]}
          />
        </>
      ))}
      {thirdsVerticalGuides.map((x) => (
        <>
          <Line
            key={`grid-v-thirds-shadow-${x}`}
            points={[x, 0, x, previewHeight]}
            stroke={thirdsGuideShadow}
            strokeWidth={3}
            dash={[8, 6]}
          />
          <Line
            key={`grid-v-thirds-${x}`}
            points={[x, 0, x, previewHeight]}
            stroke={thirdsGuideStroke}
            strokeWidth={1}
            dash={[8, 6]}
          />
        </>
      ))}
      {thirdsHorizontalGuides.map((y) => (
        <>
          <Line
            key={`grid-h-thirds-shadow-${y}`}
            points={[0, y, previewWidth, y]}
            stroke={thirdsGuideShadow}
            strokeWidth={3}
            dash={[8, 6]}
          />
          <Line
            key={`grid-h-thirds-${y}`}
            points={[0, y, previewWidth, y]}
            stroke={thirdsGuideStroke}
            strokeWidth={1}
            dash={[8, 6]}
          />
        </>
      ))}
      <Line
        points={[centerVerticalGuide, 0, centerVerticalGuide, previewHeight]}
        stroke={centerGuideShadow}
        strokeWidth={3}
        dash={[4, 10]}
      />
      <Line
        points={[centerVerticalGuide, 0, centerVerticalGuide, previewHeight]}
        stroke={centerGuideStroke}
        strokeWidth={1}
        dash={[4, 10]}
      />
      <Line
        points={[0, centerHorizontalGuide, previewWidth, centerHorizontalGuide]}
        stroke={centerGuideShadow}
        strokeWidth={3}
        dash={[4, 10]}
      />
      <Line
        points={[0, centerHorizontalGuide, previewWidth, centerHorizontalGuide]}
        stroke={centerGuideStroke}
        strokeWidth={1}
        dash={[4, 10]}
      />
    </Layer>
  );
}