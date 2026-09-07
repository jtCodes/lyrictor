export interface PreparationTask {
  priority: () => number;
  run: (signal: AbortSignal) => Promise<void>;
}
interface Job extends PreparationTask { abort: AbortController; done: boolean }
export interface PreparationState { preparing: boolean; queued: boolean; completed: number; total: number }

/** One preparation queue per audio player. Every way of starting playback uses it. */
export class PlaybackPreparation {
  private jobs = new Set<Job>();
  private listeners = new Set<() => void>();
  private scheduled = false;
  private running = false;
  private play: (() => void) | undefined;
  private state: PreparationState = { preparing: false, queued: false, completed: 0, total: 0 };
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() {
    const completed = [...this.jobs].filter(job => job.done).length;
    this.state = { preparing: completed < this.jobs.size, queued: Boolean(this.play), completed, total: this.jobs.size };
    this.listeners.forEach(listener => listener());
  }
  register(task: PreparationTask) {
    const job: Job = { ...task, abort: new AbortController(), done: false };
    this.jobs.add(job);
    this.publish();
    this.schedule();
    return () => {
      job.abort.abort();
      this.jobs.delete(job);
      if (!this.jobs.size) this.play = undefined;
      this.publish();
    };
  }
  requestPlay(play: () => void) {
    if (!this.state.preparing && !this.running && !this.scheduled) { play(); return; }
    this.play = play;
    this.publish();
  }
  cancelPlay() { this.play = undefined; this.publish(); }
  togglePlayRequest(play: () => void) {
    if (this.play) this.cancelPlay();
    else this.requestPlay(play);
  }
  dispose() {
    this.play = undefined;
    this.jobs.forEach(job => job.abort.abort());
    this.jobs.clear();
    this.publish();
  }
  private schedule() {
    if (this.scheduled || this.running) return;
    this.scheduled = true;
    // Let the scene commit all its text refs before sorting the expensive work.
    setTimeout(() => { this.scheduled = false; void this.drain(); }, 0);
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        const next = [...this.jobs].filter(job => !job.done)
          .sort((a, b) => b.priority() - a.priority())[0];
        if (!next) break;
        try { await next.run(next.abort.signal); }
        catch (error) {
          if (!next.abort.signal.aborted) console.warn("Preview preparation failed; using the live renderer.", error);
        }
        next.done = true;
        this.publish();
      }
    } finally {
      this.running = false;
      const play = this.play;
      this.play = undefined;
      this.publish();
      play?.();
    }
  }
}
