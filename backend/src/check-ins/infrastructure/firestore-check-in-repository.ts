import type {
  CheckInRepository,
  CreateCheckInRepositoryResult,
  FindOwnedCheckInRepositoryResult,
} from "../ports/check-in-repository.js";
import type {
  FirestoreGateway,
  FirestoreTransactionGateway,
  StoredDocument,
} from "../../shared/infrastructure/firebase/firestore-gateway.js";
import {
  FIRESTORE_COLLECTIONS,
  createAuthBindingDocumentId,
  createIdempotencyIdentity,
  createRequestFingerprint,
  isSafeDocumentId,
  isUnexpired,
  isUtcIsoInstant,
  parseAccountProjection,
  parseAuthBinding,
  parseCheckInProjection,
  parseIdempotencyRecord,
  type IdempotencyRecord,
} from "../../shared/infrastructure/firebase/firestore-records.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { IDEMPOTENCY_WINDOW_MILLISECONDS } from "../../shared/application/authoritative-values.js";
import { validCheckInLocation,permittedWeatherGrid } from "../domain/check-in-location.js";
import type { WeatherProvider } from "../../weather/ports/weather-provider.js";
import { parseWeatherProjection, type WeatherProjection } from "../../weather/domain/weather.js";
import type { Clock } from "../../shared/ports/clock.js";

type CreateCommand = Parameters<CheckInRepository["create"]>[0];
function weatherClaim(data: StoredDocument): IdempotencyRecord | undefined {
  if (data.weatherAttempted !== true || Object.hasOwn(data, "committedResponseReference") ||
      Object.keys(data).length !== 6) return undefined;
  return parseIdempotencyRecord({...data,committedResponseReference:""});
}

function accountPath(accountId: string): string {
  return `${FIRESTORE_COLLECTIONS.accounts}/${accountId}`;
}

function authBindingPath(firebaseUid: string): string | undefined {
  const documentId = createAuthBindingDocumentId(firebaseUid);
  return documentId === undefined
    ? undefined
    : `${FIRESTORE_COLLECTIONS.authBindings}/${documentId}`;
}

function checkInPath(checkInId: string): string {
  return `${FIRESTORE_COLLECTIONS.checkIns}/${checkInId}`;
}

function idempotencyPath(documentId: string): string {
  return `${FIRESTORE_COLLECTIONS.idempotency}/${documentId}`;
}

function validCommand(command: CreateCommand): boolean {
  if (!validCheckInLocation(command)) return false;
  if (
    createAuthBindingDocumentId(command.firebaseUid) === undefined ||
    (command.currentInstant !== undefined &&
      !isUtcIsoInstant(command.currentInstant))
  ) {
    return false;
  }
  if (command.creation === undefined) return true;

  const occurredAt = new Date(command.creation.createdAt).getTime();
  const expiresAt = new Date(command.creation.idempotencyExpiresAt).getTime();
  return (
    isSafeDocumentId(command.creation.checkInId) &&
    command.currentInstant === command.creation.createdAt &&
    isUtcIsoInstant(command.creation.createdAt) &&
    isUtcIsoInstant(command.creation.idempotencyExpiresAt) &&
    expiresAt - occurredAt === IDEMPOTENCY_WINDOW_MILLISECONDS
  );
}

async function replayCreatedCheckIn(input: {
  readonly transaction: FirestoreTransactionGateway;
  readonly record: IdempotencyRecord;
  readonly accountId: string;
}): Promise<CreateCheckInRepositoryResult> {
  const expectedPrefix = `${FIRESTORE_COLLECTIONS.checkIns}/`;
  if (!input.record.committedResponseReference.startsWith(expectedPrefix)) {
    return dependencyUnavailable;
  }
  const checkInId = input.record.committedResponseReference.slice(
    expectedPrefix.length,
  );
  if (!isSafeDocumentId(checkInId)) return dependencyUnavailable;
  const stored = await input.transaction.get(checkInPath(checkInId));
  if (stored === undefined || stored.ownerAccountId !== input.accountId) {
    return dependencyUnavailable;
  }
  const projection = parseCheckInProjection(stored, checkInId);
  return projection === undefined
    ? dependencyUnavailable
    : { kind: "replayed", checkIn: projection };
}

