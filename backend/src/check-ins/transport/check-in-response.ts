import type { CheckInProjection } from "../application/check-in-model.js";

/** Explicit public projection; never serialize owner/storage metadata. */
export function checkInResponse(checkIn: CheckInProjection): CheckInProjection {
  return {
    ...(checkIn.location === undefined ? {} : {location:checkIn.location}),
    ...(checkIn.weather === undefined ? {} : {weather:checkIn.weather}),
    checkInId: checkIn.checkInId,
    ...(checkIn.revision === undefined ? {} : { revision: checkIn.revision }),
    note: checkIn.note,
    ...(checkIn.mood === undefined ? {} : {mood:checkIn.mood}),
    ...(checkIn.locationLabel === undefined ? {} : {locationLabel:checkIn.locationLabel}),
    ...(checkIn.activity === undefined ? {} : {activity:checkIn.activity}),
    createdAt: checkIn.createdAt,
    ...(checkIn.checkInVisibility === undefined ? {} : { checkInVisibility: checkIn.checkInVisibility }),
  };
}

