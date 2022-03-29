import { KonvaEventObject } from "konva/lib/Node";
import React, { useState } from "react";
import { Layer, Stage, Text as KonvaText } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { useEditorStore } from "../store";
import { LyricText } from "./types";
import { getCurrentLyric, getCurrentLyricIndex } from "./utils";

export default function LyricPreview() {
  const lyricTexts = useEditorStore((state) => state.lyricTexts);
  const setLyricTexts = useEditorStore((state) => state.updateLyricTexts);
  const updateEditingStatus = useEditorStore((state) => state.updateEditingStatus);

  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });
  const maxEndTime = lyricTexts[lyricTexts.length - 1].end;
  const visibleLyricText: LyricText | undefined = getCurrentLyric(
    lyricTexts,
    position,
    maxEndTime
  );
  const visibleLyricTextIndex: number | undefined = getCurrentLyricIndex(
    lyricTexts,
    position,
    maxEndTime
  );
  const [editingText, setEditingText] = useState<LyricText | undefined>();

  function handleTextDblClick(e: KonvaEventObject<MouseEvent>) {
    const absPos = e.target.getAbsolutePosition();
    let newTextObj = { ...visibleLyricText };
    newTextObj.textX = absPos.x;
    newTextObj.textY = absPos.y;

    updateEditingStatus()
    setEditingText(visibleLyricText);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.keyCode === 13) {
      console.log(visibleLyricTextIndex, editingText);
      if (visibleLyricTextIndex !== undefined && editingText) {
        let newLyricTexts = [...lyricTexts];
        newLyricTexts[visibleLyricTextIndex] = editingText;

        console.log("haha")
        setLyricTexts(newLyricTexts);
      }
      updateEditingStatus()
      setEditingText(undefined);
    }
  }

  return (
    <div>
      <Stage width={500} height={200}>
        <Layer>
          <KonvaText
            fontSize={20}
            align={"left"}
            draggable
            text={visibleLyricText?.text}
            x={20}
            y={20}
            wrap="word"
            width={100}
            onDblClick={handleTextDblClick}
          />
        </Layer>
      </Stage>
      <textarea
        value={editingText?.text}
        style={{
          display: editingText ? "block" : "none",
          position: "absolute",
          top: visibleLyricText?.textY + "px",
          left: visibleLyricText?.textX + "px",
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
