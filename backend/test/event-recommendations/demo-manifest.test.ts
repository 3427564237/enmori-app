import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseMatchingInterest, parseRecommendationEvent } from
  "../../src/event-recommendations/infrastructure/event-records.js";

const MANIFEST_PATH = "backend/fixtures/s2-event-demo-manifest.v1.json";
const EXPECTED_DIGEST = "d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b";
const EXPECTED_PATHS = [
  "interest_tags/interest_community",
  "interest_tags/interest_music",
  "events/s2_demo_community_early",
  "events/s2_demo_music_early",
  "events/s2_demo_community_music",
  "events/s2_demo_community_late",
] as const;

type Manifest = {
  readonly manifestVersion: unknown;
  readonly documents: readonly {
    readonly path: unknown;
    readonly data: unknown;
  }[];
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

test("named Demo manifest is fixed, bounded and contract-valid", async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  assert.equal(manifest.manifestVersion, "s2-event-demo-v1");
  assert.deepEqual(manifest.documents.map(({ path }) => path), EXPECTED_PATHS);
  assert.equal(new Set(manifest.documents.map(({ path }) => path)).size, EXPECTED_PATHS.length);

  for (const entry of manifest.documents) {
    assert.equal(typeof entry.path, "string");
    assert.equal(entry.data !== null && typeof entry.data === "object" && !Array.isArray(entry.data), true);
    const data = entry.data as Record<string, unknown>;
    if (typeof entry.path !== "string") throw new Error("manifest path must be a string");
    const [collection, id, unexpected] = entry.path.split("/");
    assert.equal(unexpected, undefined);
    if (collection === "interest_tags") {
      assert.notEqual(parseMatchingInterest(id!, data), undefined);
    } else {
      assert.equal(collection, "events");
      assert.notEqual(parseRecommendationEvent(id!, data), undefined);
    }
    assert.equal(Object.keys(data).some((key) =>
      /credential|secret|password|token|endpoint|url|account|delete|reset/i.test(key)), false);
  }

  const digest = createHash("sha256").update(canonicalJson(manifest)).digest("hex");
  assert.equal(digest, EXPECTED_DIGEST);
});
