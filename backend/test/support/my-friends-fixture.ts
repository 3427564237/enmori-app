import type { FirestoreGateway, StoredDocument } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { friendPairKey } from "../../src/friends/infrastructure/firestore-friend-repository.js";
import { ok } from "../../src/shared/domain/result.js";

export const instant = "2026-10-07T00:00:00.000Z";
export const clock = { now: () => ok(new Date(instant)) };
export const entryRef = (n: number) => `${n.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`;
export const account = (id: string): StoredDocument => ({ username: `member_${id}`, displayName: `Member ${id}`, profileVisibility: "friends_only", profileRevision: 1,
  optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: instant });
export function myFriendsSeed(count = 1): Record<string, StoredDocument> {
  const seed: Record<string, StoredDocument> = {};
  for (const id of ["owner", ...Array.from({ length: count }, (_, n) => `target_${n + 1}`)]) {
    seed[`auth_bindings/${createAuthBindingDocumentId(id)}`] = { accountId: id };
    seed[`accounts/${id}`] = account(id);
    seed[`friend_access/${id}`] = { eligibilityState: "eligible" };
    seed[`username_reservations/member_${id}`] = { accountId: id };
    seed[`friend_lists/${id}`] = { initialized: true };
  }
  for (let n = 1; n <= count; n++) {
    const id = `target_${n}`, key = friendPairKey("owner", id);
    seed[`friend_pairs/${key}`] = { accountIds: ["owner", id].sort(), blockedByAccountIds: [], friendship: true, pending: null, listRefs: { owner: entryRef(n), [id]: entryRef(n + 1000) } };
    seed[`friend_lists/owner/members/${entryRef(n)}`] = { pairKey: key };
    seed[`friend_lists/${id}/members/${entryRef(n + 1000)}`] = { pairKey: key };
  }
  return seed;
}

export interface ReadAttempt { paths: string[]; scanned: number; queries: number }
export function measuredGateway(source: FirestoreGateway): { gateway: FirestoreGateway; attempts: ReadAttempt[] } {
  const attempts: ReadAttempt[] = [];
  return { attempts, gateway: { runTransaction: work => source.runTransaction(async tx => {
    const attempt: ReadAttempt = { paths: [], scanned: 0, queries: 0 }; attempts.push(attempt);
    return work({ ...tx,
      get: async path => { attempt.paths.push(path); return tx.get(path); },
      list: async () => { throw new Error("unbounded list forbidden"); },
      listPage: async (path, after, limit) => {
        if (tx.listPage === undefined || limit !== 21) throw new Error("invalid bounded scan");
        const rows = await tx.listPage(path, after, limit); attempt.queries++; attempt.scanned += rows.length; return rows;
      },
      create: (path, data) => tx.create(path, data),
      set: (path, data) => tx.set(path, data),
      ...(tx.delete === undefined ? {} : { delete: (path: string) => tx.delete!(path) }),
    });
  }) } };
}
