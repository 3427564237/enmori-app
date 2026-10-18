import { ControlledSourceProjection } from "../event-browse/infrastructure/controlled-source-projection.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";

/** Private process capability, never an HTTP/phone/config enable flag. An explicitly selected bounded
 * process cache is cleared on disable. Disabling invalidates pending results, not bytes already
 * delivered to a client; client removal remains a separate operator obligation. */
export function createControlledEventBrowse(options: {
  readonly source?: BrowseSource;
  readonly projectionCache?: true;
  readonly running: () => boolean;
  readonly track: <T>(work: () => Promise<T>) => Promise<T>;
}) {
  const projection = options.source && options.projectionCache ? new ControlledSourceProjection(options.source) : undefined;
  const selected = projection ?? options.source;
  let enabled = false, epoch = {};
  const pending = new Set<AbortController>();
  const unavailable = () => new Error("CONTROLLED_EVENT_BROWSE_UNAVAILABLE");
  function disable() {
    enabled = false; epoch = {}; projection?.clear();
    for (const controller of pending) controller.abort();
    // Aborted I/O remains tracked until its original promise actually settles.
  }
  function enable() {
    if (!options.source || !options.running()) throw unavailable();
    enabled = true;
  }
  async function read<T>(signal: AbortSignal, work: (source: BrowseSource, signal: AbortSignal) => Promise<T>): Promise<T> {
    if (!enabled || !options.running() || !options.source || signal.aborted) throw unavailable();
    const admitted = epoch, controller = new AbortController();
    const combined = AbortSignal.any([signal, controller.signal]);
    pending.add(controller);
    try {
      return await options.track(async () => {
        const result = await work(selected!, combined);
        if (!enabled || !options.running() || admitted !== epoch || combined.aborted) throw unavailable();
        return result;
      });
    } finally { pending.delete(controller); }
  }
  const source: BrowseSource = {
    firstBatch: (asOf, signal) => read(signal, (value, current) => value.firstBatch(asOf, current)),
    detail: (id, asOf, signal) => read(signal, (value, current) => value.detail(id, asOf, current)),
  };
  return { source, enable, disable,
    observation: () => ({ configured: options.source !== undefined, enabled: enabled && options.running(), pending: pending.size }),
  };
}
