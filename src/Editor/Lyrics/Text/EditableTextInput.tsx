import { Html } from "react-konva-utils";
import { DEFAULT_TEXT_PREVIEW_FONT_COLOR, DEFAULT_TEXT_PREVIEW_FONT_NAME, DEFAULT_TEXT_PREVIEW_FONT_SIZE, LyricText } from "../../types";

function getStyle(width: number, height: number, lyricText: LyricText): any {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  const baseStyle = {
    width: `${width}px`,
    height: `${height}px`,
    border: "none",
    padding: "0px",
    margin: "0px",
    background: "none",
    outline: "none",
    resize: "none",
    color: lyricText.fontColor ?? DEFAULT_TEXT_PREVIEW_FONT_COLOR,
    fontSize: lyricText.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE,
    fontFamily: lyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME,
  };
  if (isFirefox) {
    return baseStyle;
  }
  return {
    ...baseStyle,
    margintop: "-4px",
  };
}

export function EditableTextInput({
  x,
  y,
  width,
  height,
  value,
  onChange,
  onKeyDown,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  value: LyricText;
  onChange: (e: any) => void;
  onKeyDown: (e: any) => void;
}) {
  const style = getStyle(width, height, value);
  return (
    <Html groupProps={{ x, y }} divProps={{ style: { opacity: 1 } }}>
      <textarea
        value={value.text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={style}
      />
    </Html>
  );
}
