import { normalizeFriendDisplayName, parseFriendSearchInput, encodeFriendSearchCursor } from "../domain/friend-search.js";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { ok, err } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection, isSafeDocumentId, sha256, isUtcIsoInstant } from "../../shared/infrastructure/firebase/firestore-records.js";
import { parseOwnProfile } from "../../account/infrastructure/firestore-account-preferences-repository.js";
import type { FriendRepository, FriendResult, FriendTarget, FriendInbox, MyFriendsPage, RelationshipState } from "../ports/friend-repository.js";

import { isRequestRef, decodeFriendCursor } from "../domain/request-reference.js";
const lifetime = 30 * 24 * 60 * 60 * 1000;
export const friendPairKey = (a: string, b: string): string => sha256(JSON.stringify([a, b].sort()));
interface Member { id: string; data: StoredDocument }
interface Pending { requestRef: string; senderAccountId: string; recipientAccountId: string; createdAt: string; expiresAt: string }
interface Pair { accountIds: string[]; blockedByAccountIds: string[]; friendship: boolean; pending: Pending | null; listRefs?: Record<string, string> }
function parsePair(data: StoredDocument | undefined, a: string, b: string): Pair | undefined {
  if (data === undefined || !Array.isArray(data.accountIds) || JSON.stringify(data.accountIds) !== JSON.stringify([a,b].sort()) ||
    !Array.isArray(data.blockedByAccountIds) || !data.blockedByAccountIds.every(id => typeof id === "string" && (data.accountIds as unknown[]).includes(id)) ||
    new Set(data.blockedByAccountIds).size !== data.blockedByAccountIds.length || typeof data.friendship !== "boolean") return undefined;
  let pending: Pending | null = null;
  if (data.pending !== null) {
    if (typeof data.pending !== "object" || data.pending === null) return undefined;
    const p = data.pending as Record<string, unknown>;
    if (typeof p.requestRef !== "string" || !isRequestRef(p.requestRef) || typeof p.senderAccountId !== "string" || typeof p.recipientAccountId !== "string" ||
      !data.accountIds.includes(p.senderAccountId) || !data.accountIds.includes(p.recipientAccountId) || p.senderAccountId === p.recipientAccountId ||
      !isUtcIsoInstant(p.createdAt) || !isUtcIsoInstant(p.expiresAt) || new Date(p.expiresAt).getTime() - new Date(p.createdAt).getTime() !== lifetime || data.friendship) return undefined;
    pending = p as unknown as Pending;
  }
  const pair: Pair = { accountIds: [...data.accountIds] as string[], blockedByAccountIds: [...data.blockedByAccountIds] as string[], friendship: data.friendship, pending };
  if (Object.hasOwn(data, "listRefs")) {
    const refs = data.listRefs;
    if (!data.friendship || refs === null || typeof refs !== "object" || Array.isArray(refs) ||
      JSON.stringify(Object.keys(refs).sort()) !== JSON.stringify(pair.accountIds) ||
      !Object.values(refs).every(ref => typeof ref === "string" && isRequestRef(ref)) || new Set(Object.values(refs)).size !== 2) return undefined;
    pair.listRefs = { ...refs } as Record<string, string>;
  }
  return pair;
}
const inboxPath = (accountId: string, ref: string) => `friend_inboxes/${accountId}/requests/${ref}`;
/** Read-only trusted seam for composition; reuses the existing pair parser.
 * The caller supplies its active transaction. No new relation is synthesized. */
export async function readFriendVisibility(tx: FirestoreTransactionGateway, a: string, b: string): Promise<{ isFriend: boolean; isBlocked: boolean }> {
  if (a === b) return { isFriend: false, isBlocked: false };
  const data = await tx.get(`friend_pairs/${friendPairKey(a,b)}`);
  if (data === undefined) return { isFriend: false, isBlocked: false };
  const pair = parsePair(data,a,b);
  if (pair === undefined) throw new Error('Invalid relationship facts');
  return { isFriend: pair.friendship, isBlocked: pair.blockedByAccountIds.length !== 0 };
}
const listPath = (accountId: string, ref: string) => `friend_lists/${accountId}/members/${ref}`;
const initialized = (data: StoredDocument | undefined): boolean => data?.initialized === true && Object.keys(data).length === 1;
const validPointer = (data: StoredDocument | undefined): data is StoredDocument & { pairKey: string } =>
  data !== undefined && Object.keys(data).length === 1 && typeof data.pairKey === "string" && /^[0-9a-f]{64}$/.test(data.pairKey);
