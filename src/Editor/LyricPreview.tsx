import { KonvaEventObject } from "konva/lib/Node";
import React, { useState } from "react";
import { Layer, Stage, Text as KonvaText } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../Project/store";
import { LyricText } from "./types";
import {
  getCurrentLyric,
  getCurrentLyricIndex,
  getCurrentLyrics,
} from "./utils";

const PREVIEW_WIDTH: number = 800;
const PREVIEW_HEIGHT: number = 400;

export default function LyricPreview() {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const updateEditingStatus = useProjectStore(
    (state) => state.updateEditingStatus
  );

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  const visibleLyricTexts: LyricText[] = getCurrentLyrics(lyricTexts, position);
  const visibleLyricTextIndex: number | undefined = getCurrentLyricIndex(
    lyricTexts,
    position
  );
  const [editingText, setEditingText] = useState<LyricText | undefined>();
  const [editingTextPos, setEditingTextPos] = useState<any>({ x: 0, y: 0 });

  function handleTextDblClick(
    e: KonvaEventObject<MouseEvent>,
    lyricText: LyricText
  ) {
    const absPos = e.target.getAbsolutePosition();

    console.log(e);

    setEditingTextPos({ x: e.evt.clientX, y: e.evt.clientY });

    updateEditingStatus();
    setEditingText(lyricText);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.keyCode === 13) {
      console.log(visibleLyricTextIndex, editingText);

      if (visibleLyricTextIndex !== undefined && editingText) {
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
      setEditingText(undefined);
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

  return (
    <div>
      <Stage width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
        <Layer>
          {visibleLyricTexts.map((lyricText) => (
            <KonvaText
              fontSize={20}
              align="center"
              draggable
              onDragEnd={(evt: KonvaEventObject<DragEvent>) =>
                handleDragEnd(evt, lyricText)
              }
              text={lyricText.text}
              x={lyricText.textX * PREVIEW_WIDTH}
              y={lyricText.textY * PREVIEW_HEIGHT}
              wrap="word"
              onDblClick={(evt: KonvaEventObject<DragEvent>) =>
                handleTextDblClick(evt, lyricText)
              }
            />
          ))}
        </Layer>
      </Stage>
      <textarea
        value={editingText?.text}
        style={{
          display: editingText ? "block" : "none",
          position: "absolute",
          top: editingTextPos.y,
          left: editingTextPos.x,
        }}
        onChange={(e) => {
          if (editingText) {
            setEditingText({ ...editingText, text: e.target.value });
          }
        }}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
