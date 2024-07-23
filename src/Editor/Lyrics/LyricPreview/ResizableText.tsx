import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";
import {
  DEFAULT_TEXT_PREVIEW_FONT_COLOR,
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../types";
import { rgbToRgbaString } from "../../AudioTimeline/Tools/CustomizationSettingRow";

export interface ResizableTextProps extends React.ComponentProps<typeof Text> {
  x: number;
  y: number;
  lyricText: LyricText;
  isSelected: boolean;
  width: number | undefined;
  onResize: (newWidth: number, newHeight: number) => void;
  onClick: () => void;
  onDoubleClick: (e: any) => void;
  onDragStart: (evt: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (evt: KonvaEventObject<DragEvent>) => void;
  onDragMove: (evt: KonvaEventObject<DragEvent>) => void;
}

export function ResizableText({
  x,
  y,
  lyricText,
  isSelected,
  width,
  onResize,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragMove,
  ...rest
}: ResizableTextProps) {
  const textRef = useRef(null);
  const transformerRef = useRef(null);

  useEffect(() => {
    if (isSelected && transformerRef.current !== null) {
      const refCurrent = transformerRef.current as any;
      refCurrent.nodes([textRef.current]);
      refCurrent.getLayer().batchDraw();
    }
  }, [isSelected]);

  function handleResize() {
    if (textRef.current !== null) {
      const textNode = textRef.current as any;
      const newWidth = textNode.width() * textNode.scaleX();
      const newHeight = textNode.height() * textNode.scaleY();
      textNode.setAttrs({
        width: newWidth,
        scaleX: 1,
      });
      onResize(newWidth, newHeight);
    }
  }

  const transformer = isSelected ? (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      flipEnabled={false}
      enabledAnchors={["middle-left", "middle-right"]}
      boundBoxFunc={(oldBox, newBox) => {
        return newBox;
      }}
    />
  ) : null;

  return (
    <>
      <Text
        x={x}
        y={y}
        ref={textRef}
        text={lyricText.text}
        fontStyle={String(lyricText.fontWeight ?? 400)}
        fill={
          lyricText.fontColor
            ? rgbToRgbaString(lyricText.fontColor)
            : DEFAULT_TEXT_PREVIEW_FONT_COLOR
        }
        fontFamily={lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME}
        fontSize={lyricText.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        perfectDrawEnabled={false}
        onTransform={handleResize}
        onClick={onClick}
        onTap={onClick}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        width={width}
        {...rest}
      />
      {transformer}
    </>
  );
}
