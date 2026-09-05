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

type CreateCommand = Parameters<CheckInRepository["create"]>[0];

function accountPath(accountId: string): string {
  return `${FIRESTORE_COLLECTIONS.accounts}/${accountId}`;
}

function authBindingPath(firebaseUid: string): string {
  return `${FIRESTORE_COLLECTIONS.authBindings}/${firebaseUid}`;
}

function checkInPath(checkInId: string): string {
  return `${FIRESTORE_COLLECTIONS.checkIns}/${checkInId}`;
}

function idempotencyPath(documentId: string): string {
  return `${FIRESTORE_COLLECTIONS.idempotency}/${documentId}`;
}

function validCommand(command: CreateCommand): boolean {
  const occurredAt = new Date(command.createdAt).getTime();
  const expiresAt = new Date(command.idempotencyExpiresAt).getTime();
  return (
    isSafeDocumentId(command.firebaseUid) &&
    isSafeDocumentId(command.checkInId) &&
    isUtcIsoInstant(command.createdAt) &&
    isUtcIsoInstant(command.idempotencyExpiresAt) &&
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
  const projection = parseCheckInProjection(stored);
  return projection === undefined
    ? dependencyUnavailable
    : { kind: "replayed", checkIn: projection };
}

export class FirestoreCheckInRepository implements CheckInRepository {
  public constructor(private readonly firestore: FirestoreGateway) {}

  public async create(
    command: CreateCommand,
  ): Promise<CreateCheckInRepositoryResult> {
    if (!validCommand(command)) return dependencyUnavailable;

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const binding = await transaction.get(
          authBindingPath(command.firebaseUid),
        );
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
        const requestFingerprint = createRequestFingerprint([command.note]);
        const operationPath = idempotencyPath(identity.documentId);
        const storedOperation = await transaction.get(operationPath);
        if (storedOperation !== undefined) {
          const record = parseIdempotencyRecord(storedOperation);
          if (record === undefined) return dependencyUnavailable;
          const active = isUnexpired(record.expiresAt, command.createdAt);
          if (active === undefined) return dependencyUnavailable;
          if (active) {
            if (
              record.scope !== accountId ||
              record.operation !== operation ||
              record.keyDigest !== identity.keyDigest
            ) {
              return dependencyUnavailable;
            }
            if (record.requestFingerprint !== requestFingerprint) {
              return { kind: "idempotency_conflict" };
            }
            return replayCreatedCheckIn({ transaction, record, accountId });
          }
        }

        const candidatePath = checkInPath(command.checkInId);
        const candidate = await transaction.get(candidatePath);
        if (candidate !== undefined) return dependencyUnavailable;

        const checkIn: StoredDocument = {
          checkInId: command.checkInId,
          ownerAccountId: accountId,
          note: command.note,
          createdAt: command.createdAt,
        };
        const idempotency: IdempotencyRecord = {
          scope: accountId,
          operation,
          keyDigest: identity.keyDigest,
          requestFingerprint,
          committedResponseReference: candidatePath,
          expiresAt: command.idempotencyExpiresAt,
        };
        transaction.create(candidatePath, checkIn);
        if (storedOperation === undefined) {
          transaction.create(operationPath, { ...idempotency });
        } else {
          transaction.set(operationPath, { ...idempotency });
        }

        return {
          kind: "created",
          checkIn: {
            checkInId: command.checkInId,
            note: command.note,
            createdAt: command.createdAt,
          },
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
    if (!isSafeDocumentId(query.firebaseUid)) return dependencyUnavailable;
    if (!isSafeDocumentId(query.checkInId)) {
      return { kind: "not_found_or_not_owned" };
    }

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const binding = await transaction.get(
          authBindingPath(query.firebaseUid),
        );
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
        const projection = parseCheckInProjection(stored);
        return projection === undefined
          ? dependencyUnavailable
          : { kind: "found", checkIn: projection };
      });
    } catch {
      return dependencyUnavailable;
    }
  }
}
