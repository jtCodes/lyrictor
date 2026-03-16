import WaveformData from "waveform-data";
import { scaleY } from "../utils";

export function getVisibleSongRange({
  width,
  windowWidth,
  duration,
  scrollXOffSet,
}: {
  width: number;
  windowWidth: number | undefined;
  duration: number;
  scrollXOffSet: number;
}): number[] {
  const from = (Math.abs(scrollXOffSet) / width) * duration;
  const to =
    ((Math.abs(scrollXOffSet) + (windowWidth ?? 0)) / width) * duration;
  return [from, to];
}

const GRAPH_HEIGHT = 90;

export async function generateWaveformData(
  url: string,
  audioContext: AudioContext
): Promise<WaveformData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
  }
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
  width: number
): number[] {
  const points: number[] = [];
  const yPadding = 30;

  const channel = waveform.channel(0);
  const xOffset = width / waveform.length;

  // Loop forwards, drawing the upper half of the waveform
  for (let x = 0; x < waveform.length; x++) {
    const val = channel.max_sample(x);
    points.push(
      x * xOffset,
      scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
    );
  }

  // Loop backwards, drawing the lower half of the waveform
  for (let x = waveform.length - 1; x >= 0; x--) {
    const val = channel.min_sample(x);
    points.push(
      x * xOffset,
      scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
    );
  }

  return points;
}
