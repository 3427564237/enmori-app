import type { AppFailure } from '../../shared/application/app-failure.js';
import type { Result } from '../../shared/domain/result.js';
import type { CheckInProjection } from '../application/check-in-model.js';

export interface CheckInMutations {
  update(input: { firebaseUid: string; checkInId: string; expectedRevision: number;
    location?: import("../../weather/domain/weather.js").Position | null; removeWeather?: boolean;
    mood?: string | null; locationLabel?: string | null; activity?: string | null; note: string; checkInVisibility: 'private' | 'friends_only' | 'public' }): Promise<Result<CheckInProjection, AppFailure>>;
  remove(input: { firebaseUid: string; checkInId: string; expectedRevision: number }): Promise<Result<void, AppFailure>>;
}
