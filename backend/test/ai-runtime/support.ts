import assert from "node:assert/strict";
import type { Admission, RuntimeRequest, RuntimeWork } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import type { GenerationTransport, RequestBudget } from "../../src/ai-runtime/ports/generation-transport.js";
import type { RuntimeClock } from "../../src/ai-runtime/ports/runtime-clock.js";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export class FakeClock implements RuntimeClock {
  time = 0;
  private nextId = 0;
  private readonly timers = new Map<number, { instant: number; wake: () => void }>();
  now(): number { return this.time; }
  get pending(): number { return this.timers.size; }
  at(instant: number, wake: () => void): () => void {
    const id = this.nextId++;
    this.timers.set(id, { instant, wake });
    return () => { this.timers.delete(id); };
  }
  advance(milliseconds: number): void {
    const end = this.time + milliseconds;
    while (true) {
      const due = [...this.timers].filter(([, timer]) => timer.instant <= end)
        .sort((a, b) => a[1].instant - b[1].instant || a[0] - b[0])[0];
      if (!due) break;
      this.time = Math.max(this.time, due[1].instant);
      this.timers.delete(due[0]);
      due[1].wake();
    }
    this.time = end;
  }
}

export class FakeTransport implements GenerationTransport<string> {
  readonly calls: { input: string; budget: RequestBudget; completion: ReturnType<typeof deferred<Uint8Array>> }[] = [];
  generate(input: string, budget: RequestBudget): Promise<Uint8Array> {
    const completion = deferred<Uint8Array>();
    this.calls.push({ input, budget, completion });
    return completion.promise;
  }
}

export const raw = (text: string): Uint8Array => new TextEncoder().encode(text);
export const valid = (message = "A quiet moment."): Uint8Array => raw(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message }));
export const work = (input = "synthetic"): RuntimeWork<string> => ({
  purpose: "ai_assistant_message_v1",
  prepare: async () => input,
  // Test-only checkpoint, deliberately NOT a semantic/authority validator.
  checkCandidate: async () => ({ ok: true, value: undefined }),
});
export function accepted(admission: Admission): RuntimeRequest {
  assert.equal(admission.accepted, true);
  if (!admission.accepted) throw new Error("Expected accepted fixture");
  return admission.request;
}
export async function flush(): Promise<void> {
  for (let turn = 0; turn < 12; turn++) await Promise.resolve();
}
