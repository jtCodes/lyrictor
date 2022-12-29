import { View } from "@adobe/react-spectrum";
import { useWindowSize } from "@react-hook/window-size";
import { KonvaEventObject } from "konva/lib/Node";
import React, { useMemo, useState } from "react";
import { Group, Layer, Rect, Stage, Text as KonvaText } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { LyricText } from "../types";
import { getCurrentLyrics } from "../utils";
import { LyricsTextView } from "./Text/LyricsTextView";

// const PREVIEW_WIDTH: number = 800;
// const PREVIEW_HEIGHT: number = 400;

export default function LyricPreview({ height }: { height: number }) {
  const [width] = useWindowSize();

  const PREVIEW_WIDTH: number = width - 510;
  const PREVIEW_HEIGHT: number = height;
  const DEFAULT_TEXT_WIDTH: number = PREVIEW_WIDTH;
  const DEFAULT_TEXT_HEIGHT: number = 100;

  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);

  const { position } = useAudioPosition({
    highRefreshRate: true,
  });

  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );

  const editingText = useEditorStore((state) => state.editingText);
  const clearEditingText = useEditorStore((state) => state.clearEditingText);
  const updateSelectedTextIds = useEditorStore((state) => state.updateSelectedPreviewTextIds)
  const clearSelectedTextIds = useEditorStore((state) => state.clearSelectedPreviewTextIds)

  const visibleLyricTextsComponents = useMemo(
    () => (
      <>
        {visibleLyricTexts.map((lyricText) => (
          <Layer key={lyricText.id}>
            <LyricsTextView
              x={lyricText.textX * PREVIEW_WIDTH}
              y={lyricText.textY * PREVIEW_HEIGHT}
              text={lyricText}
              width={lyricText.width ?? DEFAULT_TEXT_WIDTH}
              height={lyricText.height ?? DEFAULT_TEXT_HEIGHT}
              onResize={(newWidth: number, newHeight: number) => {
                const updateLyricTexts = lyricTexts.map(
                  (curLoopLyricText: LyricText, updatedIndex: number) => {
                    if (curLoopLyricText.id === lyricText.id) {
                      return {
                        ...curLoopLyricText,
                        width: newWidth,
                        height: newHeight,
                      };
                    }

                    return curLoopLyricText;
                  }
                );

                setLyricTexts(updateLyricTexts);
              }}
              onDragEnd={(evt: KonvaEventObject<DragEvent>) =>
                handleDragEnd(evt, lyricText)
              }
              onEscapeKeysPressed={(lyricText: LyricText) => {
                saveEditingText(lyricText);
              }}
            />
          </Layer>
        ))}
      </>
    ),
    [visibleLyricTexts]
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
            textX: localX / PREVIEW_WIDTH,
            textY: localY / PREVIEW_HEIGHT,
          };
        }

        return curLoopLyricText;
      }
    );

    setLyricTexts(updateLyricTexts);
  }

  function handleOutsideClick() {
    clearSelectedTextIds();
    saveEditingText(editingText);
  }

  return (
    <View backgroundColor={"gray-50"}>
      <Stage width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
        <Layer>
          <Rect
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            onClick={handleOutsideClick}
          ></Rect>
        </Layer>
        {visibleLyricTextsComponents}
      </Stage>
    </View>
  );
}
