import type { ServiceOwnershipConfiguration, ServiceOwnerLease } from '../ports/service-owner.js';

export const SERVICE_OWNER_RESPONSE_MS = 15000;
export const SERVICE_OWNER_LOCAL_MS = 105000;
export const SERVICE_OWNER_STARTUP_MS = 135000;
export const serviceOwnerUuid = (v: unknown): v is string => typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, fields: readonly string[]) => Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v,k));
const serviceKey = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

export function parseServiceOwnership(value: unknown): ServiceOwnershipConfiguration | undefined {
  if (!record(value) || !exact(value,['mode','serviceKey','leaseDurationMs','renewEveryMs','safetyMarginMs']) ||
      value.mode !== 'renewable_service_lease' || !serviceKey(value.serviceKey) || value.leaseDurationMs !== 120000 ||
      value.renewEveryMs !== 30000 || value.safetyMarginMs !== 15000) return undefined;
  return Object.freeze({mode:value.mode,serviceKey:value.serviceKey,leaseDurationMs:120000,renewEveryMs:30000,safetyMarginMs:15000});
}
export interface ServiceOwnerRecord extends ServiceOwnerLease {
  readonly schemaVersion: 'openai_service_owner_v1';
  readonly enabled: boolean;
}
export function parseServiceOwner(value: unknown): ServiceOwnerRecord | undefined {
  if (!record(value) || !exact(value,['schemaVersion','serviceKey','enabled','processEpoch','generation','leaseVersion','renewedAtMs','leaseUntilMs']) ||
      value.schemaVersion !== 'openai_service_owner_v1' || !serviceKey(value.serviceKey) || typeof value.enabled !== 'boolean' ||
      !serviceOwnerUuid(value.processEpoch) || !integer(value.generation) || value.generation < 1 ||
      !integer(value.leaseVersion) || !integer(value.renewedAtMs) || !integer(value.leaseUntilMs) ||
      !(value.renewedAtMs === 0 && value.leaseUntilMs === 0 || value.renewedAtMs > 0 &&
        value.leaseUntilMs - value.renewedAtMs === 120000 && value.leaseVersion > 0)) return undefined;
  return Object.freeze({...value}) as unknown as ServiceOwnerRecord;
}
export function parseServiceFence(value: unknown): {readonly processEpoch:string;readonly generation:number;readonly cleanupGeneration:number} | undefined {
  if (!record(value) || !exact(value,['processEpoch','generation','cleanupGeneration']) || !serviceOwnerUuid(value.processEpoch) ||
      !integer(value.generation) || value.generation < 1 || !integer(value.cleanupGeneration)) return undefined;
  return {processEpoch:value.processEpoch,generation:value.generation,cleanupGeneration:value.cleanupGeneration};
}
/** Floor service time: never invent a later observation from discarded precision. */
export function serviceObservationMilliseconds(value: unknown): number | undefined {
  if (!record(value) || !integer(value.seconds) || !integer(value.nanoseconds) || value.nanoseconds >= 1000000000) return undefined;
  const ms=value.seconds*1000+Math.floor(value.nanoseconds/1000000);
  return Number.isSafeInteger(ms) && ms > 0 && ms <= Number.MAX_SAFE_INTEGER-120000 ? ms : undefined;
}
