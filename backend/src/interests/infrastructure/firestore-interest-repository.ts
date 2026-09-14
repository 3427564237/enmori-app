import type {
  InterestTagSummary,
  OwnInterestsProjection,
  SelectedInterestTag,
} from "../application/interest-model.js";
import type {
  InterestReadResult,
  InterestRepository,
  ReplaceOwnInterestsResult,
} from "../ports/interest-repository.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type {
  FirestoreGateway,
  FirestoreTransactionGateway,
  StoredDocument,
} from "../../shared/infrastructure/firebase/firestore-gateway.js";
import {
  FIRESTORE_COLLECTIONS,
  createAuthBindingDocumentId,
  isSafeDocumentId,
  parseAccountProjection,
  parseAuthBinding,
} from "../../shared/infrastructure/firebase/firestore-records.js";

interface StoredInterestTag extends SelectedInterestTag {
  readonly revision: number;
}

interface StoredOwnInterests {
  readonly interestTagIds: readonly string[];
  readonly revision: number;
}

type AccountResolution =
  | { readonly kind: "found"; readonly accountId: string }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "dependency_unavailable" };

function authBindingPath(firebaseUid: string): string | undefined {
  const documentId = createAuthBindingDocumentId(firebaseUid);
  return documentId === undefined
    ? undefined
    : `${FIRESTORE_COLLECTIONS.authBindings}/${documentId}`;
}

function accountPath(accountId: string): string {
  return `${FIRESTORE_COLLECTIONS.accounts}/${accountId}`;
}

function interestTagPath(interestTagId: string): string {
  return `${FIRESTORE_COLLECTIONS.interestTags}/${interestTagId}`;
}

function ownInterestsPath(accountId: string): string {
  return `${FIRESTORE_COLLECTIONS.accountInterests}/${accountId}`;
}

async function resolveAccount(
  transaction: FirestoreTransactionGateway,
  firebaseUid: string,
): Promise<AccountResolution> {
  const bindingPath = authBindingPath(firebaseUid);
  if (bindingPath === undefined) return dependencyUnavailable;
  const binding = await transaction.get(bindingPath);
  if (binding === undefined) return { kind: "onboarding_required" };
  const accountId = parseAuthBinding(binding);
  if (accountId === undefined) return dependencyUnavailable;
  const account = await transaction.get(accountPath(accountId));
  if (account === undefined || parseAccountProjection(account) === undefined) {
    return dependencyUnavailable;
  }
  return { kind: "found", accountId };
}

function parseInterestTag(
  interestTagId: string,
  data: StoredDocument,
): StoredInterestTag | undefined {
  const { displayName, lifecycleState, revision } = data;
  if (
    !isSafeDocumentId(interestTagId) ||
    typeof displayName !== "string" ||
    !displayName.isWellFormed() ||
    displayName.trim() !== displayName ||
    [...displayName].length < 1 ||
    [...displayName].length > 50 ||
    /\p{Cc}/u.test(displayName) ||
    /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(displayName) ||
    (lifecycleState !== "active" && lifecycleState !== "inactive") ||
    !Number.isSafeInteger(revision) ||
    (revision as number) < 1
  ) {
    return undefined;
  }
  return { interestTagId, displayName, lifecycleState, revision: revision as number };
}

function parseOwnInterests(data: StoredDocument): StoredOwnInterests | undefined {
  const { interestTagIds, revision } = data;
  if (
    !Array.isArray(interestTagIds) ||
    interestTagIds.length > 10 ||
    interestTagIds.some(
      (value) => typeof value !== "string" || !isSafeDocumentId(value),
    ) ||
    new Set(interestTagIds).size !== interestTagIds.length ||
    !Number.isSafeInteger(revision) ||
    (revision as number) < 1
  ) {
    return undefined;
  }
  return {
    interestTagIds: interestTagIds as readonly string[],
    revision: revision as number,
  };
}

async function projectOwnInterests(
  transaction: FirestoreTransactionGateway,
  stored: StoredOwnInterests,
): Promise<OwnInterestsProjection | undefined> {
  const interestTags: SelectedInterestTag[] = [];
  for (const interestTagId of stored.interestTagIds) {
    const data = await transaction.get(interestTagPath(interestTagId));
    if (data === undefined) return undefined;
    const tag = parseInterestTag(interestTagId, data);
    if (tag === undefined) return undefined;
    interestTags.push({
      interestTagId: tag.interestTagId,
      displayName: tag.displayName,
      lifecycleState: tag.lifecycleState,
    });
  }
  return { interestTags, revision: stored.revision };
}

