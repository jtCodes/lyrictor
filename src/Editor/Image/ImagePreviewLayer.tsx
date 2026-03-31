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
  isSelected,
  overrideTextX,
  overrideTextY,
}: {
  item: LyricText;
  previewWidth: number;
  previewHeight: number;
  position: number;
  isSelected: boolean;
  overrideTextX?: number;
  overrideTextY?: number;
}) {
  if (!item.imageUrl) {
    return null;
  }
  const scale = item.imageScale ?? 1;
  const rotation = item.imageRotation ?? 0;
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
        {isSelected ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: previewBounds.left,
              top: previewBounds.top,
              width: previewBounds.width,
              height: previewBounds.height,
              border: "1.5px solid rgba(106, 171, 255, 0.98)",
              boxShadow: "0 0 0 1px rgba(7, 18, 36, 0.45)",
              pointerEvents: "none",
            }}
          >
            {[
              { left: -5, top: -5 },
              { right: -5, top: -5 },
              { left: -5, bottom: -5 },
              { right: -5, bottom: -5 },
            ].map((handleStyle, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "rgba(106, 171, 255, 1)",
                  boxShadow: "0 0 0 1px rgba(10, 18, 30, 0.55)",
                  ...handleStyle,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </View>
  );
}