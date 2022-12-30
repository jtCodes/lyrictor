import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";
import { DEFAULT_TEXT_PREVIEW_FONT_COLOR, DEFAULT_TEXT_PREVIEW_FONT_NAME, DEFAULT_TEXT_PREVIEW_FONT_SIZE, LyricText } from "../../types";

export function ResizableText({
  x,
  y,
  text,
  isSelected,
  width,
  onResize,
  onClick,
  onDoubleClick,
  onDragEnd,
}: {
  x: number;
  y: number;
  text: LyricText;
  isSelected: boolean;
  width: number | undefined;
  onResize: (newWidth: number, newHeight: number) => void;
  onClick: () => void;
  onDoubleClick: (e: any) => void;
  onDragEnd: (evt: KonvaEventObject<DragEvent>) => void;
}) {
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
        newBox.width = Math.max(30, newBox.width);
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
        text={text.text}
        fill={text.fontColor ?? DEFAULT_TEXT_PREVIEW_FONT_COLOR}
        fontFamily={text.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME}
        fontSize={text.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE}
        draggable={true}
        onDragEnd={onDragEnd}
        perfectDrawEnabled={false}
        onTransform={handleResize}
        onClick={onClick}
        onTap={onClick}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        width={width}
      />
      {transformer}
    </>
  );
}
