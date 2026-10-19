import type { AppFailure } from '../../shared/application/app-failure.js';
import type { Result } from '../../shared/domain/result.js';
export interface CalendarDayWindow { readonly date:string; readonly startUtc:string; readonly endUtc:string|null; readonly empty:boolean; }
export interface CalendarDayCount { readonly date:string; readonly count:number; }
export interface CheckInCalendarRepository {
  countDays(firebaseUid:string, days:readonly CalendarDayWindow[]):Promise<Result<readonly CalendarDayCount[],AppFailure>>;
}