export class FirestoreCheckInRepository implements CheckInRepository {
  public constructor(private readonly firestore: FirestoreGateway, private readonly weather?: WeatherProvider, private readonly weatherClock?:Clock) {}

  private fingerprint(command: CreateCommand): string {
    const base = [command.note, ...(command.locationLabel == null ? [] : [JSON.stringify({locationLabel:command.locationLabel})]), ...(command.mood === undefined && command.activity === undefined && command.checkInVisibility === undefined
      ? [] : [JSON.stringify({mood:command.mood??null,activity:command.activity??null,visibility:command.checkInVisibility??null})])];
    if (command.location !== undefined || command.weatherRequest !== undefined) base.push(JSON.stringify({
      location: command.location ?? null, weatherRequest: command.weatherRequest ?? null,
    }));
    return createRequestFingerprint(base);
  }

  private async lookupWeather(command: CreateCommand): Promise<WeatherProjection | undefined> {
    const request = command.weatherRequest;
    const grid=permittedWeatherGrid(command);
    if (!request || !grid || !this.weather || !this.weatherClock || !command.creation || !command.currentInstant) return undefined;
    // Claim once outside provider IO. Transaction retries and HTTP replays cannot
    // dispatch the provider twice. A competing save may safely finish without it.
    const allowed = await this.firestore.runTransaction(async tx => {
      const binding = await tx.get(authBindingPath(command.firebaseUid)!);
      const owner = binding && parseAuthBinding(binding);
      if (!owner) return false;
      const account = await tx.get(accountPath(owner));
      if (!account || !parseAccountProjection(account) ||
          (account.settingsRevision ?? 0) !== request.expectedSettingsRevision) return false;
      const identity = createIdempotencyIdentity({scope:owner,operation:"create_check_in",rawKey:command.idempotencyKey});
      const path = idempotencyPath(identity.documentId);
      const previous = await tx.get(path);
      if (previous) {
        const record = parseIdempotencyRecord(previous) ?? weatherClaim(previous);
        if (!record || record.scope !== owner || record.operation !== "create_check_in" ||
            record.keyDigest !== identity.keyDigest || isUnexpired(record.expiresAt,command.currentInstant!) !== false) return false;
      }
      // Reuse the existing 24-hour idempotency identity/lifecycle. This temporary
      // claim is replaced by the committed reference in the Check-in transaction.
      tx.set(path,{scope:owner,operation:"create_check_in",keyDigest:identity.keyDigest,
        requestFingerprint:this.fingerprint(command),expiresAt:command.creation!.idempotencyExpiresAt,
        weatherAttempted:true});
      return true;
    });
    if (!allowed) return undefined;
    try {
      const asOf=this.weatherClock.now();
      if(!asOf.ok||!Number.isFinite(asOf.value.getTime()))return undefined;
      const candidate = await this.weather.current(grid,asOf.value.getTime());
      return parseWeatherProjection(candidate);
    } catch { return undefined; }
  }

