import assert from "node:assert/strict";
import test from "node:test";
import { parseOutput, type OutputPurpose } from "../../src/ai-runtime/domain/parse-output.js";
import { raw, valid } from "./support.js";

const assistant = "ai_assistant_message_v1";
const explanation = "recommendation_explanation_v1";

test("accepts only version-specific complete text candidates, trims outer whitespace", () => {
  for (const schemaVersion of [assistant, explanation] as const) {
    const result = parseOutput(raw(JSON.stringify({ message: "  • One\n• Two 😀  ", schemaVersion })), schemaVersion);
    assert.deepEqual(result, { ok: true, value: { schemaVersion, message: "• One\n• Two 😀" } });
    if (result.ok) assert.equal(Object.isFrozen(result.value), true);
  }
});

const malformed: ReadonlyArray<readonly [string, string]> = [
  ["empty", ""], ["incomplete", '{"schemaVersion":'], ["array root", "[]"],
  ["null root", "null"], ["string root", '"text"'], ["number root", "1"],
  ["empty object", "{}"], ["missing message", '{"schemaVersion":"ai_assistant_message_v1"}'],
  ["missing version", '{"message":"hello"}'],
  ["wrong version", '{"schemaVersion":"v2","message":"hello"}'],
  ["wrong purpose", '{"schemaVersion":"recommendation_explanation_v1","message":"hello"}'],
  ["number message", '{"schemaVersion":"ai_assistant_message_v1","message":1}'],
  ["null message", '{"schemaVersion":"ai_assistant_message_v1","message":null}'],
  ["object message", '{"schemaVersion":"ai_assistant_message_v1","message":{"x":1,"x":2}}'],
  ["array message", '{"schemaVersion":"ai_assistant_message_v1","message":[{"x":1,"x":2}]}'],
  ["unknown property", '{"schemaVersion":"ai_assistant_message_v1","message":"hello","extra":true}'],
  ["prototype key", '{"__proto__":"x","schemaVersion":"ai_assistant_message_v1","message":"hello"}'],
  ["duplicate message", '{"schemaVersion":"ai_assistant_message_v1","message":"a","message":"b"}'],
  ["escaped duplicate", '{"schemaVersion":"ai_assistant_message_v1","message":"a","messa\\u0067e":"b"}'],
  ["duplicate version", '{"schemaVersion":"ai_assistant_message_v1","schemaVersion":"ai_assistant_message_v1","message":"a"}'],
  ["trailing comma", '{"schemaVersion":"ai_assistant_message_v1","message":"hello",}'],
  ["bad escape", '{"schemaVersion":"ai_assistant_message_v1","message":"\\q"}'],
  ["lone surrogate", '{"schemaVersion":"ai_assistant_message_v1","message":"\\ud800"}'],
  ["BOM", '\ufeff{"schemaVersion":"ai_assistant_message_v1","message":"hello"}'],
];
for (const [name, source] of malformed) {
  test(`rejects ${name} without repair or content leakage`, () => {
    assert.deepEqual(parseOutput(raw(source), assistant), { ok: false, failure: "invalid_output" });
  });
}

test("rejects prose/fences/multiple roots/trailing tokens and non-JSON whitespace", () => {
  const json = new TextDecoder().decode(valid());
  for (const source of [`Here: ${json}`, `\x60\x60\x60json\n${json}\n\x60\x60\x60`, json + " {}", json + " null", json + "oops", json + "\u00a0"]) {
    assert.equal(parseOutput(raw(source), assistant).ok, false);
  }
  assert.equal(parseOutput(raw(" \t\r\n" + json + "\n"), assistant).ok, true);
});

test("fatal UTF-8 rejects malformed, overlong, truncated and encoded surrogate bytes", () => {
  for (const bytes of [[0xff], [0xc0, 0xaf], [0xe2, 0x82], [0xed, 0xa0, 0x80]]) {
    const prefix = raw('{"schemaVersion":"ai_assistant_message_v1","message":"');
    assert.equal(parseOutput(new Uint8Array([...prefix, ...bytes, ...raw('"}')]), assistant).ok, false);
  }
});

for (const [purpose, limit] of [[assistant, 2400], [explanation, 800]] as const) {
  test(`${purpose} counts Unicode code points, not bytes/UTF-16 units/graphemes`, () => {
    const parse = (message: string) => parseOutput(raw(JSON.stringify({ schemaVersion: purpose, message })), purpose);
    assert.equal(parse("😀".repeat(limit)).ok, true);
    assert.equal(parse("😀".repeat(limit + 1)).ok, false);
    assert.equal(parse("e\u0301".repeat(limit / 2)).ok, true);
    assert.equal(parse("e\u0301".repeat(limit / 2) + "x").ok, false);
  });
}

const prohibited = [
  "", " \n ", "a\u0000b", "a\tb", "a\rb", "a\u0085b", "a\u202eb", "a\u2066b", "a\u061cb",
  "<script>run()</script>", "<b>bold</b>", "<!-- hidden -->", "```code```", "~~~code~~~",
  '{"tool":"run"}', '[{"tool":"run"}]', "[visit](example)", "![image](source)",
  "https://example.invalid", "www.example.invalid", "example.com", "mailto:user@example.invalid",
  "javascript:run()", "ftp://example.invalid", "127.0.0.1", "tools.execute()", "functions.run()", "tool_call: run", "<|tool_call|>",
];
for (const [index, message] of prohibited.entries()) {
  test(`rejects deterministic prohibited-content fixture ${index + 1}`, () => {
    assert.deepEqual(parseOutput(valid(message), assistant), { ok: false, failure: "invalid_output" });
  });
}

test("rejects unsupported runtime purpose even if an untyped caller matches it", () => {
  assert.equal(parseOutput(raw('{"schemaVersion":"unknown","message":"hello"}'), "unknown" as OutputPurpose).ok, false);
});
