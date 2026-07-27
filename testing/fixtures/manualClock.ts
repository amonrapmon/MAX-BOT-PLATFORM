import type { Clock } from "../../contracts/runtime.js";

interface PendingSleep {
  deadlineMs: number;
  sequence: number;
  resolve: () => void;
  reject: (reason?: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

export class ManualClock implements Clock {
  private currentMs: number;
  private sequence = 0;
  private sleepers: PendingSleep[] = [];

  constructor(start = "1970-01-01T00:00:00.000Z") {
    const parsed = Date.parse(start);
    if (!Number.isFinite(parsed)) {
      throw new RangeError(`Invalid clock start: ${start}`);
    }
    this.currentMs = parsed;
  }

  get pendingSleepCount(): number {
    return this.sleepers.length;
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (!Number.isFinite(ms) || ms < 0) {
      return Promise.reject(new RangeError("Sleep duration must be a non-negative finite number"));
    }
    if (signal?.aborted) {
      return Promise.reject(abortReason(signal));
    }
    if (ms === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const sleeper: PendingSleep = {
        deadlineMs: this.currentMs + ms,
        sequence: this.sequence++,
        resolve,
        reject,
      };

      this.sleepers.push(sleeper);

      if (signal) {
        const onAbort = () => {
          this.sleepers = this.sleepers.filter((candidate) => candidate !== sleeper);
          signal.removeEventListener("abort", onAbort);
          reject(abortReason(signal));
        };
        sleeper.signal = signal;
        sleeper.onAbort = onAbort;
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      }

      this.sleepers.sort(
        (left, right) =>
          left.deadlineMs - right.deadlineMs || left.sequence - right.sequence,
      );
    });
  }

  async advanceBy(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError("Advance duration must be a non-negative finite number");
    }
    this.currentMs += ms;
    await this.resolveDueSleepers();
  }

  async advanceTo(iso: string): Promise<void> {
    const targetMs = Date.parse(iso);
    if (!Number.isFinite(targetMs)) {
      throw new RangeError(`Invalid target time: ${iso}`);
    }
    if (targetMs < this.currentMs) {
      throw new RangeError("ManualClock cannot move backwards");
    }
    this.currentMs = targetMs;
    await this.resolveDueSleepers();
  }

  private async resolveDueSleepers(): Promise<void> {
    const due = this.sleepers.filter((sleeper) => sleeper.deadlineMs <= this.currentMs);
    this.sleepers = this.sleepers.filter((sleeper) => sleeper.deadlineMs > this.currentMs);

    for (const sleeper of due) {
      if (sleeper.signal && sleeper.onAbort) {
        sleeper.signal.removeEventListener("abort", sleeper.onAbort);
      }
      sleeper.resolve();
    }

    await Promise.resolve();
  }
}

export function createManualClock(start?: string): ManualClock {
  return start === undefined ? new ManualClock() : new ManualClock(start);
}
