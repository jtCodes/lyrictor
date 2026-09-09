import { useAudioPlayer } from "react-use-audio-player";
import { getCurrentAudioPosition } from "../Editor/AudioTimeline/useAudioPosition";
import { RefObject, useEffect, useRef } from "react";
import Konva from "konva";
import type { Layer } from "konva/lib/Layer";
import { useProjectStore } from "./store";
import { createPlaybackPerformanceStats, recordPlaybackFrame } from "./playbackPerformance";

/** On-demand comparison probe. Updates its own label, never React playback state. */
export default function PlaybackPerformanceProbe({ surface }: {
  surface: RefObject<HTMLDivElement | null>;
}) {
  const { playing } = useAudioPlayer();
  const label = useRef<HTMLPreElement>(null);
  const stats = useRef(createPlaybackPerformanceStats());
  const reset = useRef(() => {});
  const lastLayerRates = useRef("—");
  const projectKey = useProjectStore(state => `${state.editingProjectId ?? ""}:${state.editingProject?.audioFileUrl ?? ""}`);
  useEffect(() => { stats.current = createPlaybackPerformanceStats(); }, [projectKey]);

  useEffect(() => {
    const root = surface.current;
    if (!root || !label.current) return;
    let previous: number | undefined;
    let previousAudioPosition: number | undefined;
    let recentLayers: Record<string, number> = {};
    let layerRates = lastLayerRates.current;
    let lastReport = 0, recentFrames = 0, recentMs = 0, recentRate = "—";
    let frameId = 0;
    const namespace = `.playbackProbe${Math.random().toString(36).slice(2)}`;
    const layers = new Map<Layer, number>();

    function report() {
      const total = stats.current;
      const seconds = total.elapsedMs / 1000;
      const canvases = Array.from(root!.querySelectorAll("canvas"));
      const pixels = canvases.reduce((sum, canvas) => sum + canvas.width * canvas.height, 0);
      const upscaled = canvases.filter(canvas => canvas.dataset.previewUpscale === "true");
      const route = window.location.hash || window.location.pathname;
      const status = !playing ? "paused" : document.hidden ? "hidden · excluded" : "recording";
      label.current!.textContent = [
        `Playback comparison · ${route.split("?")[0]} · ${status}`,
        `${seconds.toFixed(1)}s recorded · ${recentRate} recent rAF/s · ${seconds ? (total.frames / seconds).toFixed(1) : "—"} average`,
        `${total.gaps} gaps >25ms · ${total.longGaps} >50ms · worst ${total.maxGapMs.toFixed(1)}ms`,
        `${total.estimatedMissedFrames} estimated missed frames @60Hz (rAF, not GPU presentation)`,
        `${seconds ? (total.draws / seconds).toFixed(0) : "—"} layer draws/s · ${seconds ? (total.drawMs / seconds).toFixed(0) : "—"}ms drawing/s · worst ${total.maxDrawMs.toFixed(1)}ms/draw`,
        `Audio clock: ${seconds ? (total.audioAdvances / seconds).toFixed(1) : "—"} advances/s · ${total.audioRepeats} repeated samples`,
        `Recent layer draws/s: ${layerRates}`,
        `Average layer draws/s: ${Object.entries(total.layerDraws).map(([name, count]) => `${name}=${seconds ? (count / seconds).toFixed(1) : "—"}`).join(" · ") || "—"}`,
        `${canvases.length} canvases · ${(pixels / 1e6).toFixed(2)} MP · ${root!.clientWidth}×${root!.clientHeight} CSS`,
        upscaled.length ? `FSR spatial: ${upscaled.length} layers · ${upscaled.map(canvas => {
          const source = canvas.previousElementSibling as HTMLCanvasElement | null;
          return `${source?.width}×${source?.height} → ${canvas.width}×${canvas.height}`;
        }).join(" · ")}` : "FSR spatial: inactive (native resolution or fallback)",
      ].join("\n");
    }
    reset.current = () => {
      stats.current = createPlaybackPerformanceStats();
      previous = undefined;
      previousAudioPosition = undefined;
      recentLayers = {};
      layerRates = lastLayerRates.current = "—";
      recentFrames = recentMs = lastReport = 0;
      recentRate = "—";
      report();
    };
    report();
    if (!playing) return;

    function bindLayers() {
      const current = new Set<Layer>();
      for (const stage of Konva.stages) {
        if (!root!.contains(stage.container())) continue;
        for (const [index, layer] of stage.getLayers().entries()) {
          const container = stage.container();
          const owner = container.closest("[data-export-non-text-layer]")?.getAttribute("data-export-non-text-layer")
            ?? (container.closest("[data-export-text-stage]") ? "text" : "scene");
          const layerName = `${owner}${index + 1}`;
          current.add(layer);
          if (layers.has(layer)) continue;
          layers.set(layer, 0);
          layer.on(`beforeDraw${namespace}`, () => layers.set(layer, performance.now()));
          layer.on(`draw${namespace}`, () => {
            if (document.hidden) return;
            const elapsed = performance.now() - (layers.get(layer) ?? performance.now());
            stats.current.draws++;
            stats.current.layerDraws[layerName] = (stats.current.layerDraws[layerName] ?? 0) + 1;
            recentLayers[layerName] = (recentLayers[layerName] ?? 0) + 1;
            stats.current.drawMs += elapsed;
            stats.current.maxDrawMs = Math.max(stats.current.maxDrawMs, elapsed);
          });
        }
      }
      for (const layer of layers.keys()) {
        if (!current.has(layer)) { layer.off(namespace); layers.delete(layer); }
      }
    }
    bindLayers();
    const observer = new MutationObserver(bindLayers);
    observer.observe(root, { childList: true, subtree: true });
    function visibilityChanged() {
      // Tab suspension is not a playback frame drop. Start a fresh interval on return.
      previous = undefined;
      previousAudioPosition = undefined;
      recentLayers = {};
      layerRates = lastLayerRates.current = "—";
      recentFrames = recentMs = 0;
      recentRate = "—";
      report();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    function tick(now: number) {
      if (!document.hidden) {
        const audioPosition = getCurrentAudioPosition();
        if (previousAudioPosition !== undefined) {
          if (audioPosition !== previousAudioPosition) stats.current.audioAdvances++;
          else stats.current.audioRepeats++;
        }
        previousAudioPosition = audioPosition;
        if (previous !== undefined) {
          const gap = now - previous;
          recordPlaybackFrame(stats.current, gap);
          recentFrames++;
          recentMs += gap;
        }
        previous = now;
        if (now - lastReport >= 1000) {
          recentRate = recentMs ? (recentFrames * 1000 / recentMs).toFixed(1) : "—";
          layerRates = lastLayerRates.current = Object.entries(recentLayers).map(([name, count]) => `${name}=${recentMs ? (count * 1000 / recentMs).toFixed(1) : "—"}`).join(" · ") || "—";
          report();
          recentLayers = {};
          recentFrames = recentMs = 0;
          lastReport = now;
        }
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      for (const layer of layers.keys()) layer.off(namespace);
    };
  }, [playing, projectKey, surface]);

  return <div style={{ position: "absolute", top: 8, left: 8, zIndex: 40, padding: "6px 8px",
    color: "white", background: "#151515", pointerEvents: "none", maxWidth: "calc(100% - 32px)" }}>
    <pre ref={label} aria-label="Playback performance measurements"
      style={{ margin: 0, font: "11px/1.5 monospace", whiteSpace: "pre-wrap" }} />
    <button type="button" onClick={event => { event.stopPropagation(); reset.current(); }}
      style={{ pointerEvents: "auto", marginTop: 4, color: "white", background: "#303030", border: "1px solid #777", borderRadius: 3, padding: "3px 8px" }}>
      Reset measurements
    </button>
  </div>;
}
