/** Backend-pinned recipients. A processor change always needs new acceptance. */
export const GROQ_CLOUD_PROCESSING = Object.freeze({ provider: 'groq', disclosureVersion: 'groq_cloud_v1' } as const);
export const OPENAI_CLOUD_PROCESSING = Object.freeze({ provider: 'openai', disclosureVersion: 'openai_cloud_v1' } as const);
export type CloudAiProcessing = typeof GROQ_CLOUD_PROCESSING | typeof OPENAI_CLOUD_PROCESSING;
export type CloudAiDisclosureVersion = CloudAiProcessing['disclosureVersion'];
export interface CloudAiConsent {
  readonly state: 'accepted' | 'declined';
  readonly disclosureVersion: CloudAiDisclosureVersion;
}
export function parseCloudAiProcessing(provider: unknown, disclosureVersion: unknown): CloudAiProcessing | undefined {
  if (provider === 'groq' && disclosureVersion === GROQ_CLOUD_PROCESSING.disclosureVersion) return GROQ_CLOUD_PROCESSING;
  if (provider === 'openai' && disclosureVersion === OPENAI_CLOUD_PROCESSING.disclosureVersion) return OPENAI_CLOUD_PROCESSING;
  return undefined;
}
/** Old in-memory cloud grants had no provider tuple and were Groq-only. */
export function legacyCloudAiProcessing(value: { readonly provider?: unknown; readonly disclosureVersion?: unknown }): CloudAiProcessing | undefined {
  return value.provider === undefined && value.disclosureVersion === undefined
    ? GROQ_CLOUD_PROCESSING : parseCloudAiProcessing(value.provider, value.disclosureVersion);
}
export function parseCloudAiConsent(value: unknown): CloudAiConsent | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 2 || !Object.hasOwn(v, 'state') || !Object.hasOwn(v, 'disclosureVersion') ||
      !['accepted', 'declined'].includes(v.state as string) ||
      v.disclosureVersion !== GROQ_CLOUD_PROCESSING.disclosureVersion && v.disclosureVersion !== OPENAI_CLOUD_PROCESSING.disclosureVersion) return undefined;
  return Object.freeze({ state: v.state as CloudAiConsent['state'], disclosureVersion: v.disclosureVersion });
}
export function hasCloudAiConsent(value: unknown, optionalConsent: unknown,
  processing: CloudAiProcessing = GROQ_CLOUD_PROCESSING): boolean {
  const grant = parseCloudAiConsent(value);
  return parseCloudAiProcessing(processing.provider, processing.disclosureVersion) !== undefined &&
    optionalConsent === 'accepted' && grant?.state === 'accepted' && grant.disclosureVersion === processing.disclosureVersion;
}
