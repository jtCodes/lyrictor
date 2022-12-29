import React, { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";

export function ResizableText({
  x,
  y,
  text,
  isSelected,
  width,
  onResize,
  onClick,
  onDoubleClick,
}: {
  x: number;
  y: number;
  text: string;
  isSelected: boolean;
  width: number;
  onResize: (newWidth: number, newHeight: number) => void;
  onClick: () => void;
  onDoubleClick: (e: any) => void;
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
        text={text}
        fill="white"
        fontFamily="sans-serif"
        fontSize={24}
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
