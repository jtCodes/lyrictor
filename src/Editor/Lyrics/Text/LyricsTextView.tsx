import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
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
  width: number;
  height: number;
}) {
  const selectedTextId = useEditorStore((state) => state.selectedTextIds)
  const updateSelectedTextIds = useEditorStore((state) => state.updateSelectedTextIds)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const editingText = useEditorStore((state) => state.editingText);
  const setEditingText = useEditorStore((state) => state.setEditingText);

  useEffect(() => {
    if (isEditing) {
      setEditingText(text);
    }
  }, [isEditing]);

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

  function handleDoubleClick() {
    setIsEditing(!isEditing);
  }

  if (isEditing && editingText) {
    return (
      <EditableTextInput
        x={x}
        y={y}
        width={width}
        height={height}
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
      isSelected={selectedTextId.has(text.id)}
      onClick={() => {
        updateSelectedTextIds([text.id])
      }}
      onDoubleClick={handleDoubleClick}
      onResize={onResize}
      text={text}
      width={width}
      onDragEnd={onDragEnd}
    />
  );
}
