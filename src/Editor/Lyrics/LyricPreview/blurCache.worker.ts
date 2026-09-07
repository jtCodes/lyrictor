import { Blur } from "konva/lib/filters/Blur";
import type { Text } from "konva/lib/shapes/Text";

self.onmessage = (event: MessageEvent<{
  width: number; height: number; data: ArrayBuffer; radius: number; passes: number;
}>) => {
  const { width, height, data, radius, passes } = event.data;
  const pixels = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let index = 0; index < passes; index++) Blur.call({ blurRadius: () => radius } as Text, pixels);
  self.postMessage(data, { transfer: [data] });
};
