import assert from "node:assert/strict";
import test from "node:test";
import { parseCanonicalAiMessageLocation } from "../../src/ai-conversation/domain/canonical-ai-message-location.js";

const owner = "00000000-0000-4000-8000-000000000001";
const conversation = "00000000-0000-4000-8000-000000000002";
const message = "00000000-0000-4000-8000-000000000003";
const root = `accounts/${owner}/conversations/${conversation}`;

for (const collection of ["messages", "message_sources"] as const) {
  test(`C-A ${collection} canonical ancestor returns only selected private identities`, () => {
    const parsed = parseCanonicalAiMessageLocation(`${root}/${collection}/${message}`, collection);
    assert.deepEqual(parsed, { ownerAccountId: owner, conversationId: conversation, collection, messageId: message });
    assert.equal(Object.isFrozen(parsed), true);
  });

  test(`C-A ${collection} rejects other or nested ancestors and database resource names`, () => {
    for (const path of [
      `unowned/${owner}/conversations/${conversation}/${collection}/${message}`,
      `accounts/${owner}/other/${conversation}/${collection}/${message}`,
      `${root}/effects/${message}`,
      `fixtures/${owner}/${root}/${collection}/${message}`,
      `projects/demo-isolated/databases/(default)/documents/${root}/${collection}/${message}`,
      `${root}/${collection}/${message}/children/${message}`,
      `${root}/${collection}`,
      `/${root}/${collection}/${message}`,
      `${root}/${collection}/${message}/`,
      `${root}//${collection}/${message}`,
    ]) assert.equal(parseCanonicalAiMessageLocation(path, collection), undefined);
  });

  test(`C-A ${collection} rejects malformed or noncanonical business IDs without normalization`, () => {
    for (const invalid of ["", "plain-opaque", owner.toUpperCase().replace("000000000001", "00000000000A"),
      "00000000-0000-1000-8000-000000000001", "00000000-0000-4000-7000-000000000001",
      ` ${owner}`, `${owner} `, `${owner}\n`, `${owner}%2F${owner}`, "\ud800"] ) {
      for (const path of [
        `accounts/${invalid}/conversations/${conversation}/${collection}/${message}`,
        `accounts/${owner}/conversations/${invalid}/${collection}/${message}`,
        `${root}/${collection}/${invalid}`,
      ]) assert.equal(parseCanonicalAiMessageLocation(path, collection), undefined);
    }
  });
}

test("C-A same leaf message ID in different parents retains the full owner/conversation identity", () => {
  const secondOwner = "00000000-0000-4000-9000-000000000004";
  const secondConversation = "00000000-0000-4000-a000-000000000005";
  const first = parseCanonicalAiMessageLocation(`${root}/messages/${message}`, "messages")!;
  const second = parseCanonicalAiMessageLocation(`accounts/${secondOwner}/conversations/${secondConversation}/messages/${message}`, "messages")!;
  assert.equal(first.messageId, second.messageId);
  assert.notEqual(first.ownerAccountId, second.ownerAccountId);
  assert.notEqual(first.conversationId, second.conversationId);
});

test("C-A parsing does not infer a missing parent, document existence or deletion authorization", () => {
  // Pure structure is identical for a live parent, an orphan, and a deleted
  // cursor reference. The separate store must establish each semantic fact.
  const parsed = parseCanonicalAiMessageLocation(`${root}/message_sources/${message}`, "message_sources");
  assert.deepEqual(Object.keys(parsed!).sort(), ["collection", "conversationId", "messageId", "ownerAccountId"]);
  assert.equal("canDelete" in parsed!, false);
});

test("C-A unknown values and an unexpected collection fail closed", () => {
  for (const path of [undefined, null, [], {}, 1, true]) {
    assert.equal(parseCanonicalAiMessageLocation(path, "messages"), undefined);
  }
  assert.equal(parseCanonicalAiMessageLocation(`${root}/message_sources/${message}`, "messages"), undefined);
  assert.equal(parseCanonicalAiMessageLocation(`${root}/messages/${message}`, "message_sources"), undefined);
  assert.equal(parseCanonicalAiMessageLocation(`${root}/messages/${message}`, "effects" as "messages"), undefined);
});
