import type {
  CompleteOnboardingRepositoryResult,
  GetOnboardingRepositoryResult,
  OnboardingRepository,
} from "../ports/onboarding-repository.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { IDEMPOTENCY_WINDOW_MILLISECONDS } from "../../shared/application/authoritative-values.js";
import { requireFeatureEnvironment } from "../../shared/infrastructure/firebase/feature-environment.js";
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
  parseIdempotencyRecord,
  type IdempotencyRecord,
} from "../../shared/infrastructure/firebase/firestore-records.js";

type CompleteCommand = Parameters<OnboardingRepository["complete"]>[0];

function accountPath(accountId: string): string {
  return `${FIRESTORE_COLLECTIONS.accounts}/${accountId}`;
}

function authBindingPath(firebaseUid: string): string | undefined {
  const documentId = createAuthBindingDocumentId(firebaseUid);
  return documentId === undefined
    ? undefined
    : `${FIRESTORE_COLLECTIONS.authBindings}/${documentId}`;
}

function usernameReservationPath(canonicalUsername: string): string {
  return `${FIRESTORE_COLLECTIONS.usernameReservations}/${canonicalUsername}`;
}

function idempotencyPath(documentId: string): string {
  return `${FIRESTORE_COLLECTIONS.idempotency}/${documentId}`;
}

function validCommand(command: CompleteCommand): boolean {
  if (
    createAuthBindingDocumentId(command.firebaseUid) === undefined ||
    !isSafeDocumentId(command.canonicalUsername) ||
    (command.currentInstant !== undefined &&
      !isUtcIsoInstant(command.currentInstant))
  ) {
    return false;
  }
  if (command.creation === undefined) return true;

  const occurredAt = new Date(
    command.creation.onboardingCompletedAt,
  ).getTime();
  const expiresAt = new Date(
    command.creation.idempotencyExpiresAt,
  ).getTime();
  return (
    isSafeDocumentId(command.creation.accountId) &&
    command.currentInstant === command.creation.onboardingCompletedAt &&
    isUtcIsoInstant(command.creation.onboardingCompletedAt) &&
    isUtcIsoInstant(command.creation.idempotencyExpiresAt) &&
    expiresAt - occurredAt === IDEMPOTENCY_WINDOW_MILLISECONDS
  );
}

async function replayCompletedOnboarding(input: {
  readonly transaction: FirestoreTransactionGateway;
  readonly record: IdempotencyRecord;
  readonly bindingPath: string;
}): Promise<CompleteOnboardingRepositoryResult> {
  const expectedPrefix = `${FIRESTORE_COLLECTIONS.accounts}/`;
  if (!input.record.committedResponseReference.startsWith(expectedPrefix)) {
    return dependencyUnavailable;
  }
  const accountId = input.record.committedResponseReference.slice(
    expectedPrefix.length,
  );
  if (!isSafeDocumentId(accountId)) return dependencyUnavailable;

  const binding = await input.transaction.get(input.bindingPath);
  const account = await input.transaction.get(accountPath(accountId));
  if (
    binding === undefined ||
    parseAuthBinding(binding) !== accountId ||
    account === undefined
  ) {
    return dependencyUnavailable;
  }
  const projection = parseAccountProjection(account);
  return projection === undefined
    ? dependencyUnavailable
    : { kind: "replayed", account: projection };
}

export class FirestoreOnboardingRepository implements OnboardingRepository {
  private readonly isolatedAiPurpose: boolean;
  public constructor(private readonly firestore: FirestoreGateway,
    isolatedAiEnvironment?: Readonly<Record<string, string | undefined>>) {
    this.isolatedAiPurpose = isolatedAiEnvironment !== undefined;
    if (isolatedAiEnvironment !== undefined) requireFeatureEnvironment(isolatedAiEnvironment);
  }

