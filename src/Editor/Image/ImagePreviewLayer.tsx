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
      <img
        className="w-full object-contain h-[calc(100%-50px)"
        width={"100%"}
        height={"100%"}
        style={{
          objectFit: "cover",
          opacity,
          transform: `translate(${translateX + danceMotion.x}px, ${translateY + danceMotion.y}px) rotate(${danceMotion.rotation}deg) scale(${scale})`,
          transformOrigin: danceMotion.transformOrigin,
          willChange: danceAmount > 0 ? "transform" : undefined,
        }}
        src={item.imageUrl}
        alt=""
        data-modded="true"
      />
    </View>
  );
}