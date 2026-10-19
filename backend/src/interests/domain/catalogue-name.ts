import { defaultCaseFold } from './unicode-case-fold.js';
export function catalogueName(input: unknown): { displayName: string; comparisonKey: string } | undefined {
  if (typeof input !== 'string' || !input.isWellFormed()) return undefined;
  const displayName = input.normalize('NFC').trim();
  if ([...displayName].length < 1 || [...displayName].length > 50 || /\p{Cc}|[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(displayName)) return undefined;
  const comparisonKey = defaultCaseFold(displayName.normalize('NFKC')).trim().replace(/\s+/gu, ' ');
  return comparisonKey.length ? { displayName, comparisonKey } : undefined;
}
export const coreInterestNames = ['Photography', 'Outdoors', 'Music', 'Art', 'Books', 'Films', 'Gaming', 'Food', 'Fitness', 'Travel', 'Technology', 'Volunteering'] as const;