  public async complete(
    command: CompleteCommand,
  ): Promise<CompleteOnboardingRepositoryResult> {
    const bindingPath = authBindingPath(command.firebaseUid);
    if (!validCommand(command) || bindingPath === undefined) {
      return dependencyUnavailable;
    }

    const operation = "complete_onboarding" as const;
    const identity = createIdempotencyIdentity({
      scope: command.firebaseUid,
      operation,
      rawKey: command.idempotencyKey,
    });
    const requestFingerprint = createRequestFingerprint([
      command.canonicalUsername,
      command.optionalProcessingConsent,
      command.checkInVisibility,
    ]);
    const operationPath = idempotencyPath(identity.documentId);

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const storedOperation = await transaction.get(operationPath);
        if (storedOperation !== undefined) {
          const record = parseIdempotencyRecord(storedOperation);
          if (record === undefined) return dependencyUnavailable;
          if (
            record.scope !== command.firebaseUid ||
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
            return replayCompletedOnboarding({
              transaction,
              record,
              bindingPath,
            });
          }
        }

        const creation = command.creation;
        if (creation === undefined) return dependencyUnavailable;

        const existingBinding = await transaction.get(bindingPath);
        if (existingBinding !== undefined) {
          const existingAccountId = parseAuthBinding(existingBinding);
          if (existingAccountId === undefined) return dependencyUnavailable;
          const existingAccount = await transaction.get(
            accountPath(existingAccountId),
          );
          return existingAccount !== undefined &&
            parseAccountProjection(existingAccount) !== undefined
            ? { kind: "onboarding_conflict" }
            : dependencyUnavailable;
        }

        const reservationPath = usernameReservationPath(
          command.canonicalUsername,
        );
        const candidateAccountPath = accountPath(creation.accountId);
        const reservation = await transaction.get(reservationPath);
        const candidateAccount = await transaction.get(candidateAccountPath);
        if (reservation !== undefined) return { kind: "username_unavailable" };
        if (candidateAccount !== undefined) return dependencyUnavailable;

        const account: StoredDocument = {
          username: command.canonicalUsername,
          optionalProcessingConsent: command.optionalProcessingConsent,
          checkInVisibility: command.checkInVisibility,
          onboardingCompletedAt: creation.onboardingCompletedAt,
          ...(this.isolatedAiPurpose ? { purposeRevocationGeneration: 0 } : {}),
        };
        const idempotency: IdempotencyRecord = {
          scope: command.firebaseUid,
          operation,
          keyDigest: identity.keyDigest,
          requestFingerprint,
          committedResponseReference: candidateAccountPath,
          expiresAt: creation.idempotencyExpiresAt,
        };

        transaction.create(bindingPath, { accountId: creation.accountId });
        transaction.create(reservationPath, { accountId: creation.accountId });
        transaction.create(candidateAccountPath, account);
        if (storedOperation === undefined) {
          transaction.create(operationPath, { ...idempotency });
        } else {
          transaction.set(operationPath, { ...idempotency });
        }

        return {
          kind: "created",
          account: {
            username: command.canonicalUsername,
            optionalProcessingConsent: command.optionalProcessingConsent,
            checkInVisibility: command.checkInVisibility,
            onboardingCompletedAt: creation.onboardingCompletedAt,
          },
        };
      });
    } catch {
      return dependencyUnavailable;
    }
  }

  public async getStatus(
    firebaseUid: string,
  ): Promise<GetOnboardingRepositoryResult> {
    const bindingPath = authBindingPath(firebaseUid);
    if (bindingPath === undefined) return dependencyUnavailable;

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const binding = await transaction.get(bindingPath);
        if (binding === undefined) return { kind: "required" };
        const accountId = parseAuthBinding(binding);
        if (accountId === undefined) return dependencyUnavailable;
        const account = await transaction.get(accountPath(accountId));
        if (account === undefined) return dependencyUnavailable;
        const projection = parseAccountProjection(account);
        return projection === undefined
          ? dependencyUnavailable
          : { kind: "completed", account: projection };
      });
    } catch {
      return dependencyUnavailable;
    }
  }
}
