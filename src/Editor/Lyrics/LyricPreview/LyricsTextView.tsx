import { KonvaEventObject } from "konva/lib/Node";
import { Text as KonvaText } from "react-konva";
import { useEffect, useState } from "react";
import { useEditorStore } from "../../store";
import {
  DEFAULT_TEXT_PREVIEW_HEIGHT,
  DEFAULT_TEXT_PREVIEW_WIDTH,
  LyricText,
} from "../../types";
import { EditableTextInput } from "./EditableTextInput";
import { ResizableText } from "./ResizableText";
import { rgbToRgbaString } from "../../AudioTimeline/Tools/CustomizationSettingRow";

const RETURN_KEY = 13;
const ESCAPE_KEY = 27;

export interface LyricsTextViewProps
  extends React.ComponentProps<typeof KonvaText> {
  x: number;
  y: number;
  onEscapeKeysPressed: (lyricText: LyricText) => void;
  onResize: (newWidth: number, newHeight: number) => void;
  onDragStart: (evt: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (evt: KonvaEventObject<DragEvent>) => void;
  onDragMove: (evt: KonvaEventObject<DragEvent>) => void;
  lyricText: LyricText;
  width: number | undefined;
  height: number | undefined;
  previewWindowWidth: number;
  previewWindowHeight: number;
  isEditMode?: boolean;
}

export function LyricsTextView({
  x,
  y,
  onEscapeKeysPressed,
  onResize,
  onDragStart,
  onDragEnd,
  onDragMove,
  lyricText,
  width,
  height,
  previewWindowWidth,
  previewWindowHeight,
  isEditMode = true,
}: LyricsTextViewProps) {
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
  const [editingTextWidth, setEditingTextWidth] = useState<
    number | undefined
  >();
  const [editingTextHeight, setEditingTextHeight] = useState<
    number | undefined
  >();
  const editingText = useEditorStore((state) => state.editingText);
  const setEditingText = useEditorStore((state) => state.setEditingText);

  useEffect(() => {
    if (isEditing) {
      setEditingText(lyricText);
    }
  }, [isEditing]);

  useEffect(() => {
    if (editingText && editingText.id !== lyricText.id) {
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
    if (editingText) {
      setEditingText({ ...lyricText, text: e.currentTarget.value });
    }
  }

  function handleDoubleClick(e: any) {
    if (isEditMode) {
      setEditingTextWidth(e.target.textWidth);
      setEditingTextHeight(e.target.textHeight);
      setIsEditing(!isEditing);
    }
  }

  if (editingText && editingText.id === lyricText.id) {
    return (
      <EditableTextInput
        x={x}
        y={y}
        width={editingTextWidth ?? DEFAULT_TEXT_PREVIEW_WIDTH}
        height={editingTextHeight ?? DEFAULT_TEXT_PREVIEW_HEIGHT}
        value={{
          ...editingText,
          fontSize:
            (editingText.fontSize ? editingText.fontSize / 1000 : 0.02) *
            previewWindowWidth,
        }}
        onChange={handleTextChange}
        onKeyDown={handleEscapeKeys}
      />
    );
  }

  return (
    <ResizableText
      isEditMode={isEditMode}
      x={x}
      y={y}
      isSelected={selectedTimelineLyricTextIds.has(lyricText.id)}
      onClick={() => {
        if (isEditMode) {
          setSelectedTimelineTextIds(new Set([lyricText.id]));
          toggleCustomizationPanelState(true);
        }
      }}
      onDoubleClick={handleDoubleClick}
      onResize={onResize}
      lyricText={{
        ...lyricText,
        fontSize:
          (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) *
          previewWindowWidth,
      }}
      width={isEditing ? editingTextWidth : width}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      fill={
        lyricText.fontColor ? rgbToRgbaString(lyricText.fontColor) : "white"
      }
      shadowBlur={lyricText.shadowBlur}
      shadowColor={
        lyricText.shadowColor
          ? rgbToRgbaString(lyricText.shadowColor)
          : undefined
      }
    />
  );
}
