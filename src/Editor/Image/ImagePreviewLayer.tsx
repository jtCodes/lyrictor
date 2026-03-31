import { View } from "@adobe/react-spectrum";
import { LyricText } from "../types";
import {
  getImageDanceMode,
  getImageDanceMotion,
  getImageDanceSpeed,
  resolveImageDanceVector,
} from "./imageMotion";

export default function ImagePreviewLayer({
  item,
  previewWidth,
  previewHeight,
  position,
}: {
  item: LyricText;
  previewWidth: number;
  previewHeight: number;
  position: number;
}) {
  if (!item.imageUrl) {
    return null;
  }

  const translateX = ((item.textX ?? 0.5) - 0.5) * previewWidth;
  const translateY = ((item.textY ?? 0.5) - 0.5) * previewHeight;
  const scale = item.imageScale ?? 1;
  const rotation = item.imageRotation ?? 0;
  const opacity = item.itemOpacity ?? item.imageOpacity ?? 1;
  const danceAmount = item.imageDanceAmount ?? 0;
  const danceMotion = getImageDanceMotion(
    position,
    previewWidth,
    previewHeight,
    danceAmount,
    getImageDanceSpeed(item),
    getImageDanceMode(item),
    resolveImageDanceVector(item)
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
          transform: `translate(${danceMotion.x}px, ${danceMotion.y}px) rotate(${danceMotion.rotation}deg)`,
          transformOrigin: danceMotion.transformOrigin,
          willChange: danceAmount > 0 ? "transform" : undefined,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center center",
            willChange: rotation !== 0 || scale !== 1 ? "transform" : undefined,
          }}
        >
          <img
            className="w-full object-contain h-[calc(100%-50px)"
            width={"100%"}
            height={"100%"}
            style={{
              objectFit: "cover",
              opacity,
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