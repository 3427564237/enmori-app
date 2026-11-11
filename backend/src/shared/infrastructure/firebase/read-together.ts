/** Independent reads in one already-authorized transaction. Drain every read
 * before returning/throwing, and preserve input-order failure precedence. Never
 * use this to move a dependent/content read ahead of its authority check. */
export async function readTogether<T>(reads: readonly (() => Promise<T>)[]): Promise<T[]> {
  const results = await Promise.allSettled(reads.map(read => Promise.resolve().then(read)));
  return results.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}
