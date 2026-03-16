import { useEffect, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";

interface AudioTimelineCursorProps {
  width: number;
  height: number;
}

export default function AudioTimelineCursor(props: AudioTimelineCursorProps) {
  const { width, height } = props;
  const [cursorX, setCursorX] = useState<number>(0);
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });

  useEffect(() => {
    setCursorX((percentComplete / 100) * width);
  }, [position, width]);

  return (
    <Stage
      width={width}
      height={height}
      onClick={(e: any) => {
        seek((e.evt.layerX / width) * duration);
        console.log(e.evt.layerX);
      }}
    >
      <Layer>
        <Rect x={cursorX} y={0} width={1} height={height} fill="red" />
      </Layer>
    </Stage>
  );
}
