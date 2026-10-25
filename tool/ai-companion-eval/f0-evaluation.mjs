import { readFileSync } from 'node:fs';
import { LocalModelLane } from '../../backend/dist/src/ai-runtime/infrastructure/local-model-lane.js';
import { LocalFirstFlowTransport } from '../../backend/dist/src/ai-runtime/infrastructure/local-first-flow-transport.js';

/** Separate F0 corpus: does not change the approved 32-case cloud experiment.
 * f0-run.mjs requires a separately assigned physical model slot. */
export function loadF0Cases() {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/f0-cases.json', import.meta.url)));
  if (fixture.schemaVersion !== 'f0_synthetic_cases_v1' || fixture.cases.length !== 8 ||
      new Set(fixture.cases.map(c => c.id)).size !== 8 || fixture.cases.some(c => !c.criteria || !c.input))
    throw Error('F0_CORPUS_INVALID');
  return fixture;
}

/** Captures the actual F0 serializer through an injected fake. No model call. */
export async function prepareF0Case(fixture) {
  let captured;
  const lane = new LocalModelLane('qwen3.5:9b', async (url, init) => {
    captured = { url, body: init.body };
    return Response.json({ model: 'qwen3.5:9b', done: true, message: { content: '{}' } });
  });
  await new LocalFirstFlowTransport(lane).generate(fixture.input,
    { signal: new AbortController().signal, deadline: 45000, remainingMs: () => 45000 });
  return captured;
}
