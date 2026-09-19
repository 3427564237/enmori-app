import assert from "node:assert/strict";
import test from "node:test";

import { GetInterestTags } from "../../src/interests/application/get-interest-tags.js";
import { GetOwnInterests } from "../../src/interests/application/get-own-interests.js";
import { ReplaceOwnInterests } from "../../src/interests/application/replace-own-interests.js";
import type { InterestRepository } from "../../src/interests/ports/interest-repository.js";

const principal = { firebaseUid: "firebase-member-001" };

function repository(
  replaceKind: Awaited<ReturnType<InterestRepository["replaceOwn"]>>["kind"] = "saved",
): InterestRepository {
  return {
    listActive: async () => ({
      kind: "found",
      value: [{ interestTagId: "tag-a", displayName: "Art" }],
    }),
    getOwn: async () => ({
      kind: "found",
      value: { interestTags: [], revision: 0 },
    }),
    replaceOwn: async () => {
      switch (replaceKind) {
        case "saved":
          return {
            kind: "saved",
            value: { interestTags: [], revision: 1 },
          };
        case "onboarding_required":
          return { kind: "onboarding_required" };
        case "selection_invalid":
          return { kind: "selection_invalid" };
        case "revision_precondition_failed":
          return { kind: "revision_precondition_failed" };
        case "dependency_unavailable":
          return { kind: "dependency_unavailable" };
      }
    },
  };
}

test("Interest reads map onboarding and dependency failures", async () => {
  for (const kind of ["onboarding_required", "dependency_unavailable"] as const) {
    const source: InterestRepository = {
      ...repository(),
      listActive: async () => ({ kind }),
      getOwn: async () => ({ kind }),
    };
    const tags = await new GetInterestTags(source).execute(principal);
    const own = await new GetOwnInterests(source).execute(principal);
    assert.equal(tags.ok, false);
    assert.equal(own.ok, false);
    if (tags.ok || own.ok) throw new Error("failure fixture unexpectedly passed");
    assert.equal(
      tags.failure.code,
      kind === "onboarding_required" ? "ONBOARDING_REQUIRED" : "SERVICE_UNAVAILABLE",
    );
    assert.equal(own.failure.code, tags.failure.code);
  }
});

test("ReplaceOwnInterests accepts empty, one and ten distinct IDs", async () => {
  const captured: unknown[] = [];
  const source: InterestRepository = {
    ...repository(),
    replaceOwn: async (input) => {
      captured.push(input);
      return { kind: "saved", value: { interestTags: [], revision: 1 } };
    },
  };
  const useCase = new ReplaceOwnInterests(source);
  for (const ids of [[], ["tag-a"], Array.from({ length: 10 }, (_, i) => `tag-${i}`)]) {
    assert.equal(
      (await useCase.execute({ principal, interestTagIds: ids, expectedRevision: 0 })).ok,
      true,
    );
  }
  assert.equal(captured.length, 3);
});

test("ReplaceOwnInterests rejects invalid input before persistence", async () => {
  let calls = 0;
  const source: InterestRepository = {
    ...repository(),
    replaceOwn: async () => {
      calls += 1;
      return { kind: "saved", value: { interestTags: [], revision: 1 } };
    },
  };
  const useCase = new ReplaceOwnInterests(source);
  const invalid = [
    { interestTagIds: ["tag-a", "tag-a"], expectedRevision: 0 },
    { interestTagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`), expectedRevision: 0 },
    { interestTagIds: [""], expectedRevision: 0 },
    { interestTagIds: ["tag-a"], expectedRevision: -1 },
    { interestTagIds: ["tag-a"], expectedRevision: 1.5 },
  ];
  for (const current of invalid) {
    const result = await useCase.execute({ principal, ...current });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("invalid fixture unexpectedly passed");
    assert.equal(result.failure.code, "INTEREST_SELECTION_INVALID");
  }
  assert.equal(calls, 0);
});

test("ReplaceOwnInterests keeps stale revision distinct from invalid selection", async () => {
  const stale = await new ReplaceOwnInterests(
    repository("revision_precondition_failed"),
  ).execute({ principal, interestTagIds: ["tag-a"], expectedRevision: 2 });
  const invalid = await new ReplaceOwnInterests(repository("selection_invalid")).execute({
    principal,
    interestTagIds: ["tag-a"],
    expectedRevision: 2,
  });
  assert.equal(stale.ok, false);
  assert.equal(invalid.ok, false);
  if (stale.ok || invalid.ok) throw new Error("failure fixture unexpectedly passed");
  assert.equal(stale.failure.code, "INTEREST_REVISION_PRECONDITION_FAILED");
  assert.equal(invalid.failure.code, "INTEREST_SELECTION_INVALID");
});
