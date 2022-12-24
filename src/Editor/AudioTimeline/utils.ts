import WaveformData from "waveform-data";
import { scaleY } from "../utils";

export async function generateWaveformDataThroughHttp(
  audioContext: AudioContext,
  url: string
) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const options = {
    audio_context: audioContext,
    array_buffer: buffer,
    scale: 10000,
  };
  return await new Promise<WaveformData>((resolve, reject) => {
    WaveformData.createFromAudio(options, (err, waveform) => {
      if (err) {
        reject(err);
      } else {
        resolve(waveform);
      }
    });
  });
}

export function generateWaveformLinePoints(
  waveform: WaveformData,
  width: number,
  graphHeight: number
): number[] {
  let points: number[] = [];
  const yPadding = 30;

  const channel = waveform.channel(0);
  const xOffset = width / waveform.length;

  // Loop forwards, drawing the upper half of the waveform
  for (let x = 0; x < waveform.length; x++) {
    const val = channel.max_sample(x);
    points.push(
      x * xOffset,
      scaleY(val, graphHeight - yPadding) + yPadding / 4
    );
  }

  // Loop backwards, drawing the lower half of the waveform
  for (let x = waveform.length - 1; x >= 0; x--) {
    const val = channel.min_sample(x);

    points.push(
      x * xOffset,
      scaleY(val, graphHeight - yPadding) + yPadding / 4
    );
  }

  return points;
}

/**
 * E.g. if the visible area is 99% of the full area, the scrollbar is 99% of the height.
 * Likewise if the visible is 50% of the full area, the scrollbar is 50% of the height.
 * Just be sure to make the minimum size something reasonable (e.g. at least 18-20px)
 */
export function calculateHorizontalScrollbarLength(
  windowWidth: number | undefined,
  width: number
): number {
  let length: number = 20;

  if (windowWidth) {
    if (windowWidth < width) {
      if ((windowWidth / width) * windowWidth > 20) {
        length = (windowWidth / width) * windowWidth;
      }
    }
  }

  return length;
}

export function calculateVerticalScrollbarLength(
  height: number,
  stageHeight: number
): number {
  let length: number = 20;

  if ((height / stageHeight) * height > 20) {
    length = (height / stageHeight) * height;
  }

  return length;
}