function eligibility(data: StoredDocument | undefined): "eligible" | "temporary-ineligible" | "permanently-deleted" | undefined {
  if (data === undefined || Object.keys(data).length !== 1) return undefined;
  const state = data.eligibilityState;
  return state === "eligible" || state === "temporary-ineligible" || state === "permanently-deleted" ? state : undefined;
}
export class FirestoreFriendRepository implements FriendRepository {
  public constructor(private readonly firestore: FirestoreGateway, private readonly clock: Clock) {}
  private now(): number { const now = this.clock.now(); if (!now.ok || !Number.isFinite(now.value.getTime())) throw new Error("unavailable clock"); return now.value.getTime(); }
  private async member(tx: FirestoreTransactionGateway, id: string): Promise<Member | undefined> {
    if (!isSafeDocumentId(id)) return undefined;
    const account = await tx.get(`accounts/${id}`), access = await tx.get(`friend_access/${id}`);
    if (account === undefined || parseAccountProjection(account) === undefined || access?.eligibilityState !== "eligible") return undefined;
    return { id, data: account };
  }
  private async owner(tx: FirestoreTransactionGateway, uid: string): Promise<FriendResult<Member>> {
    const bindingId = createAuthBindingDocumentId(uid);
    if (bindingId === undefined) return err("dependency_unavailable");
    const binding = await tx.get(`auth_bindings/${bindingId}`);
    if (binding === undefined) return err("onboarding_required");
    const id = parseAuthBinding(binding);
    if (id === undefined) return err("dependency_unavailable");
    const member = await this.member(tx, id);
    return member === undefined ? err("forbidden") : ok(member);
  }
  private presentation(member: Member): { username: string; displayName: string } | undefined {
    const profile = parseOwnProfile(member.data);
    return profile?.displayName == null ? undefined : { username: profile.username, displayName: profile.displayName };
  }
  public async authorize(uid: string): Promise<FriendResult<void>> {
    try { return await this.firestore.runTransaction(async tx => { const owner = await this.owner(tx, uid); return owner.ok ? ok(undefined) : owner; }); }
    catch { return err("dependency_unavailable"); }
  }
  public async lookup(uid: string, username: string, send: boolean): Promise<FriendResult<FriendTarget>> {
    try { return await this.firestore.runTransaction(async tx => {
      const own = await this.owner(tx, uid); if (!own.ok) return own;
      const reservation = await tx.get(`username_reservations/${username}`);
      const target = typeof reservation?.accountId === "string" ? await this.member(tx, reservation.accountId) : undefined;
      if (target === undefined) return err("target_unavailable");
      const presentation = this.presentation(target);
      if (presentation === undefined || presentation.username !== username) return err("target_unavailable");
      if (target.id === own.value.id) return ok({ ...presentation, relationshipState: "self" });
      const key = friendPairKey(own.value.id, target.id), path = `friend_pairs/${key}`;
      const pair = parsePair(await tx.get(path), own.value.id, target.id);
      if (pair === undefined || pair.blockedByAccountIds.length !== 0) return err("target_unavailable");
      const now = this.now(), pending = pair.pending;
      let relationshipState: RelationshipState = pair.friendship ? "already_friends" : pending !== null && now < new Date(pending.expiresAt).getTime()
        ? pending.senderAccountId === own.value.id ? "outgoing_request_pending" : "incoming_request_pending" : "can_send_request";
      if (send && relationshipState === "can_send_request") {
        if (tx.delete === undefined) throw new Error("missing transaction delete");
        const requestRef = randomUUID();
        // Check new reference before staging any write; all transaction reads precede writes.
        if (await tx.get(inboxPath(target.id, requestRef)) !== undefined) throw new Error("reference collision");
        if (pending !== null) tx.delete(inboxPath(pending.recipientAccountId, pending.requestRef));
        const fresh: Pending = { requestRef, senderAccountId: own.value.id, recipientAccountId: target.id, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + lifetime).toISOString() };
        tx.set(path, { ...pair, pending: fresh });
        tx.create(inboxPath(target.id, requestRef), { pairKey: key });
        relationshipState = "outgoing_request_pending";
      }
      return ok({ ...presentation, relationshipState });
    }); } catch { return err("dependency_unavailable"); }
  }
  public async inbox(uid: string, cursor?: string): Promise<FriendResult<FriendInbox>> {
    try { return await this.firestore.runTransaction(async tx => {
      const own = await this.owner(tx, uid); if (!own.ok) return own;
      if (tx.listPage === undefined) throw new Error("missing bounded read");
      const after = cursor === undefined ? undefined : decodeFriendCursor(cursor);
      if (cursor !== undefined && after === undefined) throw new Error("invalid internal cursor");
      const rows = await tx.listPage(`friend_inboxes/${own.value.id}/requests`, after, 21);
      const requests: { username: string; displayName: string; requestRef: string }[] = [];
      const now = this.now();
      for (const row of rows.slice(0,20)) {
        if (!isRequestRef(row.id) || typeof row.data.pairKey !== "string" || !/^[0-9a-f]{64}$/.test(row.data.pairKey)) throw new Error("invalid inbox pointer");
        const stored = await tx.get(`friend_pairs/${row.data.pairKey}`);
        const pending = stored?.pending as Pending | null | undefined;
        if (pending == null || pending.requestRef !== row.id || pending.recipientAccountId !== own.value.id) continue;
        const pair = parsePair(stored, pending.senderAccountId, own.value.id);
        if (pair === undefined) throw new Error("invalid pair");
        if (friendPairKey(pending.senderAccountId, own.value.id) !== row.data.pairKey || pair.blockedByAccountIds.length || now >= new Date(pending.expiresAt).getTime()) continue;
        const sender = await this.member(tx, pending.senderAccountId);
        const presentation = sender === undefined ? undefined : this.presentation(sender);
        if (presentation !== undefined) requests.push({ ...presentation, requestRef: row.id });
      }
      return ok({ requests, nextCursor: rows.length > 20 ? Buffer.from(rows[19]!.id).toString("base64url") : null });
    }); } catch { return err("dependency_unavailable"); }
  }
  public async searchFriends(uid: string, input: unknown): Promise<FriendResult<MyFriendsPage>> {
    return this.readFriends(uid, undefined, { input });
  }
  public async listFriends(uid: string, cursor?: string): Promise<FriendResult<MyFriendsPage>> {
    return this.readFriends(uid, cursor);
  }
  private async readFriends(uid: string, cursor?: string, search?: { input: unknown }): Promise<FriendResult<MyFriendsPage>> {
    const listAfter = cursor === undefined ? undefined : decodeFriendCursor(cursor);
    if (cursor !== undefined && listAfter === undefined) return err("invalid_input");
    try { return await this.firestore.runTransaction(async tx => {
      // Current requester authority must be established before any target read.
      const bindingId = createAuthBindingDocumentId(uid);
      if (bindingId === undefined) return err("dependency_unavailable");
      const binding = await tx.get(`auth_bindings/${bindingId}`);
      if (binding === undefined) return err("onboarding_required");
      const ownerId = parseAuthBinding(binding);
      if (ownerId === undefined) return err("dependency_unavailable");
      const owner = await tx.get(`accounts/${ownerId}`);
      const ownerAccess = eligibility(await tx.get(`friend_access/${ownerId}`));
      if (owner === undefined || parseAccountProjection(owner) === undefined || ownerAccess === undefined) return err("dependency_unavailable");
      if (ownerAccess !== "eligible") return err("forbidden");
      // Validate search input after current requester authority, before target reads.
      const parsed = search === undefined ? undefined : parseFriendSearchInput(search.input);
      if (search !== undefined && parsed === undefined) return err("invalid_input");
      const after = parsed?.after ?? listAfter;
      if (!initialized(await tx.get(`friend_lists/${ownerId}`)) || tx.listPage === undefined) return err("dependency_unavailable");
      if (after !== undefined && !validPointer(await tx.get(listPath(ownerId, after)))) return err("invalid_input");
      const rows = await tx.listPage(`friend_lists/${ownerId}/members`, after, 21);
      const friends: { username: string; displayName: string }[] = [];
      for (const row of rows.slice(0, 20)) {
        if (!isRequestRef(row.id) || !validPointer(row.data)) return err("dependency_unavailable");
        const stored = await tx.get(`friend_pairs/${row.data.pairKey}`);
        const ids = stored?.accountIds;
        if (!Array.isArray(ids) || ids.length !== 2 || !ids.includes(ownerId)) return err("dependency_unavailable");
        const targetId: unknown = ids.find(id => id !== ownerId);
        if (typeof targetId !== "string" || !isSafeDocumentId(targetId)) return err("dependency_unavailable");
        const pair = parsePair(stored, ownerId, targetId);
        if (pair === undefined || !pair.friendship || friendPairKey(ownerId, targetId) !== row.data.pairKey || pair.listRefs?.[ownerId] !== row.id) return err("dependency_unavailable");
        if (pair.blockedByAccountIds.length !== 0) continue;
        const access = eligibility(await tx.get(`friend_access/${targetId}`));
        if (access === undefined) return err("dependency_unavailable");
        if (access !== "eligible") continue;
        const account = await tx.get(`accounts/${targetId}`);
        const profile = account === undefined ? undefined : parseOwnProfile(account);
        if (profile === undefined) return err("dependency_unavailable");
        const reservation = await tx.get(`username_reservations/${profile.username}`);
        if (reservation?.accountId !== targetId) return err("dependency_unavailable");
        if (profile.profileVisibility === "private" || profile.displayName === null) continue;
        if (parsed !== undefined && !normalizeFriendDisplayName(profile.displayName).includes(parsed.q)) continue;
        friends.push({ username: profile.username, displayName: profile.displayName });
      }
      return ok({ friends, nextCursor: rows.length > 20 ? (parsed === undefined ? Buffer.from(rows[19]!.id).toString("base64url") : encodeFriendSearchCursor(parsed.q, rows[19]!.id)) : null });
    }); } catch { return err("dependency_unavailable"); }
  }
  public async act(uid: string, requestRef: string, action: "accept" | "decline"): Promise<FriendResult<{ result: "accepted" | "declined" }>> {
    try { return await this.firestore.runTransaction(async tx => {
      const own = await this.owner(tx, uid); if (!own.ok) return own;
      if (!isRequestRef(requestRef)) return err("request_unavailable");
      const pointerPath = inboxPath(own.value.id, requestRef), pointer = await tx.get(pointerPath);
      if (typeof pointer?.pairKey !== "string" || !/^[0-9a-f]{64}$/.test(pointer.pairKey)) return err("request_unavailable");
      const path = `friend_pairs/${pointer.pairKey}`, stored = await tx.get(path), pending = stored?.pending as Pending | null | undefined;
      if (pending == null || pending.requestRef !== requestRef || pending.recipientAccountId !== own.value.id) return err("request_unavailable");
      const pair = parsePair(stored, pending.senderAccountId, own.value.id);
      const sender = await this.member(tx, pending.senderAccountId);
      if (pair === undefined || friendPairKey(pending.senderAccountId, own.value.id) !== pointer.pairKey || pair.blockedByAccountIds.length || sender === undefined || this.presentation(sender) === undefined) return err("request_unavailable");
      if (tx.delete === undefined) throw new Error("missing transaction delete");
      if (this.now() >= new Date(pending.expiresAt).getTime()) {
        tx.set(path, { ...pair, pending: null }); tx.delete(pointerPath); return err("request_unavailable");
      }
      let listRefs: Record<string, string> | undefined;
      if (action === "accept") {
        // Initialization is an explicit fixture completeness assertion, never repaired on read/accept.
        for (const id of pair.accountIds) if (!initialized(await tx.get(`friend_lists/${id}`))) throw new Error("uninitialized friend list");
        listRefs = Object.fromEntries(pair.accountIds.map(id => [id, randomUUID()]));
        if (new Set(Object.values(listRefs)).size !== 2) throw new Error("reference collision");
        for (const id of pair.accountIds) if (await tx.get(listPath(id, listRefs[id]!)) !== undefined) throw new Error("reference collision");
        for (const id of pair.accountIds) tx.create(listPath(id, listRefs[id]!), { pairKey: pointer.pairKey });
      }
      tx.set(path, { ...pair, pending: null, friendship: action === "accept", ...(listRefs === undefined ? {} : { listRefs }) }); tx.delete(pointerPath);
      return ok({ result: action === "accept" ? "accepted" : "declined" });
    }); } catch { return err("dependency_unavailable"); }
  }
  /** Fixture-only test operation; no HTTP route or real Account-lifecycle approval. */
  public async setFixtureProtection(a: string, b: string, change: { blockedByAccountIds?: string[]; permanentlyDeletedAccountId?: string; temporaryAccountId?: string }): Promise<void> {
    await this.firestore.runTransaction(async tx => {
      const path = `friend_pairs/${friendPairKey(a,b)}`, pair = parsePair(await tx.get(path), a,b);
      if (pair === undefined || tx.delete === undefined) throw new Error("invalid fixture");
      if (change.blockedByAccountIds?.some(id => !pair.accountIds.includes(id)) || (change.permanentlyDeletedAccountId !== undefined && !pair.accountIds.includes(change.permanentlyDeletedAccountId)) || (change.temporaryAccountId !== undefined && !pair.accountIds.includes(change.temporaryAccountId))) throw new Error("invalid fixture member");
      if (change.temporaryAccountId !== undefined) tx.set(`friend_access/${change.temporaryAccountId}`, { eligibilityState: "temporary-ineligible" });
      if (change.permanentlyDeletedAccountId !== undefined) tx.set(`friend_access/${change.permanentlyDeletedAccountId}`, { eligibilityState: "permanently-deleted" });
      const blocks = change.blockedByAccountIds ?? pair.blockedByAccountIds;
      const consume = blocks.length > 0 || change.permanentlyDeletedAccountId !== undefined;
      if (consume && pair.pending !== null) tx.delete(inboxPath(pair.pending.recipientAccountId, pair.pending.requestRef));
      if (change.permanentlyDeletedAccountId !== undefined && pair.listRefs !== undefined) {
        for (const id of pair.accountIds) tx.delete(listPath(id, pair.listRefs[id]!));
        const { listRefs: _removed, ...retained } = pair;
        tx.set(path, { ...retained, blockedByAccountIds: blocks, pending: consume ? null : pair.pending });
      } else tx.set(path, { ...pair, blockedByAccountIds: blocks, pending: consume ? null : pair.pending });
    });
  }
}