  public async create(
    command: CreateCommand,
  ): Promise<CreateCheckInRepositoryResult> {
    const bindingPath = authBindingPath(command.firebaseUid);
    if (!validCommand(command) || bindingPath === undefined) {
      return dependencyUnavailable;
    }

    try {
      const candidateWeather = await this.lookupWeather(command).catch(() => undefined);
      return await this.firestore.runTransaction(async (transaction) => {
        const binding = await transaction.get(bindingPath);
        if (binding === undefined) return { kind: "onboarding_required" };
        const accountId = parseAuthBinding(binding);
        if (accountId === undefined) return dependencyUnavailable;
        const account = await transaction.get(accountPath(accountId));
        if (
          account === undefined ||
          parseAccountProjection(account) === undefined
        ) {
          return dependencyUnavailable;
        }

        const operation = "create_check_in" as const;
        const identity = createIdempotencyIdentity({
          scope: accountId,
          operation,
          rawKey: command.idempotencyKey,
        });
        const requestFingerprint = this.fingerprint(command);
        const operationPath = idempotencyPath(identity.documentId);
        const storedOperation = await transaction.get(operationPath);
        if (storedOperation !== undefined) {
          const claim = weatherClaim(storedOperation);
          const record = parseIdempotencyRecord(storedOperation) ?? claim;
          if (record === undefined) return dependencyUnavailable;
          if (
            record.scope !== accountId ||
            record.operation !== operation ||
            record.keyDigest !== identity.keyDigest
          ) {
            return dependencyUnavailable;
          }
          if (command.currentInstant === undefined) {
            return dependencyUnavailable;
          }
          const active = isUnexpired(
            record.expiresAt,
            command.currentInstant,
          );
          if (active === undefined) return dependencyUnavailable;
          if (active) {
            if (record.requestFingerprint !== requestFingerprint) {
              return { kind: "idempotency_conflict" };
            }
            if (claim === undefined) return replayCreatedCheckIn({ transaction, record, accountId });
          }
        }

        const creation = command.creation;
        if (creation === undefined) return dependencyUnavailable;

        const candidatePath = checkInPath(creation.checkInId);
        const candidate = await transaction.get(candidatePath);
        if (candidate !== undefined) return dependencyUnavailable;

        const checkIn: StoredDocument = {
          ownerAccountId: accountId,
          note: command.note,
          createdAt: creation.createdAt,
          ...(command.mood == null ? {} : {mood:command.mood}),
          ...(command.locationLabel == null ? {} : {locationLabel:command.locationLabel}),
          ...(command.activity == null ? {} : {activity:command.activity}),
          checkInVisibility: command.checkInVisibility ?? parseAccountProjection(account)!.checkInVisibility,
          ...(command.location == null ? {} : {location:command.location}),
          ...(candidateWeather !== undefined && command.weatherRequest !== undefined &&
            (account.settingsRevision ?? 0) === command.weatherRequest.expectedSettingsRevision
            ? {weather:candidateWeather} : {}),
        };
        const idempotency: IdempotencyRecord = {
          scope: accountId,
          operation,
          keyDigest: identity.keyDigest,
          requestFingerprint,
          committedResponseReference: candidatePath,
          expiresAt: creation.idempotencyExpiresAt,
        };
        transaction.create(candidatePath, checkIn);
        if (storedOperation === undefined) {
          transaction.create(operationPath, { ...idempotency });
        } else {
          transaction.set(operationPath, { ...idempotency });
        }

        return {
          kind: "created",
          checkIn: parseCheckInProjection(checkIn,creation.checkInId)!,
        };
      });
    } catch {
      return dependencyUnavailable;
    }
  }

  public async findOwned(query: {
    readonly firebaseUid: string;
    readonly checkInId: string;
  }): Promise<FindOwnedCheckInRepositoryResult> {
    const bindingPath = authBindingPath(query.firebaseUid);
    if (bindingPath === undefined) return dependencyUnavailable;
    if (!isSafeDocumentId(query.checkInId)) {
      return { kind: "not_found_or_not_owned" };
    }

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const binding = await transaction.get(bindingPath);
        if (binding === undefined) return { kind: "onboarding_required" };
        const accountId = parseAuthBinding(binding);
        if (accountId === undefined) return dependencyUnavailable;
        const account = await transaction.get(accountPath(accountId));
        if (
          account === undefined ||
          parseAccountProjection(account) === undefined
        ) {
          return dependencyUnavailable;
        }
        const stored = await transaction.get(checkInPath(query.checkInId));
        if (stored === undefined || stored.ownerAccountId !== accountId) {
          return { kind: "not_found_or_not_owned" };
        }
        const projection = parseCheckInProjection(stored, query.checkInId);
        return projection === undefined
          ? dependencyUnavailable
          : { kind: "found", checkIn: projection };
      });
    } catch {
      return dependencyUnavailable;
    }
  }
}
