import { SceneCanvas } from "konva/lib/Canvas";
import type { Text } from "konva/lib/shapes/Text";

type Matrix = [number, number, number, number, number, number];
export interface BlurSnapshot {
  key: string;
  matrix: Matrix;
  x: number;
  y: number;
  width: number;
  height: number;
  sampledWidth: number;
  sampledHeight: number;
  margin: number;
  clipped: { left: boolean; top: boolean; right: boolean; bottom: boolean };
}
interface Entry extends BlurSnapshot { canvas: SceneCanvas; bytes: number }
const MAX_BYTES = 64 * 1024 * 1024;
const MIN_PIXELS = 128 * 1024;
const entries = new Map<Text, Entry>();
const pending = new Map<Text, () => void>();
const pendingResults = new WeakMap<Text, Promise<void>>();
const pinned = new Set<Text>();
const previousFrames = new WeakMap<Text, { key: string; matrix: Matrix }>();
let bytes = 0;

export function hasPreparedBlur(node: Text, key: string, matrix: Matrix) {
  const entry = entries.get(node);
  return Boolean(entry && entry.key === key && rigidDelta(entry.matrix, matrix,
    Math.max(entry.width, entry.height))) || pending.has(node);
}
export function canPrepareBlur() { return pending.size < 1 && typeof Worker !== "undefined"; }
export function supportsBlurPreparation() { return typeof Worker !== "undefined"; }
export function waitForPreparedBlur(node: Text) { return pendingResults.get(node) ?? Promise.resolve(); }
export function retainPreparedBlur(node: Text) { if (entries.has(node)) pinned.add(node); }

export function canRetainPreparedBlur(width: number, height: number) {
  const reserved = [...pinned].reduce((total, node) => total + (entries.get(node)?.bytes ?? 0), 0);
  return canCacheBlur(width, height) && reserved + width*height*4 <= MAX_BYTES;
}

// Don't allocate/copy a new cache on every frame of a focus or zoom animation.
// Cache a first encounter, then wait for reusable pixels before replacing it.
export function shouldStoreRenderedBlur(node: Text, snapshot: BlurSnapshot) {
  const previous = previousFrames.get(node);
  previousFrames.set(node, { key: snapshot.key, matrix: snapshot.matrix });
  return !previous || (previous.key === snapshot.key && Boolean(rigidDelta(
    previous.matrix, snapshot.matrix, Math.max(snapshot.width, snapshot.height)
  )));
}

// Position is applied when compositing. Everything affecting the actual pixels
// remains in the key. Animated gradients and shadows use the normal renderer.
const placementAttrs = new Set([
  "x", "y", "rotation", "scaleX", "scaleY", "skewX", "skewY", "offsetX", "offsetY",
  "visible", "listening", "draggable", "blurRadius",
]);
export function blurCacheKey(node: Text, output: CanvasRenderingContext2D, radius: number, sampling: number) {
  if (node.hasShadow() || node.fillPriority() !== "color" || node.hasStroke()) return undefined;
  const attrs = Object.fromEntries(Object.entries(node.getAttrs()).filter(
    ([key, value]) => !placementAttrs.has(key) && typeof value !== "function"
  ));
  return JSON.stringify([attrs, output.globalAlpha, output.canvas.width, output.canvas.height,
    radius.toFixed(6), sampling.toFixed(8)]);
}

export function releaseBlurCache(node: Text) {
  pending.get(node)?.();
  pending.delete(node);
  pinned.delete(node);
  const entry = entries.get(node);
  if (!entry) return;
  bytes -= entry.bytes;
  entry.canvas.setSize(0, 0);
  entries.delete(node);
}

// A cached screen image can move/rotate without changing an isotropic blur.
// Zoom/skew changes need fresh pixels, apart from subpixel settling at the
// very end of an eased move (less than 0.1 physical pixel across the image).
export function rigidDelta(from: Matrix, to: Matrix, extent = 4096): Matrix | undefined {
  const [a,b,c,d,e,f] = from;
  const det = a*d-b*c;
  if (Math.abs(det) < 1e-10) return;
  const da = (to[0]*d-to[2]*b)/det;
  const db = (to[1]*d-to[3]*b)/det;
  const dc = (to[2]*a-to[0]*c)/det;
  const dd = (to[3]*a-to[1]*c)/det;
  const tolerance = 0.1 / Math.max(1, extent);
  if (Math.abs(da*da+db*db-1) > tolerance || Math.abs(dc*dc+dd*dd-1) > tolerance ||
      Math.abs(da*dc+db*dd) > tolerance || da*dd-db*dc < 0) return;
  return [da,db,dc,dd,to[4]-da*e-dc*f,to[5]-db*e-dd*f];
}

