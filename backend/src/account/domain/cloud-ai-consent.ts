/** Explicit Groq disclosure grant. Absence is never acceptance. */
export interface CloudAiConsent {
  readonly state: 'accepted' | 'declined';
  readonly disclosureVersion: 'groq_cloud_v1';
}
export function parseCloudAiConsent(value: unknown): CloudAiConsent | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 2 || !Object.hasOwn(v, 'state') || !Object.hasOwn(v, 'disclosureVersion') ||
      !['accepted', 'declined'].includes(v.state as string) || v.disclosureVersion !== 'groq_cloud_v1') return undefined;
  return Object.freeze({ state: v.state as CloudAiConsent['state'], disclosureVersion: 'groq_cloud_v1' });
}
export function hasCloudAiConsent(value: unknown, optionalConsent: unknown): boolean {
  return optionalConsent === 'accepted' && parseCloudAiConsent(value)?.state === 'accepted';
}
