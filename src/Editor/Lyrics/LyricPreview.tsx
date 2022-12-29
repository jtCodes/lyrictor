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
/* <KonvaText
            key={lyricText.id}
            fontSize={20}
            align="center"
            fill="white"
            text={lyricText.text}
            x={lyricText.textX * PREVIEW_WIDTH}
            y={lyricText.textY * PREVIEW_HEIGHT}
            wrap="word"
            draggable
            onDragEnd={(evt: KonvaEventObject<DragEvent>) =>
              handleDragEnd(evt, lyricText)
            }
            onDblClick={(evt: KonvaEventObject<DragEvent>) =>
              handleTextDblClick(evt, lyricText)
            }
            onClick={() => {
              setSelectedTextId(new Set([lyricText.id]));
            }}
          /> */
export default function LyricPreview({ height }: { height: number }) {
  const [width] = useWindowSize();

  const PREVIEW_WIDTH: number = width - 510;
  const PREVIEW_HEIGHT: number = height;

  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const updateEditingStatus = useProjectStore(
    (state) => state.updateEditingStatus
  );

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const editingText = useEditorStore((state) => state.editingText);
  const clearEditingText = useEditorStore((state) => state.clearEditingText);
  const [editingTextPos, setEditingTextPos] = useState<any>({ x: 0, y: 0 });
  const [selectedTextId, setSelectedTextId] = useState<Set<number>>(new Set());

  const visibleLyricTextsComponents = useMemo(
    () => (
      <>
        {visibleLyricTexts.map((lyricText) => (
          <LyricsTextView
            key={lyricText.id}
            x={lyricText.textX * PREVIEW_WIDTH}
            y={lyricText.textY * PREVIEW_HEIGHT}
            text={lyricText}
            width={150}
            height={100}
            onResize={() => {}}
            isTransforming={selectedTextId.has(lyricText.id)}
            onToggleTransform={() => {
              setSelectedTextId(new Set([lyricText.id]));
            }}
            onToggleEdit={(evt: KonvaEventObject<DragEvent>) => {}}
            onEscapeKeysPressed={(lyricText: LyricText) => {
              saveEditingText(lyricText);
            }}
          />
        ))}
      </>
    ),
    [visibleLyricTexts, selectedTextId]
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.keyCode === 13) {
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

      updateEditingStatus();
      clearEditingText();
    }
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

  function clearSelectedTextIds() {
    setSelectedTextId(new Set([]));
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
          {visibleLyricTextsComponents}
        </Layer>
      </Stage>
    </View>
  );
}
