import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useMemo, useState } from "react";
import { Group, Layer, Rect, Stage, Tag, Text as KonvaText } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
import { getImagePreviewBounds } from "../../Image/imageMotion";
import {
  getActiveNonTextItems,
  getCurrentLyrics,
  getElementType,
  isImageItem,
  isItemRenderEnabled,
  isTextItem,
} from "../../utils";
import ImagePreviewLayer from "../../Image/ImagePreviewLayer";
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

interface DraggingImageState {
  id: number;
  startHandleX: number;
  startHandleY: number;
  startTextX: number;
  startTextY: number;
  currentTextX: number;
  currentTextY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );
  const setCustomizationPanelTabId = useEditorStore(
    (state) => state.setCustomizationPanelTabId
  );
  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );
  const activeNonTextItems = useMemo(
    () => getActiveNonTextItems(lyricTexts, position),
    [lyricTexts, position]
  );
  const previewNonTextItems = useMemo(() => {
    if (!isEditMode || editingMode !== EditingMode.free) {
      return activeNonTextItems;
    }

    const mergedItems = [...activeNonTextItems];

    lyricTexts.forEach((item) => {
      if (
        selectedLyricTextIds.has(item.id) &&
        !isTextItem(item) &&
        isItemRenderEnabled(item) &&
        !mergedItems.some((existingItem) => existingItem.id === item.id)
      ) {
        mergedItems.push(item);
      }
    });

    return mergedItems.sort((left, right) => {
      if (left.textBoxTimelineLevel !== right.textBoxTimelineLevel) {
        return left.textBoxTimelineLevel - right.textBoxTimelineLevel;
      }

      if (left.start !== right.start) {
        return left.start - right.start;
      }

      return left.id - right.id;
    });
  }, [activeNonTextItems, editingMode, isEditMode, lyricTexts, selectedLyricTextIds]);
  const topActiveVisualizerId = useMemo(
    () =>
      [...previewNonTextItems]
        .reverse()
        .find((item) => getElementType(item) === "visualizer")?.id,
    [previewNonTextItems]
  );

  const [draggingTextDimensions, setDraggingTextDimensions] =
    useState<Dimensions>();
  const [draggingImageState, setDraggingImageState] =
    useState<DraggingImageState>();

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

  const handleImageSelect = useCallback(
    (imageItem: LyricText) => {
      saveEditingText(editingText);
      setSelectedTimelineTextIds(new Set([imageItem.id]));
      toggleCustomizationPanelState(true);
      setCustomizationPanelTabId("image_settings");
    },
    [
      editingText,
      lyricTexts,
      setCustomizationPanelTabId,
      setSelectedTimelineTextIds,
      toggleCustomizationPanelState,
    ]
  );

  const handleImageDragEnd = useCallback(
    (imageItem: LyricText, nextTextX: number, nextTextY: number) => {
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (curLoopLyricText.id === imageItem.id) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        return curLoopLyricText;
      });

      setLyricTexts(updateLyricTexts, false);
    },
    [lyricTexts, setLyricTexts]
  );

  const selectedImageItem = useMemo(
    () =>
      previewNonTextItems.find(
        (item) => isImageItem(item) && selectedLyricTextIds.has(item.id)
      ),
    [previewNonTextItems, selectedLyricTextIds]
  );

  const selectedImagePreviewBounds = useMemo(() => {
    if (!selectedImageItem || editingMode !== EditingMode.free || !isEditMode) {
      return undefined;
    }

    return getImagePreviewBounds(
      selectedImageItem,
      previewWidth,
      previewHeight,
      position,
      draggingImageState?.id === selectedImageItem.id
        ? draggingImageState.currentTextX
        : undefined,
      draggingImageState?.id === selectedImageItem.id
        ? draggingImageState.currentTextY
        : undefined
    );
  }, [
    draggingImageState,
    editingMode,
    isEditMode,
    position,
    previewHeight,
    previewWidth,
    selectedImageItem,
  ]);

  const renderNonTextLayer = useCallback(
    (item: LyricText) => {
      const isSelectedImage = isImageItem(item) && selectedLyricTextIds.has(item.id);

      if (isImageItem(item) && item.imageUrl) {
        return (
          <ImagePreviewLayer
            key={item.id}
            item={item}
            previewWidth={previewWidth}
            previewHeight={previewHeight}
            position={position}
            isSelected={isSelectedImage}
            overrideTextX={
              draggingImageState?.id === item.id ? draggingImageState.currentTextX : undefined
            }
            overrideTextY={
              draggingImageState?.id === item.id ? draggingImageState.currentTextY : undefined
            }
          />
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
    },
    [
      draggingImageState,
      editingMode,
      position,
      previewHeight,
      previewWidth,
      selectedLyricTextIds,
      topActiveVisualizerId,
    ]
  );

  const activeNonTextLayers = useMemo(
    () => previewNonTextItems.map((item) => renderNonTextLayer(item)),
    [previewNonTextItems, renderNonTextLayer]
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
                {selectedImageItem && selectedImagePreviewBounds && isEditMode ? (
                  <Layer>
                    <Group
                      x={selectedImagePreviewBounds.left + 12}
                      y={Math.max(10, selectedImagePreviewBounds.top - 34)}
                      draggable={true}
                      onDragStart={(evt: KonvaEventObject<DragEvent>) => {
                        handleImageSelect(selectedImageItem);
                        setDraggingImageState({
                          id: selectedImageItem.id,
                          startHandleX: evt.target.x(),
                          startHandleY: evt.target.y(),
                          startTextX: selectedImageItem.textX ?? 0.5,
                          startTextY: selectedImageItem.textY ?? 0.5,
                          currentTextX: selectedImageItem.textX ?? 0.5,
                          currentTextY: selectedImageItem.textY ?? 0.5,
                        });
                      }}
                      onDragMove={(evt: KonvaEventObject<DragEvent>) => {
                        setDraggingImageState((currentState) => {
                          if (!currentState || currentState.id !== selectedImageItem.id) {
                            return currentState;
                          }

                          const deltaX = evt.target.x() - currentState.startHandleX;
                          const deltaY = evt.target.y() - currentState.startHandleY;

                          return {
                            ...currentState,
                            currentTextX: clamp(
                              currentState.startTextX + deltaX / previewWidth,
                              0,
                              1
                            ),
                            currentTextY: clamp(
                              currentState.startTextY + deltaY / previewHeight,
                              0,
                              1
                            ),
                          };
                        });
                      }}
                      onDragEnd={() => {
                        setDraggingImageState((currentState) => {
                          if (!currentState || currentState.id !== selectedImageItem.id) {
                            return undefined;
                          }

                          handleImageDragEnd(
                            selectedImageItem,
                            currentState.currentTextX,
                            currentState.currentTextY
                          );

                          return undefined;
                        });
                      }}
                    >
                      <Tag
                        fill="rgba(79, 151, 255, 0.96)"
                        cornerRadius={999}
                        pointerDirection="down"
                        pointerWidth={8}
                        pointerHeight={6}
                        shadowColor="rgba(79,151,255,0.28)"
                        shadowBlur={12}
                        shadowOffsetY={4}
                        shadowOpacity={0.75}
                      />
                      <KonvaText
                        text="Drag Image"
                        x={12}
                        y={7}
                        fontSize={11}
                        fontStyle="bold"
                        letterSpacing={0.3}
                        fill="white"
                      />
                    </Group>
                  </Layer>
                ) : null}
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
