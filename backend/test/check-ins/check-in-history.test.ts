import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { ListOwnCheckInsForDate } from "../../src/check-ins/application/check-in-history.js";
import { AesGcmHistoryCursorCodec } from "../../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { FirestoreCheckInHistoryRepository } from "../../src/check-ins/infrastructure/firestore-check-in-history-repository.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { StoredDocument } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { CheckInHistoryFirestoreGateway, CheckInHistoryTransaction } from "../../src/check-ins/ports/check-in-history-firestore-gateway.js";
import type { HistoryCursor } from "../../src/check-ins/ports/check-in-history-repository.js";
import { ok } from "../../src/shared/domain/result.js";

const uid = "history-owner-001";
const accountId = "history-account-001";
const date = "2026-10-07";
const zone = "Asia/Singapore";
const startUtc = "2026-10-06T16:00:00.000Z";
const endUtc = "2026-10-07T16:00:00.000Z";
const fixedNow = new Date("2026-10-08T00:00:00.000Z");

class MemoryHistoryGateway implements CheckInHistoryFirestoreGateway {
  public queries = 0;
  public authorityReads = 0;
  public readonly documents = new Map<string, StoredDocument>();

  public constructor(checkIns: readonly { id: string; data: StoredDocument }[] = []) {
    const binding = createAuthBindingDocumentId(uid)!;
    this.documents.set(`auth_bindings/${binding}`, { accountId });
    this.documents.set(`accounts/${accountId}`, {
      username: "history_001",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "private",
      onboardingCompletedAt: "2026-10-01T00:00:00.000Z",
    });
    for (const row of checkIns) this.documents.set(`check_ins/${row.id}`, row.data);
  }

  public async runTransaction<T>(work: (transaction: CheckInHistoryTransaction) => Promise<T>): Promise<T> {
    return work({
      get: async path => {
        this.authorityReads += 1;
        const value = this.documents.get(path);
        return value === undefined ? undefined : { ...value };
      },
      listCheckInHistoryPage: async input => {
        this.queries += 1;
        let rows = [...this.documents.entries()]
          .filter(([path, data]) => path.startsWith("check_ins/") && data.ownerAccountId === input.ownerAccountId &&
            typeof data.createdAt === "string" && data.createdAt >= input.startUtc && (input.endUtc === null || data.createdAt < input.endUtc))
          .map(([path, data]) => ({ id: path.slice("check_ins/".length), data: { ...data } }))
          .sort((a, b) => (a.data.createdAt as string) > (b.data.createdAt as string) ? -1 :
            (a.data.createdAt as string) < (b.data.createdAt as string) ? 1 : a.id > b.id ? -1 : a.id < b.id ? 1 : 0);
        if (input.after !== undefined) rows = rows.filter(row =>
          (row.data.createdAt as string) < input.after!.createdAt ||
          (row.data.createdAt === input.after!.createdAt && row.id < input.after!.checkInId));
        return rows.slice(0, input.limit);
      },
    });
  }
}

function checkIn(id: string, createdAt: string, owner = accountId): { id: string; data: StoredDocument } {
  return { id, data: { ownerAccountId: owner, note: `Synthetic note ${id}`, createdAt, checkInVisibility: "private" } };
}

function cursor(overrides: Partial<HistoryCursor> = {}): HistoryCursor {
  return {
    version: 1,
    ownerAccountId: accountId,
    date,
    timeZone: zone,
    startUtc,
    endUtc,
    lastCreatedAt: "2026-10-07T10:00:00.000Z",
    lastCheckInId: "tie-020",
    expiresAt: "2026-10-08T00:10:00.000Z",
    ...overrides,
  };
}

function clock() { return { now: () => ok(fixedNow) }; }

test("history date query uses canonical bounds and Temporal civil-day DST rules", async () => {
  const observed: unknown[] = [];
  const useCase = new ListOwnCheckInsForDate({ listForDate: async query => { observed.push(query); return { kind: "page", accountId, rows: [] }; } }, { decode: () => undefined, encode: () => "unused" }, clock());
  await useCase.execute({ principal: { firebaseUid: uid }, date, timeZone: zone });
  await useCase.execute({ principal: { firebaseUid: uid }, date: "2026-03-08", timeZone: "America/New_York" });
  await useCase.execute({ principal: { firebaseUid: uid }, date: "2026-11-01", timeZone: "America/New_York" });
  const queries = observed as Array<{ startUtc: string; endUtc: string; empty: boolean }>;
  assert.deepEqual(queries.map(({ startUtc: start, endUtc: end }) => [start, end]), [
    ["2026-10-06T16:00:00.000Z", "2026-10-07T16:00:00.000Z"],
    ["2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"],
  ]);
});

