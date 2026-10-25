const unavailable = () => new Error('AI_UNAVAILABLE');

/** Reject duplicate vendor-envelope keys before materializing JSON. Model text
 * inside the envelope stays untouched for the Application's existing parser. */
function envelope(text: string): unknown {
  let at = 0;
  const ws = () => { while (/[\x20\t\r\n]/.test(text[at] ?? '!')) at++; };
  const string = (): string => {
    ws(); const start = at; if (text[at++] !== '"') throw unavailable();
    while (at < text.length) {
      const c = text[at++];
      if (c === '\\') { at++; continue; }
      if (c === '"') {
        const s: unknown = JSON.parse(text.slice(start, at));
        if (typeof s !== 'string' || !s.isWellFormed()) throw unavailable();
        return s;
      }
    }
    throw unavailable();
  };
  const value = (depth: number): void => {
    if (depth > 20) throw unavailable();
    ws(); const c = text[at];
    if (c === '"') { string(); return; }
    if (c === '{' || c === '[') {
      at++; ws(); const end = c === '{' ? '}' : ']', keys = new Set<string>();
      if (text[at] === end) { at++; return; }
      for (;;) {
        if (c === '{') {
          const key = string(); if (keys.has(key)) throw unavailable(); keys.add(key);
          ws(); if (text[at++] !== ':') throw unavailable();
        }
        value(depth + 1); ws();
        if (text[at] === end) { at++; return; }
        if (text[at++] !== ',') throw unavailable();
      }
    }
    const primitive = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));
    if (!primitive) throw unavailable(); at += primitive[0].length;
  };
  value(0); ws(); if (at !== text.length) throw unavailable();
  return JSON.parse(text) as unknown;
}

/** Existing controlled-receiver limits: 1 MiB UTF-8, bounded JSON nesting,
 * no duplicate keys. HTTP/reader/parse failure never proves model settlement. */
export async function readOllamaEnvelope(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw unavailable();
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.length; if (length > 1024 * 1024) throw unavailable();
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return envelope(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); chunks.length = 0; }
}
