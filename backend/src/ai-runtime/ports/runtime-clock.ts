/** All instants use one monotonic millisecond epoch, never UTC/wall time. */
export interface RuntimeClock {
  now(): number;
  /** Wake at/after the instant, asynchronously. Cancellation is idempotent. */
  at(instant: number, wake: () => void): () => void;
}
