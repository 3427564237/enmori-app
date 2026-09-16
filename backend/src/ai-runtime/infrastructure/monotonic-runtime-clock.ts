import { performance } from "node:perf_hooks";
import type { RuntimeClock } from "../ports/runtime-clock.js";

export class MonotonicRuntimeClock implements RuntimeClock {
  now(): number { return performance.now(); }

  at(instant: number, wake: () => void): () => void {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = (): void => {
      if (cancelled) return;
      const remaining = instant - this.now();
      if (remaining > 0) timer = setTimeout(check, Math.ceil(remaining));
      else wake();
    };
    timer = setTimeout(check, Math.max(0, Math.ceil(instant - this.now())));
    return () => { cancelled = true; clearTimeout(timer); };
  }
}
