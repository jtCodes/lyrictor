export function createPlaybackPerformanceStats() {
  return { audioAdvances: 0, audioRepeats: 0, layerDraws: {} as Record<string, number>, elapsedMs: 0, frames: 0, gaps: 0, longGaps: 0, estimatedMissedFrames: 0,
    maxGapMs: 0, draws: 0, drawMs: 0, maxDrawMs: 0 };
}

export type PlaybackPerformanceStats = ReturnType<typeof createPlaybackPerformanceStats>;

// A 60 Hz comparison budget, not a measurement of GPU-presented frames.
export function recordPlaybackFrame(stats: PlaybackPerformanceStats, gapMs: number) {
  if (!Number.isFinite(gapMs) || gapMs <= 0) return;
  stats.elapsedMs += gapMs;
  stats.frames++;
  stats.maxGapMs = Math.max(stats.maxGapMs, gapMs);
  if (gapMs > 25) {
    stats.gaps++;
    stats.estimatedMissedFrames += Math.max(0, Math.round(gapMs / (1000 / 60)) - 1);
  }
  if (gapMs > 50) stats.longGaps++;
}
