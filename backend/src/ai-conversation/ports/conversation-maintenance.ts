import type { RuntimeEpoch } from "./real-conversation-store.js";

export interface MaintenanceResult {
  readonly complete:boolean;readonly inspected:number;readonly changed:number;
  readonly failures:number;readonly expiredOrInvalidCheckpoint:boolean;
}
export interface ConversationMaintenance {
  sourceSweep(epoch:RuntimeEpoch):Promise<MaintenanceResult>;
  expirySweep(epoch:RuntimeEpoch):Promise<MaintenanceResult>;
}