export function drawCachedBlur(node: Text, output: CanvasRenderingContext2D, key: string, matrix: Matrix) {
  const entry = entries.get(node);
  if (!entry || entry.key !== key) return false;
  const delta = rigidDelta(entry.matrix, matrix, Math.max(entry.width, entry.height));
  if (!delta) return false;
  const [a,b,c,d,e,f] = delta;
  // If the original image was viewport-clipped, never expose its cut edges.
  for (const [x,y] of [[0,0],[output.canvas.width,0],[0,output.canvas.height],[output.canvas.width,output.canvas.height]]) {
    const determinant = a*d-b*c;
    const sx = (d*(x-e)-c*(y-f))/determinant, sy = (-b*(x-e)+a*(y-f))/determinant;
    if ((entry.clipped.left && sx < entry.x+entry.margin) ||
        (entry.clipped.right && sx > entry.x+entry.width-entry.margin) ||
        (entry.clipped.top && sy < entry.y+entry.margin) ||
        (entry.clipped.bottom && sy > entry.y+entry.height-entry.margin)) return false;
  }
  entries.delete(node);
  entries.set(node, entry);
  output.save();
  output.setTransform(...delta);
  output.globalAlpha = 1;
  output.shadowColor = "transparent";
  output.shadowBlur = 0;
  output.imageSmoothingEnabled = true;
  output.imageSmoothingQuality = "high";
  output.drawImage(entry.canvas._canvas, 0, 0, entry.sampledWidth, entry.sampledHeight,
    entry.x, entry.y, entry.width, entry.height);
  output.restore();
  return true;
}

export function canCacheBlur(width: number, height: number) {
  return width*height >= MIN_PIXELS && width*height*4 <= MAX_BYTES;
}

export function storeBlur(node: Text, snapshot: BlurSnapshot, source: HTMLCanvasElement | ImageData, retain = false) {
  if (!canCacheBlur(snapshot.sampledWidth, snapshot.sampledHeight)) return;
  // Pre-playback images stay available for later cues and repeat playback.
  // Live focus animations must not evict or replace them.
  if (pinned.has(node)) return;
  if (!canRetainPreparedBlur(snapshot.sampledWidth, snapshot.sampledHeight)) return;
  releaseBlurCache(node);
  const cost = snapshot.sampledWidth * snapshot.sampledHeight * 4;
  for (const candidate of entries.keys()) {
    if (bytes + cost <= MAX_BYTES) break;
    if (!pinned.has(candidate)) releaseBlurCache(candidate);
  }
  const canvas = new SceneCanvas({ width: snapshot.sampledWidth, height: snapshot.sampledHeight, pixelRatio: 1 });
  const raw = canvas.getContext()._context;
  if ("data" in source) raw.putImageData(source, 0, 0);
  else raw.drawImage(source, 0, 0, snapshot.sampledWidth, snapshot.sampledHeight,
    0, 0, snapshot.sampledWidth, snapshot.sampledHeight);
  entries.set(node, { ...snapshot, canvas, bytes: cost });
  bytes += cost;
  if (retain) pinned.add(node);
}

export function prepareBlur(node: Text, snapshot: BlurSnapshot, pixels: ImageData, radius: number, passes: number) {
  if (pending.has(node) || !canCacheBlur(pixels.width, pixels.height)) return;
  // Keep preparation bounded too. A worker prevents the CPU blur itself from
  // stalling the currently playing cue. Terminate it when done or cancelled.
  if (pending.size >= 1 || typeof Worker === "undefined") return;
  let worker: Worker;
  try { worker = new Worker(new URL("./blurCache.worker.ts", import.meta.url), { type: "module" }); }
  catch { return; }
  let resolve: () => void;
  pendingResults.set(node, new Promise<void>(done => { resolve = done; }));
  const cancel = () => { worker.terminate(); clearTimeout(timeout); resolve(); };
  const timeout = setTimeout(() => {
    cancel();
    if (pending.get(node) === cancel) pending.delete(node);
  }, 10000);
  pending.set(node, cancel);
  worker.onerror = () => { cancel(); if (pending.get(node) === cancel) pending.delete(node); };
  worker.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    cancel();
    if (pending.get(node) !== cancel) return;
    pending.delete(node);
    storeBlur(node, snapshot, new ImageData(new Uint8ClampedArray(event.data), pixels.width, pixels.height), true);
  };
  try {
    worker.postMessage({ width: pixels.width, height: pixels.height, data: pixels.data.buffer, radius, passes }, [pixels.data.buffer]);
  } catch { cancel(); pending.delete(node); }
}
