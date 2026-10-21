import { appFailure, type AppFailure } from '../../shared/application/app-failure.js';
import { err, ok, type Result } from '../../shared/domain/result.js';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { createAuthBindingDocumentId, isSafeDocumentId, parseAccountProjection, parseAuthBinding, parseCheckInProjection } from '../../shared/infrastructure/firebase/firestore-records.js';
import type { CheckInProjection } from '../application/check-in-model.js';
import type { CheckInMutations } from '../ports/check-in-mutations.js';
import { parsePosition } from '../../weather/domain/weather.js';

export class FirestoreCheckInMutations implements CheckInMutations {
  constructor(private readonly gateway: FirestoreGateway) {}
  async update(input: Parameters<CheckInMutations['update']>[0]): Promise<Result<CheckInProjection, AppFailure>> {
    return this.mutate(input, (tx, path, stored, revision) => {
      // Text/mood edits preserve historical weather. Moving/removing the point,
      // or explicit withdrawal, removes its snapshot; no provider refresh.
      if (input.location != null && !parsePosition(input.location)) return err(appFailure('CHECKIN_INVALID'));
      const retained: Record<string, unknown> = {...stored};
      if (input.removeWeather === true || (input.location !== undefined &&
          JSON.stringify(input.location) !== JSON.stringify(stored.location))) delete retained.weather;
      if (input.location === null) delete retained.location;
      else if (input.location !== undefined) retained.location = input.location;
      const updated = { ...retained,
        ...(input.locationLabel === undefined ? {} : {locationLabel:input.locationLabel}),
        ...(input.mood === undefined ? {} : {mood:input.mood}), ...(input.activity === undefined ? {} : {activity:input.activity}), note: input.note, checkInVisibility: input.checkInVisibility, revision: revision + 1 };
      const projection = parseCheckInProjection(updated, input.checkInId);
      if (!projection) return err(appFailure('SERVICE_UNAVAILABLE'));
      tx.set(path, updated);
      return ok(projection);
    });
  }
  async remove(input: Parameters<CheckInMutations['remove']>[0]): Promise<Result<void, AppFailure>> {
    return this.mutate(input, (tx, path) => {
      if (!tx.delete) return err(appFailure('SERVICE_UNAVAILABLE'));
      tx.delete(path);
      return ok(undefined);
    });
  }
  private async mutate<T>(input: { firebaseUid: string; checkInId: string; expectedRevision: number },
    write: (tx: FirestoreTransactionGateway, path: string, stored: StoredDocument, revision: number) => Result<T, AppFailure>): Promise<Result<T, AppFailure>> {
    const bindingId = createAuthBindingDocumentId(input.firebaseUid);
    if (!bindingId) return err(appFailure('SERVICE_UNAVAILABLE'));
    if (!isSafeDocumentId(input.checkInId)) return err(appFailure('CHECKIN_UNAVAILABLE'));
    try {
      return await this.gateway.runTransaction(async tx => {
        const binding = await tx.get(`auth_bindings/${bindingId}`);
        if (!binding) return err(appFailure('ONBOARDING_REQUIRED'));
        const accountId = parseAuthBinding(binding);
        if (!accountId) return err(appFailure('SERVICE_UNAVAILABLE'));
        const account = await tx.get(`accounts/${accountId}`);
        if (!account || !parseAccountProjection(account)) return err(appFailure('SERVICE_UNAVAILABLE'));
        const path = `check_ins/${input.checkInId}`;
        const stored = await tx.get(path);
        if (!stored || stored.ownerAccountId !== accountId) return err(appFailure('CHECKIN_UNAVAILABLE'));
        if (!parseCheckInProjection(stored, input.checkInId)) return err(appFailure('SERVICE_UNAVAILABLE'));
        const revision = stored.revision ?? 1;
        if (!Number.isSafeInteger(revision) || Number(revision) < 1 || Number(revision) >= Number.MAX_SAFE_INTEGER) return err(appFailure('SERVICE_UNAVAILABLE'));
        if (revision !== input.expectedRevision) return err(appFailure('CHECKIN_REVISION_PRECONDITION_FAILED'));
        return write(tx, path, stored, Number(revision));
      });
    } catch { return err(appFailure('SERVICE_UNAVAILABLE')); }
  }
}
