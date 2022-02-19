import { Flex } from "@adobe/react-spectrum";
import React, { useEffect, useRef, useState } from "react";
import * as Konva from "konva";
import { Layer, Line, Rect, Stage } from "react-konva";
import { useAudioPosition } from "react-use-audio-player";
import { scaleY } from "./utils";
import { KonvaEventObject } from "konva/lib/Node";

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
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasCtx = canvas?.current?.getContext("2d");
    drawCusor(canvasCtx);

    setCursorX((percentComplete / 100) * width);
  }, [position]);

  function drawCusor(ctx: CanvasRenderingContext2D | null | undefined) {
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.beginPath();
      ctx.strokeStyle = "red";
      ctx.moveTo((percentComplete / 100) * width, 0);
      ctx.lineTo((percentComplete / 100) * width, height);
      ctx.stroke();
    }
  }

  return (
    <Flex direction="row" gap="size-100">
      <Stage
        width={width}
        height={height}
        onClick={(e: any) => {
          seek((e.evt.layerX / width) * duration);
        }}
      >
        <Layer>
          <Rect x={cursorX} y={0} width={1} height={height} fill="red" />
        </Layer>
      </Stage>
    </Flex>
  );
}
