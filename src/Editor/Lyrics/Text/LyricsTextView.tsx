import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";
import { useEditorStore } from "../../store";
import {
  DEFAULT_TEXT_PREVIEW_HEIGHT,
  DEFAULT_TEXT_PREVIEW_WIDTH,
  LyricText,
} from "../../types";
import { EditableTextInput } from "./EditableTextInput";
import { ResizableText } from "./ResizableText";

const RETURN_KEY = 13;
const ESCAPE_KEY = 27;

export function LyricsTextView({
  x,
  y,
  onEscapeKeysPressed,
  onResize,
  onDragEnd,
  text,
  width,
  height,
}: {
  x: number;
  y: number;
  onEscapeKeysPressed: (lyricText: LyricText) => void;
  onResize: (newWidth: number, newHeight: number) => void;
  onDragEnd: (evt: KonvaEventObject<DragEvent>) => void;
  text: LyricText;
  width: number | undefined;
  height: number | undefined;
}) {
  const selectedTimelineLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const setSelectedTimelineTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingTextWidth, setEditingTextWidth] =
    useState<number | undefined>();
  const [editingTextHeight, setEditingTextHeight] =
    useState<number | undefined>();
  const editingText = useEditorStore((state) => state.editingText);
  const setEditingText = useEditorStore((state) => state.setEditingText);

  useEffect(() => {
    if (isEditing) {
      setEditingText(text);
    }
  }, [isEditing]);

  useEffect(() => {
    if (editingText && editingText.id !== text.id) {
      setIsEditing(false);
    }
  }, [editingText]);

  function handleEscapeKeys(e: any) {
    if ((e.keyCode === RETURN_KEY && !e.shiftKey) || e.keyCode === ESCAPE_KEY) {
      setIsEditing(!isEditing);

      if (editingText) {
        onEscapeKeysPressed(editingText);
      }
    }
  }

  function handleTextChange(e: any) {
    setEditingText({ ...text, text: e.currentTarget.value });
  }

  function handleDoubleClick(e: any) {
    setEditingTextWidth(e.target.textWidth);
    setEditingTextHeight(e.target.textHeight);
    setIsEditing(!isEditing);
  }

  if (editingText && editingText.id === text.id) {
    return (
      <EditableTextInput
        x={x}
        y={y}
        width={editingTextWidth ?? DEFAULT_TEXT_PREVIEW_WIDTH}
        height={editingTextHeight ?? DEFAULT_TEXT_PREVIEW_HEIGHT}
        value={editingText}
        onChange={handleTextChange}
        onKeyDown={handleEscapeKeys}
      />
    );
  }

  return (
    <ResizableText
      x={x}
      y={y}
      isSelected={selectedTimelineLyricTextIds.has(text.id)}
      onClick={() => {
        setSelectedTimelineTextIds(new Set([text.id]));
        toggleCustomizationPanelState(true)
      }}
      onDoubleClick={handleDoubleClick}
      onResize={onResize}
      text={text}
      width={isEditing ? editingTextWidth : width}
      onDragEnd={onDragEnd}
    />
  );
}
