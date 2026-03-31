import { getDirectionVector } from "../Lyrics/Effects/direction";
import { ImageDanceMode, LyricText } from "../types";

const IMAGE_DANCE_CYCLES_PER_SECOND = 1.9;

export interface ImageDanceVector {
  x: number;
  y: number;
  magnitude: number;
}

export interface ImageDanceMotion {
  x: number;
  y: number;
  rotation: number;
  transformOrigin: string;
}

export function clampImageDanceVector(x: number, y: number): ImageDanceVector {
  const magnitude = Math.sqrt(x * x + y * y);

  if (magnitude <= 0.0001) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  if (magnitude <= 1) {
    return { x, y, magnitude };
  }

  return {
    x: x / magnitude,
    y: y / magnitude,
    magnitude: 1,
  };
}

export function resolveImageDanceVector(item: LyricText): ImageDanceVector {
  if (
    typeof item.imageDanceVectorX === "number" &&
    typeof item.imageDanceVectorY === "number"
  ) {
    return clampImageDanceVector(item.imageDanceVectorX, item.imageDanceVectorY);
  }

  if (typeof item.imageDanceDirection === "number") {
    const fallbackVector = getDirectionVector(item.imageDanceDirection);
    return clampImageDanceVector(fallbackVector.x, fallbackVector.y);
  }

  return clampImageDanceVector(1, 0);
}

export function getImageDanceMode(item: LyricText): ImageDanceMode {
  return item.imageDanceMode ?? "line";
}

export function getImageDanceMotion(
  position: number,
  previewWidth: number,
  previewHeight: number,
  danceAmount: number,
  danceMode: ImageDanceMode,
  danceVector: ImageDanceVector
): ImageDanceMotion {
  if (danceAmount <= 0) {
    return {
      x: 0,
      y: 0,
      rotation: 0,
      transformOrigin: "center center",
    };
  }

  const phase = Math.sin(position * IMAGE_DANCE_CYCLES_PER_SECOND * Math.PI * 2);

  if (danceMode === "wiper") {
    const anchorX = 50 + danceVector.x * 35;
    const anchorY = 50 + danceVector.y * 35;

    return {
      x: 0,
      y: 0,
      rotation: phase * danceAmount * 30 * danceVector.magnitude,
      transformOrigin: `${anchorX}% ${anchorY}%`,
    };
  }

  const travelDistance =
    Math.min(previewWidth, previewHeight) * danceAmount * danceVector.magnitude;

  return {
    x: danceVector.x * travelDistance * phase,
    y: danceVector.y * travelDistance * phase,
    rotation: 0,
    transformOrigin: "center center",
  };
}

export function getImageSwayVector(item: LyricText) {
  const vector = resolveImageDanceVector(item);
  return { x: vector.x, y: vector.y };
}