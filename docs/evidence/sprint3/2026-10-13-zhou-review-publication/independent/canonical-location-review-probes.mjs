import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

const source = "<REPO_ROOT>/backend/src/ai-conversation/domain/canonical-ai-message-location.ts";
const { parseCanonicalAiMessageLocation: parse } = await import(pathToFileURL(source).href);
const bytes = readFileSync(source);
const normalized = Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"));
const blob = createHash("sha1").update(`blob ${normalized.length}\0`).update(normalized).digest("hex");
console.log(JSON.stringify({ review: "canonical-location-only", sourceGitBlob: blob, sourceSha256: createHash("sha256").update(bytes).digest("hex"), node: process.version }));

const owner = "12345678-1234-4123-8abc-123456789abc";
const conversation = "87654321-4321-4321-9abc-abcdef012345";
const leaf = "fedcba98-7654-4321-a123-0123456789ab";
const groups = ["messages", "message_sources"];
const path = (ids = [owner, conversation, leaf], group = "messages") => `accounts/${ids[0]}/conversations/${ids[1]}/${group}/${ids[2]}`;

test("all four UUID variants are accepted without losing exact ID identity", () => {
  for (const group of groups) for (const variant of ["8", "9", "a", "b"]) for (let at = 0; at < 3; at++) {
    const ids = [owner, conversation, leaf];
    ids[at] = ids[at].slice(0, 19) + variant + ids[at].slice(20);
    assert.deepEqual(parse(path(ids, group), group), { ownerAccountId: ids[0], conversationId: ids[1], collection: group, messageId: ids[2] });
  }
});

test("noncanonical ID spellings cannot be cleaned, decoded or Unicode-normalized", () => {
  const invalid = [
    owner.toUpperCase(), owner.replaceAll("-", ""), `{${owner}}`, `urn:uuid:${owner}`,
    owner.replace("1", "%31"), owner.replace("-", "%2d"), owner.replace("-", "\u2010"),
    owner.replace("1", "\uff11"), `${owner}\r`, `${owner}\r\n`, `${owner}\u2028`,
    `${owner}\u2029`, `${owner}\0`, `\ufeff${owner}`, `${owner}\u200b`, `${owner}\\`,
    owner.replace("-4123-", "-0123-"), owner.replace("-4123-", "-5123-"),
    owner.replace("-8abc-", "-cabc-"), owner.replace("-8abc-", "-7abc-"),
  ];
  for (const group of groups) for (const bad of invalid) for (let at = 0; at < 3; at++) {
    const ids = [owner, conversation, leaf]; ids[at] = bad;
    assert.equal(parse(path(ids, group), group), undefined);
  }
});

test("relative structure does not accept database names, encoded ancestors, traversal or suffix repair", () => {
  for (const group of groups) {
    const p = path(undefined, group);
    const bad = [
      `projects/demo-a/databases/(default)/documents/${p}`,
      `projects/demo-b/databases/named-db/documents/${p}`,
      `https://firestore.googleapis.com/v1/projects/demo-a/databases/(default)/documents/${p}`,
      `//${p}`, `./${p}`, `../${p}`, `${p}/.`, `${p}/..`, `${p}?alt=json`, `${p}#fragment`,
      p.replace("accounts", "%61ccounts"), p.replace("conversations", "Conversations"),
      p.replace("accounts/", "accounts\\"), p.replaceAll("/", "\u2215"),
      `fixture/${owner}/${p}`, `${p}/${group}/${leaf}`,
    ];
    for (const value of bad) assert.equal(parse(value, group), undefined);
  }
});

test("same leaf under each distinct owner, conversation and collection remains a distinct location", () => {
  const owners = [owner, conversation]; const conversations = [conversation, leaf];
  const locations = [];
  for (const o of owners) for (const c of conversations) for (const group of groups) {
    const p = path([o, c, leaf], group); const result = parse(p, group);
    assert.deepEqual(result, { ownerAccountId: o, conversationId: c, collection: group, messageId: leaf });
    locations.push(JSON.stringify(result));
    assert.equal(parse(p, group === "messages" ? "message_sources" : "messages"), undefined);
  }
  assert.equal(new Set(locations).size, 8);
});

test("unknown input never invokes coercion and an invalid group cannot bypass its own check", () => {
  let coerced = false;
  const value = { toString() { coerced = true; throw new Error("must not coerce"); } };
  for (const input of [value, new String(path()), 1n, Symbol("synthetic"), () => path()]) {
    assert.equal(parse(input, "messages"), undefined);
  }
  for (const group of [value, new String("messages"), null, undefined, "Messages", "messages/", "message_sources/../messages"]) {
    assert.equal(parse(path(), group), undefined);
  }
  assert.equal(coerced, false);
});

test("output is immutable structural identity only, with no implicit authority or existence", () => {
  const result = parse(path(), "messages");
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => { result.ownerAccountId = conversation; }, TypeError);
  assert.deepEqual(Object.keys(result).sort(), ["collection", "conversationId", "messageId", "ownerAccountId"]);
  for (const key of ["exists", "isOwner", "authorized", "canRead", "canDelete", "available", "parentExists"]) {
    assert.equal(key in result, false);
  }
});
