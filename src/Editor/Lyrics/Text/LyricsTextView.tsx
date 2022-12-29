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
  isTransforming,
  onToggleEdit,
  onToggleTransform,
  onEscapeKeysPressed,
  onResize,
  text,
  width,
  height,
}: {
  x: number;
  y: number;
  isTransforming: boolean;
  onToggleEdit: (e: any) => void;
  onToggleTransform: () => void;
  onEscapeKeysPressed: (lyricText: LyricText) => void;
  onResize: () => void;
  text: LyricText;
  width: number;
  height: number;
}) {
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
        value={editingText.text}
        onChange={handleTextChange}
        onKeyDown={handleEscapeKeys}
      />
    );
  }

  return (
    <ResizableText
      x={x}
      y={y}
      isSelected={isTransforming}
      onClick={onToggleTransform}
      onDoubleClick={handleDoubleClick}
      onResize={onResize}
      text={text.text}
      width={width}
    />
  );
}
