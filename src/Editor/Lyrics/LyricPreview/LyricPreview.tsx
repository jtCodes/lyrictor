import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useMemo, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
import {
  getActiveNonTextItems,
  getCurrentLyrics,
  getElementType,
  isImageItem,
} from "../../utils";
import { LyricsTextView } from "./LyricsTextView";
import {
  AshFadePreview,
  getAshFadeTextRenderProps,
  getAshFadeTextOpacity,
} from "../Effects/AshFade/AshFadeEffect";
import { getTextBlurRenderProps } from "../Effects/Blur/BlurEffect";
import {
  getGlitchPrimaryTextOffset,
  getGlitchPrimaryTextOpacity,
  GlitchPreview,
} from "../Effects/Glitch/GlitchEffect";
import MusicVisualizer from "../../Visualizer/AudioVisualizer";
import Particles from "../../Particles/Particles";
import VisualizerPreviewSurface from "../../Visualizer/VisualizerPreviewSurface";
import { EditingMode, VideoAspectRatio } from "../../../Project/types";
import PreviewWindowAlignGuide from "./PreviewWindowAlignGuide";
import { TimeSyncedLyrics } from "./LinearTimeSyncedLyricPreview";

interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function LyricPreview({
  maxHeight,
  maxWidth,
  resolution,
  isEditMode = true,
  editingMode = EditingMode.free,
}: {
  maxHeight: number;
  maxWidth: number;
  resolution?: VideoAspectRatio;
  isEditMode?: boolean;
  editingMode?: EditingMode;
}) {
  const { previewWidth, previewHeight } = usePreviewSize(
    maxWidth,
    maxHeight,
    resolution
  );

  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);

  const { position } = useAudioPosition({
    highRefreshRate: true,
  });

  const editingText = useEditorStore((state) => state.editingText);
  const clearEditingText = useEditorStore((state) => state.clearEditingText);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const setSelectedTimelineTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );
  const activeNonTextItems = useMemo(
    () => getActiveNonTextItems(lyricTexts, position),
    [lyricTexts, position]
  );
  const topActiveVisualizerId = useMemo(
    () =>
      [...activeNonTextItems]
        .reverse()
        .find((item) => getElementType(item) === "visualizer")?.id,
    [activeNonTextItems]
  );

  const [draggingTextDimensions, setDraggingTextDimensions] =
    useState<Dimensions>();

  const setPreviewContainerRef = useEditorStore(
    (state) => state.setPreviewContainerRef
  );
  const previewRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && isEditMode) {
        setPreviewContainerRef(node);
      }
    },
    [isEditMode, setPreviewContainerRef]
  );

  const visibleLyricTextsComponents = useMemo(
    () =>
      editingMode === EditingMode.free ? (
        <>
          {visibleLyricTexts
            .filter((lt) => !lt.isImage)
            .map((lyricText) => (
            <Layer key={lyricText.id}>
              {(() => {
                const glitchPrimaryTextOffset = getGlitchPrimaryTextOffset(
                  lyricText,
                  position,
                  previewWidth
                );
                const ashFadeOpacity = getAshFadeTextOpacity(lyricText, position);
                const glitchPrimaryTextOpacity = getGlitchPrimaryTextOpacity(
                  lyricText,
                  position,
                  previewWidth
                );
                const itemOpacity = lyricText.itemOpacity ?? 1;
                const blurRenderProps = getTextBlurRenderProps(
                  lyricText,
                  position,
                  previewWidth
                );

                return (
                  <>
              <GlitchPreview
                lyricText={lyricText}
                x={lyricText.textX * previewWidth}
                y={lyricText.textY * previewHeight}
                previewWidth={previewWidth}
                position={position}
              />
              <LyricsTextView
                isEditMode={isEditMode}
                previewWindowWidth={previewWidth}
                previewWindowHeight={previewHeight}
                x={lyricText.textX * previewWidth + glitchPrimaryTextOffset.xOffset}
                y={lyricText.textY * previewHeight + glitchPrimaryTextOffset.yOffset}
                lyricText={lyricText}
                width={
                  lyricText.width
                    ? Math.min(previewWidth, lyricText.width * previewWidth)
                    : undefined
                }
                height={lyricText.height}
                onResize={(newWidth: number, newHeight: number) => {
                  const updateLyricTexts = lyricTexts.map(
                    (curLoopLyricText: LyricText, updatedIndex: number) => {
                      if (curLoopLyricText.id === lyricText.id) {
                        return {
                          ...curLoopLyricText,
                          width: newWidth / previewWidth,
                          height: newHeight,
                        };
                      }

                      return curLoopLyricText;
                    }
                  );

                  setLyricTexts(updateLyricTexts, false);
                }}
                onDragStart={(evt: KonvaEventObject<DragEvent>) => {}}
                onDragEnd={(evt: KonvaEventObject<DragEvent>) => {
                  if (isEditMode) {
                    handleDragEnd(evt, lyricText);
                  }
                }}
                onDragMove={(evt: KonvaEventObject<DragEvent>) => {
                  if (isEditMode) {
                    setDraggingTextDimensions({
                      width: evt.target.getSize().width,
                      height: evt.target.getSize().height,
                      x: evt.target.getPosition().x,
                      y: evt.target.getPosition().y,
                    });
                  }
                }}
                onEscapeKeysPressed={(lyricText: LyricText) => {
                  saveEditingText(lyricText);
                }}
                {...getAshFadeTextRenderProps(lyricText, position, previewWidth)}
                {...blurRenderProps}
                opacity={itemOpacity * ashFadeOpacity * glitchPrimaryTextOpacity}
              />
              <AshFadePreview
                lyricText={lyricText}
                x={lyricText.textX * previewWidth}
                y={lyricText.textY * previewHeight}
                previewWidth={previewWidth}
                position={position}
              />
                  </>
                );
              })()}
            </Layer>
          ))}
        </>
      ) : null,
    [
      editingMode,
      isEditMode,
      lyricTexts,
      position,
      previewHeight,
      previewWidth,
      selectedLyricTextIds,
      visibleLyricTexts,
    ]
  );

  const activeNonTextLayers = useMemo(
    () =>
      activeNonTextItems.map((item) => {
        if (isImageItem(item) && item.imageUrl) {
          const translateX = ((item.textX ?? 0.5) - 0.5) * previewWidth;
          const translateY = ((item.textY ?? 0.5) - 0.5) * previewHeight;
          const scale = item.imageScale ?? 1;
          const opacity = item.itemOpacity ?? item.imageOpacity ?? 1;

          return (
            <View
              key={item.id}
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
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                }}
                src={item.imageUrl}
                alt=""
                data-modded="true"
              />
            </View>
          );
        }

        const elementType = getElementType(item);

        if (elementType === "visualizer") {
          return (
            <VisualizerPreviewSurface
              key={item.id}
              width={previewWidth}
              height={previewHeight}
              position={position}
              lyricText={item}
              opacity={item.itemOpacity ?? 1}
              previewMode={editingMode === EditingMode.free ? "free" : "static"}
              showPreviewEffects={item.id === topActiveVisualizerId}
            />
          );
        }

        if (elementType === "particle") {
          return (
            <View
              key={item.id}
              position={"absolute"}
              width={previewWidth}
              height={previewHeight}
              UNSAFE_style={{ pointerEvents: "none", opacity: item.itemOpacity ?? 1 }}
              data-export-non-text-layer="particle"
            >
              <Stage width={previewWidth} height={previewHeight}>
                <Particles
                  width={previewWidth}
                  height={previewHeight}
                  position={position}
                  lyricText={item}
                />
              </Stage>
            </View>
          );
        }

        return null;
      }),
    [activeNonTextItems, editingMode, position, previewHeight, previewWidth, topActiveVisualizerId]
  );

  function saveEditingText(editingText: LyricText | undefined) {
    if (editingText) {
      const updateLyricTexts = lyricTexts.map(
        (curLoopLyricText: LyricText, updatedIndex: number) => {
          if (curLoopLyricText.id === editingText.id) {
            return {
              ...editingText,
            };
          }

          return curLoopLyricText;
        }
      );

      setLyricTexts(updateLyricTexts, false);
    }
    clearEditingText();
  }

  function handleDragEnd(
    evt: KonvaEventObject<DragEvent>,
    lyricText: LyricText
  ) {
    const localX = evt.target._lastPos.x;
    const localY = evt.target._lastPos.y;
    const nextTextX = localX / previewWidth;
    const nextTextY = localY / previewHeight;
    const isGroupDrag =
      selectedLyricTextIds.size > 1 && selectedLyricTextIds.has(lyricText.id);

    const updateLyricTexts = lyricTexts.map(
      (curLoopLyricText: LyricText, updatedIndex: number) => {
        if (
          isGroupDrag &&
          selectedLyricTextIds.has(curLoopLyricText.id) &&
          !curLoopLyricText.isImage &&
          !curLoopLyricText.isVisualizer &&
          !curLoopLyricText.isParticle
        ) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        if (curLoopLyricText.id === lyricText.id) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        return curLoopLyricText;
      }
    );

    setLyricTexts(updateLyricTexts, false);
    setDraggingTextDimensions(undefined);
  }

  function handleOutsideClick() {
    saveEditingText(editingText);
    setSelectedTimelineTextIds(new Set([]));
  }

  if (editingMode === EditingMode.free) {
    return (
      <View width={maxWidth} height={maxHeight}>
        <Flex
          justifyContent={"center"}
          alignItems={"center"}
          width={"100%"}
          height={"100%"}
        >
          <div ref={previewRef} data-export-mode="free">
          <View
            backgroundColor={"gray-50"}
            position={"relative"}
            width={previewWidth}
            height={previewHeight}
          >
            <View
              position={"absolute"}
              width={previewWidth}
              height={previewHeight}
              data-export-non-text-stack="true"
            >
              {activeNonTextLayers}
            </View>
            <View
              position={"absolute"}
              width={previewWidth}
              height={previewHeight}
              data-export-text-stage="true"
            >
              <Stage width={previewWidth} height={previewHeight}>
                <Layer>
                  <Rect
                    width={previewWidth}
                    height={previewHeight}
                    onClick={handleOutsideClick}
                  ></Rect>
                </Layer>
                {draggingTextDimensions ? (
                  <PreviewWindowAlignGuide
                    previewWidth={previewWidth}
                    previewHeight={previewHeight}
                    boxWidth={draggingTextDimensions?.width}
                    boxHeight={draggingTextDimensions.height}
                    boxX={draggingTextDimensions.x}
                    boxY={draggingTextDimensions.y}
                  />
                ) : (
                  <></>
                )}
                {visibleLyricTextsComponents}
              </Stage>
            </View>
          </View>
          </div>
        </Flex>
      </View>
    );
  }

  return (
    <View width={maxWidth} height={maxHeight}>
      <Flex
        justifyContent={"center"}
        alignItems={"center"}
        width={"100%"}
        height={"100%"}
      >
        <div ref={previewRef} data-export-mode="static">
        <View
          backgroundColor={"gray-50"}
          position={"relative"}
          width={previewWidth}
          height={previewHeight}
        >
          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
            data-export-non-text-stack="true"
          >
            {activeNonTextLayers}
          </View>
          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
          >
            <Stage width={previewWidth} height={previewHeight}>
              <Layer>
                <Rect
                  width={previewWidth}
                  height={previewHeight}
                  onClick={handleOutsideClick}
                ></Rect>
              </Layer>
            </Stage>
          </View>

          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
          >
            <TimeSyncedLyrics
              height={previewHeight}
              width={previewWidth}
              position={position}
              lyricTexts={lyricTexts}
            />
          </View>
        </View>
        </div>
      </Flex>
    </View>
  );
}

function usePreviewSize(
  maxWidth: number,
  maxHeight: number,
  resolution?: VideoAspectRatio
) {
  return useMemo(() => {
    if (resolution) {
      let previewWidth = (maxHeight * 16) / 9;
      let previewHeight = maxHeight;

      if (previewWidth > maxWidth) {
        previewWidth = maxWidth;
        previewHeight = (maxWidth * 9) / 16;
      }

      if (previewWidth < 1 || previewHeight < 1) {
        return { previewWidth: 1, previewHeight: 1 };
      }

      return { previewWidth, previewHeight };
    }

    return { previewWidth: maxWidth, previewHeight: maxHeight };
  }, [maxWidth, maxHeight, resolution]);
}
