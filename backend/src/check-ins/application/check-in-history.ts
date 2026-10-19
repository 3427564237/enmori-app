import { Temporal } from "@js-temporal/polyfill";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { Clock } from "../../shared/ports/clock.js";
import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { CheckInProjection } from "./check-in-model.js";
import type { CheckInHistoryRepository, HistoryCursor } from "../ports/check-in-history-repository.js";
import type { CheckInHistoryCursorCodec } from "../ports/check-in-history-cursor.js";

const PAGE_SIZE = 20;
const CURSOR_LIFETIME_MS = 15 * 60 * 1000;
const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_ZONE = /^[+-]\d{2}:?\d{2}$/;
const TIME_ZONE_ABBREVIATIONS = new Set(["CET", "EET", "EST", "GMT", "HST", "MET", "MST", "WET"]);

export interface CheckInHistoryPage {
  readonly checkIns: readonly CheckInProjection[];
  readonly nextCursor: string | null;
}

interface CivilDay {
  readonly date: string;
  readonly timeZone: string;
  readonly startUtc: string;
  readonly endUtc: string | null;
  readonly empty: boolean;
}

function canonicalUtc(instant: Temporal.Instant): string | undefined {
  const formatted = instant.toString({ fractionalSecondDigits: 3 });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(formatted)) return undefined;
  const year = Number(formatted.slice(0, 4));
  return year >= 1 && year <= 9999 ? formatted : undefined;
}

export function parseCivilDay(dateInput: string, zoneInput: string): CivilDay | undefined {
  const match = CIVIL_DATE.exec(dateInput);
  if (
    match === null ||
    OFFSET_ZONE.test(zoneInput) ||
    TIME_ZONE_ABBREVIATIONS.has(zoneInput)
  ) return undefined;
  try {
    const date = Temporal.PlainDate.from(dateInput, { overflow: "reject" });
    if (date.year < 1 || date.year > 9999 || date.toString() !== dateInput) return undefined;
    const zone = Temporal.Now.zonedDateTimeISO(zoneInput).timeZoneId;
    if (zone !== zoneInput) return undefined;
    const nextDate = date.add({ days: 1 });
    const start = date.toZonedDateTime(zone).toInstant();
    const end = nextDate.toZonedDateTime(zone).toInstant();
    const startUtc = canonicalUtc(start);
    if (startUtc === undefined) return undefined;
    const endUtc = canonicalUtc(end);
    if (endUtc === undefined && end.epochMilliseconds <= Date.parse("9999-12-31T23:59:59.999Z")) return undefined;
    return { date: dateInput, timeZone: zone, startUtc, endUtc: endUtc ?? null, empty: start.equals(end) };
  } catch {
    return undefined;
  }
}

export class ListOwnCheckInsForDate {
  public constructor(
    private readonly repository: Pick<CheckInHistoryRepository, "listForDate">,
    private readonly cursorCodec: CheckInHistoryCursorCodec,
    private readonly clock: Clock,
  ) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly date: string;
    readonly timeZone: string;
    readonly cursor?: string;
  }): Promise<Result<CheckInHistoryPage, AppFailure>> {
    const day = parseCivilDay(input.date, input.timeZone);
    if (day === undefined) return err(appFailure("REQUEST_INVALID"));
    const now = this.clock.now();
    if (!now.ok) return err(appFailure("SERVICE_UNAVAILABLE"));
    const cursor = input.cursor === undefined ? undefined : this.cursorCodec.decode(input.cursor, now.value);
    if (input.cursor !== undefined && cursor === undefined) return err(appFailure("REQUEST_INVALID"));

    const result = await this.repository.listForDate({
      firebaseUid: input.principal.firebaseUid,
      date: day.date,
      timeZone: day.timeZone,
      startUtc: day.startUtc,
      endUtc: day.endUtc,
      empty: day.empty,
      ...(cursor === undefined ? {} : { cursor }),
      pageSize: PAGE_SIZE,
    });
    switch (result.kind) {
      case "onboarding_required": return err(appFailure("ONBOARDING_REQUIRED"));
      case "invalid_cursor": return err(appFailure("REQUEST_INVALID"));
      case "dependency_unavailable": return err(appFailure("SERVICE_UNAVAILABLE"));
      case "page": {
        const hasNext = result.rows.length > PAGE_SIZE;
        const rows = result.rows.slice(0, PAGE_SIZE);
        if (!hasNext || rows.length === 0) return ok({ checkIns: rows, nextCursor: null });
        const last = rows[rows.length - 1]!;
        const expiry = cursor?.expiresAt ?? new Date(now.value.getTime() + CURSOR_LIFETIME_MS).toISOString();
        const token = this.cursorCodec.encode({
          version: 1,
          ownerAccountId: result.accountId,
          date: day.date,
          timeZone: day.timeZone,
          startUtc: day.startUtc,
          endUtc: day.endUtc,
          lastCreatedAt: last.createdAt,
          lastCheckInId: last.checkInId,
          expiresAt: expiry,
        });
        return ok({ checkIns: rows, nextCursor: token });
      }
    }
  }
}

export type CheckInHistoryResult = Result<CheckInHistoryPage, AppFailure>;
