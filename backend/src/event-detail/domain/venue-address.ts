/** Complete SG address from one explicit venue, never inferred from its name. */
export interface VenueAddress {
  readonly street: string;
  readonly street2?: string;
  readonly city: string;
  readonly postalCode: string;
  readonly countryCode: 'SG';
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.isWellFormed() && !!v.trim() && [...v].length <= max && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]|```/u.test(v);
export function projectVenueAddress(venues: unknown): VenueAddress | undefined {
  if (!Array.isArray(venues) || venues.length !== 1) return undefined;
  const venue: unknown = venues[0];
  if (!object(venue) || !object(venue.address) || !object(venue.city) || !object(venue.country) ||
      venue.country.countryCode !== 'SG' || !text(venue.address.line1, 200) || !text(venue.city.name, 100) ||
      typeof venue.postalCode !== 'string' || !/^[0-9]{6}$/.test(venue.postalCode) ||
      (Object.hasOwn(venue.address, 'line2') && !text(venue.address.line2, 200))) return undefined;
  return { street: venue.address.line1, city: venue.city.name, postalCode: venue.postalCode, countryCode: 'SG',
    ...(typeof venue.address.line2 === 'string' ? { street2: venue.address.line2 } : {}) };
}
