import { Flex, View } from "@adobe/react-spectrum";
import { useWindowSize } from "@react-hook/window-size";
import { KonvaEventObject } from "konva/lib/Node";
import { useMemo, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
import { getCurrentLyrics } from "../../utils";
import { LyricsTextView } from "./LyricsTextView";
import MusicVisualizer from "../../Visualizer/AudioVisualizer";
import { VideoResolution } from "../../../Project/types";
import PreviewWindowAlignGuide from "./PreviewWindowAlignGuide";

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
}: {
  maxHeight: number;
  maxWidth: number;
  resolution?: VideoResolution;
  isEditMode?: boolean;
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

  const setSelectedTimelineTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );

  const [draggingTextDimensions, setDraggingTextDimensions] =
    useState<Dimensions>();

  const visibleLyricTextsComponents = useMemo(
    () => (
      <>
        {visibleLyricTexts.map((lyricText) => (
          <Layer key={lyricText.id}>
            <LyricsTextView
              isEditMode={isEditMode}
              previewWindowWidth={previewWidth}
              previewWindowHeight={previewHeight}
              x={lyricText.textX * previewWidth}
              y={lyricText.textY * previewHeight}
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

                setLyricTexts(updateLyricTexts);
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
            />
          </Layer>
        ))}
      </>
    ),
    [visibleLyricTexts, previewWidth, previewHeight]
  );

  const visibleImage = useMemo(() => {
    const images = visibleLyricTexts
      .filter((lyricText) => lyricText.isImage && lyricText.imageUrl)
      .sort((a, b) => b.textBoxTimelineLevel - a.textBoxTimelineLevel);

    if (images.length > 0) {
      return (
        <img
          className="w-full object-contain h-[calc(100%-50px)"
          width={"100%"}
          height={"100%"}
          style={{ objectFit: "cover" }}
          src={images[0].imageUrl}
          alt=""
          data-modded="true"
        />
      );
    }

    return null;
  }, [visibleLyricTexts]);

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

      setLyricTexts(updateLyricTexts);
    }
    clearEditingText();
  }

  function handleDragEnd(
    evt: KonvaEventObject<DragEvent>,
    lyricText: LyricText
  ) {
    const localX = evt.target._lastPos.x;
    const localY = evt.target._lastPos.y;

    const updateLyricTexts = lyricTexts.map(
      (curLoopLyricText: LyricText, updatedIndex: number) => {
        if (curLoopLyricText.id === lyricText.id) {
          return {
            ...curLoopLyricText,
            textX: localX / previewWidth,
            textY: localY / previewHeight,
          };
        }

        return curLoopLyricText;
      }
    );

    setLyricTexts(updateLyricTexts);
    setDraggingTextDimensions(undefined);
  }

  function handleOutsideClick() {
    saveEditingText(editingText);
    setSelectedTimelineTextIds(new Set([]));
  }

  return (
    <View width={maxWidth} height={maxHeight}>
      <Flex
        justifyContent={"center"}
        alignItems={"center"}
        width={"100%"}
        height={"100%"}
      >
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
            overflow={"hidden"}
          >
            {visibleImage}
          </View>
          <div
            style={{
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.35)",
              width: previewWidth,
              height: previewHeight,
            }}
          ></div>
          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
          >
            <Stage width={previewWidth} height={previewHeight}>
              <MusicVisualizer
                width={previewWidth}
                height={previewHeight}
                variant="vignette"
                position={position}
              />
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
      </Flex>
    </View>
  );
}

function usePreviewSize(
  maxWidth: number,
  maxHeight: number,
  resolution?: VideoResolution
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
