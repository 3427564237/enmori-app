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

type CreateCommand = Parameters<CheckInRepository["create"]>[0];

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
  if (createAuthBindingDocumentId(command.firebaseUid) === undefined) {
    return false;
  }
  if (command.creation === undefined) return true;

  const occurredAt = new Date(command.creation.createdAt).getTime();
  const expiresAt = new Date(command.creation.idempotencyExpiresAt).getTime();
  return (
    isSafeDocumentId(command.creation.checkInId) &&
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
    const bindingPath = authBindingPath(command.firebaseUid);
    if (!validCommand(command) || bindingPath === undefined) {
      return dependencyUnavailable;
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
          if (
            record.scope !== accountId ||
            record.operation !== operation ||
            record.keyDigest !== identity.keyDigest
          ) {
            return dependencyUnavailable;
          }
          if (command.creation === undefined) {
            if (record.requestFingerprint !== requestFingerprint) {
              return dependencyUnavailable;
            }
            return replayCreatedCheckIn({ transaction, record, accountId });
          }
          const active = isUnexpired(
            record.expiresAt,
            command.creation.createdAt,
          );
          if (active === undefined) return dependencyUnavailable;
          if (active) {
            if (record.requestFingerprint !== requestFingerprint) {
              return { kind: "idempotency_conflict" };
            }
            return replayCreatedCheckIn({ transaction, record, accountId });
          }
        }

        const creation = command.creation;
        if (creation === undefined) return dependencyUnavailable;

        const candidatePath = checkInPath(creation.checkInId);
        const candidate = await transaction.get(candidatePath);
        if (candidate !== undefined) return dependencyUnavailable;

        const checkIn: StoredDocument = {
          checkInId: creation.checkInId,
          ownerAccountId: accountId,
          note: command.note,
          createdAt: creation.createdAt,
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
          checkIn: {
            checkInId: creation.checkInId,
            note: command.note,
            createdAt: creation.createdAt,
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
