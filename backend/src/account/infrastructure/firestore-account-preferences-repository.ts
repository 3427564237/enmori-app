import type { AccountPreferencesRepository, AccountRead, AccountSave } from "../ports/account-preferences-repository.js";
import type { OwnProfile, OwnSettings, ProfileChange, SettingsChange } from "../application/account-model.js";
import { isRevision, isVisibility, normalizeDisplayName } from "../domain/profile-values.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";

type ResolvedAccount = { readonly kind: "found"; readonly path: string; readonly data: StoredDocument }
  | { readonly kind: "onboarding_required" } | typeof dependencyUnavailable;

async function resolveAccount(transaction: FirestoreTransactionGateway, uid: string): Promise<ResolvedAccount> {
  const id = createAuthBindingDocumentId(uid);
  if (id === undefined) return dependencyUnavailable;
  const binding = await transaction.get(`auth_bindings/${id}`);
  if (binding === undefined) return { kind: "onboarding_required" };
  const accountId = parseAuthBinding(binding);
  if (accountId === undefined) return dependencyUnavailable;
  const path = `accounts/${accountId}`;
  const data = await transaction.get(path);
  if (data === undefined || parseAccountProjection(data) === undefined) return dependencyUnavailable;
  return { kind: "found", path, data };
}

export function parseOwnProfile(data: StoredDocument): OwnProfile | undefined {
  const account = parseAccountProjection(data);
  if (account === undefined) return undefined;
  const fields = ["displayName", "profileVisibility", "profileRevision"];
  if (fields.every((key) => !Object.hasOwn(data, key))) {
    return { username: account.username, displayName: null, profileVisibility: "private", revision: 0 };
  }
  if (!fields.every((key) => Object.hasOwn(data, key)) || !isVisibility(data.profileVisibility) ||
    !isRevision(data.profileRevision) || data.profileRevision < 1) return undefined;
  const displayName = normalizeDisplayName(data.displayName);
  if (displayName === undefined || displayName !== data.displayName) return undefined;
  return { username: account.username, displayName, profileVisibility: data.profileVisibility, revision: data.profileRevision };
}

export function parseOwnSettings(data: StoredDocument): OwnSettings | undefined {
  const account = parseAccountProjection(data);
  if (account === undefined) return undefined;
  const revision = Object.hasOwn(data, "settingsRevision") ? data.settingsRevision : 0;
  if (!isRevision(revision) || (Object.hasOwn(data, "settingsRevision") && revision < 1)) return undefined;
  return { checkInVisibility: account.checkInVisibility, optionalProcessingConsent: account.optionalProcessingConsent, revision };
}

export class FirestoreAccountPreferencesRepository implements AccountPreferencesRepository {
  public constructor(private readonly firestore: FirestoreGateway) {}

  public getProfile(uid: string): Promise<AccountRead<OwnProfile>> {
    return this.read(uid, parseOwnProfile);
  }
  public getSettings(uid: string): Promise<AccountRead<OwnSettings>> {
    return this.read(uid, parseOwnSettings);
  }

  public saveProfile(uid: string, change: ProfileChange): Promise<AccountSave<OwnProfile>> {
    return this.save(uid, change.expectedRevision, parseOwnProfile, (revision) => ({
      displayName: change.displayName, profileVisibility: change.profileVisibility, profileRevision: revision,
    }));
  }
  public saveSettings(uid: string, change: SettingsChange): Promise<AccountSave<OwnSettings>> {
    return this.save(uid, change.expectedRevision, parseOwnSettings, (revision) => ({
      checkInVisibility: change.checkInVisibility, optionalProcessingConsent: change.optionalProcessingConsent, settingsRevision: revision,
    }));
  }

  private async read<T>(uid: string, project: (data: StoredDocument) => T | undefined): Promise<AccountRead<T>> {
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const account = await resolveAccount(transaction, uid);
        if (account.kind !== "found") return account;
        const value = project(account.data);
        return value === undefined ? dependencyUnavailable : { kind: "found", value };
      });
    } catch { return dependencyUnavailable; }
  }

  private async save<T extends { readonly revision: number }>(uid: string, expected: number,
    project: (data: StoredDocument) => T | undefined, fields: (revision: number) => StoredDocument): Promise<AccountSave<T>> {
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const account = await resolveAccount(transaction, uid);
        if (account.kind !== "found") return account;
        const current = project(account.data);
        if (current === undefined || !isRevision(expected)) return dependencyUnavailable;
        if (current.revision !== expected) return { kind: "revision_precondition_failed" };
        if (current.revision >= Number.MAX_SAFE_INTEGER) return dependencyUnavailable;
        const next = { ...account.data, ...fields(current.revision + 1) };
        const value = project(next);
        if (value === undefined) return dependencyUnavailable;
        transaction.set(account.path, next);
        return { kind: "saved", value };
      });
    } catch { return dependencyUnavailable; }
  }
}
