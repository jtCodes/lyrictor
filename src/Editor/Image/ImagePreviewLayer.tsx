import { View } from "@adobe/react-spectrum";
import { LyricText } from "../types";
import {
  getImagePreviewBounds,
} from "./imageMotion";

export default function ImagePreviewLayer({
  item,
  previewWidth,
  previewHeight,
  position,
  overrideTextX,
  overrideTextY,
  overrideRotation,
}: {
  item: LyricText;
  previewWidth: number;
  previewHeight: number;
  position: number;
  overrideTextX?: number;
  overrideTextY?: number;
  overrideRotation?: number;
}) {
  if (!item.imageUrl) {
    return null;
  }
  const scale = item.imageScale ?? 1;
  const rotation = overrideRotation ?? item.imageRotation ?? 0;
  const opacity = item.itemOpacity ?? item.imageOpacity ?? 1;
  const previewBounds = getImagePreviewBounds(
    item,
    previewWidth,
    previewHeight,
    position,
    overrideTextX,
    overrideTextY
  );

  return (
    <View
      position={"absolute"}
      width={previewWidth}
      height={previewHeight}
      overflow={"hidden"}
      UNSAFE_style={{ pointerEvents: "none" }}
      data-export-non-text-layer="image"
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate(${previewBounds.danceMotion.x}px, ${previewBounds.danceMotion.y}px) rotate(${previewBounds.danceMotion.rotation}deg)`,
          transformOrigin: previewBounds.danceMotion.transformOrigin,
          willChange: item.imageDanceAmount ? "transform" : undefined,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transform: `translate(${previewBounds.translateX}px, ${previewBounds.translateY}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center center",
            willChange: rotation !== 0 || scale !== 1 ? "transform" : undefined,
            pointerEvents: "none",
          }}
        >
          <img
            className="w-full object-contain h-[calc(100%-50px)"
            width={"100%"}
            height={"100%"}
            style={{
              objectFit: "cover",
              opacity,
              pointerEvents: "none",
            }}
            src={item.imageUrl}
            alt=""
            data-modded="true"
          />
        </div>
      </div>
    </View>
  );
}