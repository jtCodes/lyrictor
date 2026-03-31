import { useEffect, useState } from "react";
import { View } from "@adobe/react-spectrum";
import { LyricText } from "../types";
import {
  getImageDanceMode,
  getImageDanceMotion,
  getImageDanceSpeed,
  resolveImageDanceVector,
} from "./imageMotion";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ImagePreviewLayer({
  item,
  previewWidth,
  previewHeight,
  position,
  isEditMode,
  isSelected,
  onSelect,
  onPositionCommit,
}: {
  item: LyricText;
  previewWidth: number;
  previewHeight: number;
  position: number;
  isEditMode: boolean;
  isSelected: boolean;
  onSelect: (item: LyricText) => void;
  onPositionCommit: (item: LyricText, nextTextX: number, nextTextY: number) => void;
}) {
  if (!item.imageUrl) {
    return null;
  }

  const [dragState, setDragState] = useState<
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startTextX: number;
        startTextY: number;
        currentTextX: number;
        currentTextY: number;
      }
    | undefined
  >();

  useEffect(() => {
    if (!dragState || !isEditMode) {
      return;
    }

    const activeDragState = dragState;

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activeDragState.pointerId) {
        return;
      }

      const deltaX = event.clientX - activeDragState.startClientX;
      const deltaY = event.clientY - activeDragState.startClientY;
      const nextTextX = clamp(activeDragState.startTextX + deltaX / previewWidth, 0, 1);
      const nextTextY = clamp(activeDragState.startTextY + deltaY / previewHeight, 0, 1);

      setDragState((currentState) =>
        currentState
          ? {
              ...currentState,
              currentTextX: nextTextX,
              currentTextY: nextTextY,
            }
          : currentState
      );
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activeDragState.pointerId) {
        return;
      }

      const deltaX = event.clientX - activeDragState.startClientX;
      const deltaY = event.clientY - activeDragState.startClientY;
      const nextTextX = clamp(activeDragState.startTextX + deltaX / previewWidth, 0, 1);
      const nextTextY = clamp(activeDragState.startTextY + deltaY / previewHeight, 0, 1);

      onPositionCommit(item, nextTextX, nextTextY);
      setDragState(undefined);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, isEditMode, item, onPositionCommit, previewHeight, previewWidth]);

  const currentTextX = dragState?.currentTextX ?? item.textX ?? 0.5;
  const currentTextY = dragState?.currentTextY ?? item.textY ?? 0.5;
  const translateX = (currentTextX - 0.5) * previewWidth;
  const translateY = (currentTextY - 0.5) * previewHeight;
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
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: "center center",
            willChange: rotation !== 0 || scale !== 1 || dragState ? "transform" : undefined,
            pointerEvents: isEditMode ? "auto" : "none",
            cursor: isEditMode ? (dragState ? "grabbing" : "grab") : "default",
          }}
          onPointerDown={(event) => {
            if (!isEditMode) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onSelect(item);

            setDragState({
              pointerId: event.pointerId,
              startClientX: event.clientX,
              startClientY: event.clientY,
              startTextX: item.textX ?? 0.5,
              startTextY: item.textY ?? 0.5,
              currentTextX: item.textX ?? 0.5,
              currentTextY: item.textY ?? 0.5,
            });
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
          {isSelected ? (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                border: "2px solid rgba(79, 151, 255, 0.95)",
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(79,151,255,0.35), 0 0 18px rgba(79,151,255,0.28)",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </div>
    </View>
  );
}