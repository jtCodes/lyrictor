import {
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  LyricText,
} from "../../types";

export function estimateTextBounds(
  lyricText: LyricText,
  previewWidth: number
): { width: number; height: number } {
  const fontFamily = lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME;
  const fontWeight = lyricText.fontWeight ?? 400;
  const fontSize =
    (lyricText.fontSize ? lyricText.fontSize / 1000 : 0.02) * previewWidth;
  const explicitWidth = lyricText.width
    ? Math.min(previewWidth, lyricText.width * previewWidth)
    : undefined;
  const explicitHeight = lyricText.height;
  const lines = lyricText.text.split(/\r?\n/);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      width: explicitWidth ?? 0,
      height: explicitHeight ?? fontSize,
    };
  }

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const measuredWidth = Math.max(
    ...lines.map((line) => context.measureText(line || " ").width),
    1
  );

  return {
    width: explicitWidth ?? measuredWidth,
    height: explicitHeight ?? Math.max(fontSize, lines.length * fontSize * 1.18),
  };
}

export function getCenteredTextPosition({
  lyricText,
  previewWidth,
  previewHeight,
}: {
  lyricText: LyricText;
  previewWidth: number;
  previewHeight: number;
}) {
  const bounds = estimateTextBounds(lyricText, previewWidth);

  return {
    textX: Math.max(0, (previewWidth - bounds.width) / 2 / previewWidth),
    textY: Math.max(0, (previewHeight - bounds.height) / 2 / previewHeight),
  };
}