test("history bounds cover midnight gaps/overlaps and four-digit UTC year edges", async () => {
  const observed: unknown[] = [];
  const useCase = new ListOwnCheckInsForDate({ listForDate: async query => { observed.push(query); return { kind: "page", accountId, rows: [] }; } }, { decode: () => undefined, encode: () => "unused" }, clock());
  for (const [day, timeZone] of [
    ["2018-11-04", "America/Sao_Paulo"],
    ["2019-02-16", "America/Sao_Paulo"],
    ["9999-12-31", "America/Los_Angeles"],
  ]) await useCase.execute({ principal: { firebaseUid: uid }, date: day!, timeZone: timeZone! });
  const ranges = observed as Array<{ startUtc: string; endUtc: string | null }>;
  assert.deepEqual(ranges.map(({ startUtc: start, endUtc: end }) => [start, end]), [
    ["2018-11-04T03:00:00.000Z", "2018-11-05T02:00:00.000Z"],
    ["2019-02-16T02:00:00.000Z", "2019-02-17T03:00:00.000Z"],
    ["9999-12-31T08:00:00.000Z", null],
  ]);
  const underflow = await useCase.execute({ principal: { firebaseUid: uid }, date: "0001-01-01", timeZone: "Asia/Singapore" });
  assert.equal(underflow.ok, false);
});

test("skipped civil day returns authorized empty without a Check-in query", async () => {
  let calls = 0;
  const useCase = new ListOwnCheckInsForDate({ listForDate: async query => { calls += 1; assert.equal(query.empty, true); return { kind: "page", accountId, rows: [] }; } }, { decode: () => undefined, encode: () => "unused" }, clock());
  const result = await useCase.execute({ principal: { firebaseUid: uid }, date: "2011-12-30", timeZone: "Pacific/Apia" });
  assert.equal(result.ok, true);
  assert.equal(calls, 1);
});

test("invalid dates, numeric offsets and zone abbreviations fail before repository access", async () => {
  let calls = 0;
  const acceptedZones: string[] = [];
  const useCase = new ListOwnCheckInsForDate({ listForDate: async query => { calls += 1; acceptedZones.push(query.timeZone); return { kind: "page", accountId, rows: [] }; } }, { decode: () => undefined, encode: () => "unused" }, clock());
  for (const input of [
    { date: "2026-02-30", timeZone: zone },
    { date, timeZone: "+08:00" },
    { date, timeZone: "Not/AZone" },
    { date, timeZone: "EST" },
    { date, timeZone: "MST" },
    { date, timeZone: "CET" },
    { date, timeZone: "EET" },
    { date, timeZone: "HST" },
    { date, timeZone: "MET" },
    { date, timeZone: "WET" },
    { date, timeZone: "GMT" },
  ]) {
    const result = await useCase.execute({ principal: { firebaseUid: uid }, ...input });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failure.code, "REQUEST_INVALID");
  }
  assert.equal(calls, 0);
  const backwardCompatibleAliases = [
    "Cuba", "Egypt", "Eire", "Hongkong", "Iceland", "Iran", "Israel", "Jamaica",
    "Japan", "Kwajalein", "Libya", "Navajo", "Poland", "Portugal", "Singapore", "Turkey", "W-SU",
  ];
  for (const timeZone of ["Asia/Singapore", "US/Eastern", "UTC", ...backwardCompatibleAliases]) {
    const result = await useCase.execute({ principal: { firebaseUid: uid }, date, timeZone });
    assert.equal(result.ok, true);
  }
  assert.equal(calls, 20);
  assert.deepEqual(acceptedZones.slice(-backwardCompatibleAliases.length), backwardCompatibleAliases);
});