export class FirestoreInterestRepository implements InterestRepository {
  public constructor(private readonly firestore: FirestoreGateway) {}

  public async listActive(
    firebaseUid: string,
  ): Promise<InterestReadResult<readonly InterestTagSummary[]>> {
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const account = await resolveAccount(transaction, firebaseUid);
        if (account.kind !== "found") return account;
        const documents = await transaction.list(FIRESTORE_COLLECTIONS.interestTags);
        const tags: InterestTagSummary[] = [];
        for (const document of documents) {
          const tag = parseInterestTag(document.id, document.data);
          if (tag === undefined) return dependencyUnavailable;
          if (tag.lifecycleState === "active") {
            tags.push({
              interestTagId: tag.interestTagId,
              displayName: tag.displayName,
            });
          }
        }
        tags.sort((left, right) =>
          left.interestTagId < right.interestTagId
            ? -1
            : left.interestTagId > right.interestTagId
              ? 1
              : 0,
        );
        return { kind: "found", value: tags };
      });
    } catch {
      return dependencyUnavailable;
    }
  }

  public async getOwn(
    firebaseUid: string,
  ): Promise<InterestReadResult<OwnInterestsProjection>> {
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const account = await resolveAccount(transaction, firebaseUid);
        if (account.kind !== "found") return account;
        const data = await transaction.get(ownInterestsPath(account.accountId));
        if (data === undefined) {
          return { kind: "found", value: { interestTags: [], revision: 0 } };
        }
        const stored = parseOwnInterests(data);
        if (stored === undefined) return dependencyUnavailable;
        const projection = await projectOwnInterests(transaction, stored);
        return projection === undefined
          ? dependencyUnavailable
          : { kind: "found", value: projection };
      });
    } catch {
      return dependencyUnavailable;
    }
  }

  public async replaceOwn(input: {
    readonly firebaseUid: string;
    readonly interestTagIds: readonly string[];
    readonly expectedRevision: number;
  }): Promise<ReplaceOwnInterestsResult> {
    if (
      input.interestTagIds.length > 10 ||
      new Set(input.interestTagIds).size !== input.interestTagIds.length ||
      input.interestTagIds.some((value) => !isSafeDocumentId(value)) ||
      !Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision < 0
    ) {
      return { kind: "selection_invalid" };
    }

    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const account = await resolveAccount(transaction, input.firebaseUid);
        if (account.kind !== "found") return account;
        const path = ownInterestsPath(account.accountId);
        const currentData = await transaction.get(path);
        const current = currentData === undefined
          ? { interestTagIds: [] as readonly string[], revision: 0 }
          : parseOwnInterests(currentData);
        if (current === undefined) return dependencyUnavailable;
        if (current.revision !== input.expectedRevision) {
          return { kind: "revision_precondition_failed" };
        }
        if (current.revision >= Number.MAX_SAFE_INTEGER) {
          return dependencyUnavailable;
        }

        const existingIds = new Set(current.interestTagIds);
        const selectedTags: SelectedInterestTag[] = [];
        for (const interestTagId of input.interestTagIds) {
          const data = await transaction.get(interestTagPath(interestTagId));
          if (data === undefined) return { kind: "selection_invalid" };
          const tag = parseInterestTag(interestTagId, data);
          if (tag === undefined) return dependencyUnavailable;
          if (tag.lifecycleState === "inactive" && !existingIds.has(interestTagId)) {
            return { kind: "selection_invalid" };
          }
          selectedTags.push({
            interestTagId: tag.interestTagId,
            displayName: tag.displayName,
            lifecycleState: tag.lifecycleState,
          });
        }

        const revision = current.revision + 1;
        transaction.set(path, {
          interestTagIds: [...input.interestTagIds],
          revision,
        });
        return {
          kind: "saved",
          value: { interestTags: selectedTags, revision },
        };
      });
    } catch {
      return dependencyUnavailable;
    }
  }
}
