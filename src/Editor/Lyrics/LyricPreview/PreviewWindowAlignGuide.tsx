import { Layer, Line } from "react-konva";
import { DragGuide } from "./textDragAlignment";

type PreviewWindowAlignGuideProps = {
  previewWidth: number;
  previewHeight: number;
  guides: DragGuide[];
};

export default function PreviewWindowAlignGuide({
  previewWidth,
  previewHeight,
  guides,
}: PreviewWindowAlignGuideProps) {
  return (
    <Layer width={previewWidth} height={previewHeight}>
      {guides
        .filter((guide) => guide.orientation === "vertical")
        .map((guide) => (
        <Line
          key={`vertical-${guide.position}`}
          points={[guide.position, 0, guide.position, previewHeight]}
          stroke="#DAA520"
          strokeWidth={1}
          dash={[6, 6]}
        />
      ))}
      {guides
        .filter((guide) => guide.orientation === "horizontal")
        .map((guide) => (
        <Line
          key={`horizontal-${guide.position}`}
          points={[0, guide.position, previewWidth, guide.position]}
          stroke="#DAA520"
          strokeWidth={1}
          dash={[6, 6]}
        />
      ))}
    </Layer>
  );
}