test("history repository binds cursor to current authority before querying Check-ins", async () => {
  const gateway = new MemoryHistoryGateway([checkIn("tie-020", "2026-10-07T10:00:00.000Z")]);
  const repository = new FirestoreCheckInHistoryRepository(gateway);
  const base = { firebaseUid: uid, date, timeZone: zone, startUtc, endUtc, empty: false, pageSize: 20 as const };
  const mismatch = await repository.listForDate({ ...base, cursor: cursor({ ownerAccountId: "different-account" }) });
  assert.deepEqual(mismatch, { kind: "invalid_cursor" });
  assert.equal(gateway.authorityReads, 2);
  assert.equal(gateway.queries, 0);
  const page = await repository.listForDate({ ...base, cursor: cursor() });
  assert.equal(page.kind, "page");
  assert.equal(gateway.queries, 1);
});

test("history repository enforces owner, canonical range and deterministic descending tie order", async () => {
  const rows = [
    checkIn("tie-a", "2026-10-07T10:00:00.500Z"),
    checkIn("tie-c", "2026-10-07T10:00:00.500Z"),
    checkIn("tie-b", "2026-10-07T10:00:00.500Z"),
    checkIn("start", startUtc),
    checkIn("end", endUtc),
    checkIn("other-owner", "2026-10-07T10:00:00.500Z", "other-account"),
  ];
  for (let index = 0; index < 17; index += 1) rows.push(checkIn(`more-${index.toString().padStart(2, "0")}`, "2026-10-07T09:00:00.000Z"));
  const repository = new FirestoreCheckInHistoryRepository(new MemoryHistoryGateway(rows));
  const result = await repository.listForDate({ firebaseUid: uid, date, timeZone: zone, startUtc, endUtc, empty: false, pageSize: 20 });
  assert.equal(result.kind, "page");
  if (result.kind !== "page") return;
  assert.equal(result.rows.length, 21);
  assert.deepEqual(result.rows.slice(0, 3).map(row => row.checkInId), ["tie-c", "tie-b", "tie-a"]);
  assert.equal(result.rows.some(row => row.checkInId === "start"), true);
  assert.equal(result.rows.some(row => row.checkInId === "end"), false);
  assert.equal(result.rows.some(row => row.checkInId === "other-owner"), false);
});

test("history repository fails the page closed for noncanonical stored timestamps", async () => {
  const repository = new FirestoreCheckInHistoryRepository(new MemoryHistoryGateway([checkIn("legacy", "2026-10-07T10:00:00Z")]));
  assert.deepEqual(await repository.listForDate({ firebaseUid: uid, date, timeZone: zone, startUtc, endUtc, empty: false, pageSize: 20 }), { kind: "dependency_unavailable" });
});

test("AES-GCM cursor is opaque, tamper-resistant, expiring and process-local", () => {
  const first = new AesGcmHistoryCursorCodec(randomBytes(32));
  const token = first.encode(cursor());
  assert.equal(token.includes(accountId), false);
  assert.deepEqual(first.decode(token, fixedNow), cursor());
  const tampered = `${token.slice(0, 8)}${token[8] === "A" ? "B" : "A"}${token.slice(9)}`;
  assert.equal(first.decode(tampered, fixedNow), undefined);
  assert.equal(first.decode(token, new Date("2026-10-08T00:10:00.000Z")), undefined);
  assert.equal(new AesGcmHistoryCursorCodec(randomBytes(32)).decode(token, fixedNow), undefined);
});

test("continuation cursors keep the first-page-anchored expiry", async () => {
  const emitted: HistoryCursor[] = [];
  let clockRead = 0;
  const clock = { now: () => ok(new Date(`2026-10-08T00:0${clockRead++ === 0 ? "0" : "5"}:00.000Z`)) };
  const rows = Array.from({ length: 21 }, (_, index) => ({
    checkInId: `history-${index}`,
    note: "Synthetic note",
    createdAt: `2026-10-07T10:00:${String(index).padStart(2, "0")}.000Z`,
  }));
  const codec = {
    decode: (token: string) => token === "first" ? emitted[0] : undefined,
    encode: (value: HistoryCursor) => { emitted.push(value); return emitted.length === 1 ? "first" : "second"; },
  };
  const useCase = new ListOwnCheckInsForDate({ listForDate: async () => ({ kind: "page", accountId, rows }) }, codec, clock);
  await useCase.execute({ principal: { firebaseUid: uid }, date, timeZone: zone });
  await useCase.execute({ principal: { firebaseUid: uid }, date, timeZone: zone, cursor: "first" });
  assert.equal(emitted[0]?.expiresAt, "2026-10-08T00:15:00.000Z");
  assert.equal(emitted[1]?.expiresAt, emitted[0]?.expiresAt);
});
