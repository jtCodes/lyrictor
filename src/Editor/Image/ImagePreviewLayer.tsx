import { View } from "@adobe/react-spectrum";
import { CSSProperties } from "react";
import { LyricText } from "../types";
import {
  getImagePreviewBounds,
} from "./imageMotion";

function getImageEdgeMaskStyle(featherAmount: number): CSSProperties | undefined {
  if (featherAmount <= 0) {
    return undefined;
  }

  const clampedFeather = Math.min(1, Math.max(0, featherAmount));
  const edgeStop = 4 + clampedFeather * 22;
  const centerStop = 16 + clampedFeather * 24;
  const radialOpaqueStop = 58 - clampedFeather * 28;
  const radialSoftStop = 82 - clampedFeather * 24;

  const horizontalMask = `linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.14) ${edgeStop * 0.45}%, rgba(0, 0, 0, 0.82) ${edgeStop}%, rgba(0, 0, 0, 1) ${centerStop}%, rgba(0, 0, 0, 1) ${100 - centerStop}%, rgba(0, 0, 0, 0.82) ${100 - edgeStop}%, rgba(0, 0, 0, 0.14) ${100 - edgeStop * 0.45}%, transparent 100%)`;
  const verticalMask = `linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.14) ${edgeStop * 0.45}%, rgba(0, 0, 0, 0.82) ${edgeStop}%, rgba(0, 0, 0, 1) ${centerStop}%, rgba(0, 0, 0, 1) ${100 - centerStop}%, rgba(0, 0, 0, 0.82) ${100 - edgeStop}%, rgba(0, 0, 0, 0.14) ${100 - edgeStop * 0.45}%, transparent 100%)`;
  const radialMask = `radial-gradient(ellipse at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) ${radialOpaqueStop}%, rgba(0, 0, 0, 0.52) ${radialSoftStop}%, transparent 100%)`;
  const maskImage = `${horizontalMask}, ${verticalMask}, ${radialMask}`;

  return {
    WebkitMaskImage: maskImage,
    maskImage,
    WebkitMaskRepeat: "no-repeat, no-repeat, no-repeat",
    maskRepeat: "no-repeat, no-repeat, no-repeat",
    WebkitMaskPosition: "center, center, center",
    maskPosition: "center, center, center",
    WebkitMaskSize: "100% 100%, 100% 100%, 100% 100%",
    maskSize: "100% 100%, 100% 100%, 100% 100%",
    WebkitMaskComposite: "source-in, source-in",
    maskComposite: "intersect, intersect",
  };
}

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
  const edgeMaskStyle = getImageEdgeMaskStyle(item.imageEdgeFeather ?? 0);
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
            loading="eager"
            decoding="sync"
            style={{
              objectFit: "cover",
              opacity,
              ...edgeMaskStyle,
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