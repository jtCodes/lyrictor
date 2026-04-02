import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";
import {
  DEFAULT_TEXT_PREVIEW_FONT_COLOR,
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  DEFAULT_TEXT_PREVIEW_FONT_WEIGHT,
  LyricText,
} from "../../types";
import {
  rgbToRgbaString,
  rgbToRgbaStringWithOpacity,
} from "../../AudioTimeline/Tools/CustomizationSettingRow";
import { ensureFontReady, getFontLoadSpec } from "./fontLoad";

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
  isEditMode?: boolean;
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
  isEditMode = true,
  ...rest
}: ResizableTextProps) {
  const textRef = useRef(null);
  const transformerRef = useRef(null);
  const blurRadius = Number((rest as { blurRadius?: number }).blurRadius ?? 0);
  const filters = (rest as { filters?: unknown[] }).filters;
  const fontFamily = lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME;
  const fontWeight = lyricText.fontWeight ?? DEFAULT_TEXT_PREVIEW_FONT_WEIGHT;
  const fontSize = lyricText.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE;
  const letterSpacing = lyricText.letterSpacing ?? 0;
  const textFillOpacity = lyricText.textFillOpacity ?? 1;
  const textGlowBlur = lyricText.textGlowBlur ?? 0;
  const textGlowColor = lyricText.textGlowColor;
  const resolvedGlowColor = textGlowColor
    ? rgbToRgbaString(textGlowColor)
    : "rgba(182, 214, 255, 0.45)";
  const resolvedTextFill = lyricText.fontColor
    ? rgbToRgbaStringWithOpacity(lyricText.fontColor, textFillOpacity)
    : `rgba(255, 255, 255, ${textFillOpacity})`;

  function refreshTextRendering() {
    if (textRef.current === null) {
      return;
    }

    const textNode = textRef.current as any;

    if (blurRadius > 0 && filters && filters.length > 0) {
      textNode.clearCache();
      textNode.cache();
    } else if (textNode.isCached && textNode.isCached()) {
      textNode.clearCache();
    }

    const textLayer = textNode.getLayer();

    if (textLayer) {
      textLayer.batchDraw();
    }

    if (isSelected && transformerRef.current !== null) {
      const transformer = transformerRef.current as any;
      transformer.nodes([textNode]);
      transformer.getLayer()?.batchDraw();
    }
  }

  useEffect(() => {
    if (isSelected && transformerRef.current !== null) {
      const refCurrent = transformerRef.current as any;
      refCurrent.nodes([textRef.current]);
      refCurrent.getLayer().batchDraw();
    }
  }, [isSelected]);

  useEffect(() => {
    if (textRef.current === null) {
      return;
    }

    refreshTextRendering();
  }, [blurRadius, filters, fontFamily, fontSize, fontWeight, letterSpacing, lyricText.text, width, isSelected]);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    const fontSpec = getFontLoadSpec(fontFamily, fontWeight, fontSize);

    if (document.fonts.check(fontSpec)) {
      return;
    }

    let isDisposed = false;

    ensureFontReady(fontFamily, fontWeight, fontSize).then(() => {
      if (isDisposed) {
        return;
      }

      refreshTextRendering();
    });

    return () => {
      isDisposed = true;
    };
  }, [fontFamily, fontSize, fontWeight, blurRadius, filters, letterSpacing, width, isSelected]);

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
      {textGlowBlur > 0 ? (
        <>
          <Text
            x={x}
            y={y}
            text={lyricText.text}
            fontStyle={String(lyricText.fontWeight ?? DEFAULT_TEXT_PREVIEW_FONT_WEIGHT)}
            fill={resolvedGlowColor}
            opacity={0.34}
            fontFamily={fontFamily}
            fontSize={fontSize}
            letterSpacing={letterSpacing}
            width={width}
            listening={false}
            perfectDrawEnabled={false}
            shadowColor={resolvedGlowColor}
            shadowBlur={textGlowBlur * 2.2}
            shadowOpacity={1}
          />
          <Text
            x={x}
            y={y}
            text={lyricText.text}
            fontStyle={String(lyricText.fontWeight ?? DEFAULT_TEXT_PREVIEW_FONT_WEIGHT)}
            fill={resolvedGlowColor}
            opacity={0.72}
            fontFamily={fontFamily}
            fontSize={fontSize}
            letterSpacing={letterSpacing}
            width={width}
            listening={false}
            perfectDrawEnabled={false}
            shadowColor={resolvedGlowColor}
            shadowBlur={textGlowBlur * 1.15}
            shadowOpacity={1}
          />
        </>
      ) : null}
      <Text
        x={x}
        y={y}
        ref={textRef}
        text={lyricText.text}
        fontStyle={String(lyricText.fontWeight ?? DEFAULT_TEXT_PREVIEW_FONT_WEIGHT)}
        fill={
          lyricText.fontColor || textFillOpacity !== 1
            ? resolvedTextFill
            : DEFAULT_TEXT_PREVIEW_FONT_COLOR
        }
        fontFamily={fontFamily}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        draggable={isEditMode}
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
