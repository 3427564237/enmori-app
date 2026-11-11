import type { FirestoreGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';
import type { InterestAdminAuthority } from '../interests/ports/interest-admin.js';
import type { BrowseSource } from '../event-browse/ports/event-browse.js';
import type { AuthPrincipal } from '../shared/ports/identity-verifier.js';
import type { Result } from '../shared/domain/result.js';
import { err } from '../shared/domain/result.js';
import { appFailure, type AppFailure } from '../shared/application/app-failure.js';
import { AdminOperations } from '../admin/application/admin-operations.js';
import { RuntimeStatus } from '../admin/application/runtime-status.js';
import { FirestoreAdminRepository } from '../admin/infrastructure/firestore-admin-repository.js';
import { FirestoreOperationRecords } from '../admin/infrastructure/firestore-operation-records.js';

export function createAdminComposition(store: FirestoreGateway, authority: InterestAdminAuthority, options: {
  readonly source?: BrowseSource;
  readonly ai?: () => {configured:boolean;available:boolean;maintenanceHealthy:boolean};
  readonly eventExists?: (p:AuthPrincipal,id:string)=>Promise<Result<void,AppFailure>>;
} = {}) {
  const audit = new FirestoreOperationRecords(store), repository = new FirestoreAdminRepository(store, audit);
  const runtime = new RuntimeStatus(options.ai ?? (()=>({configured:false,available:false,maintenanceHealthy:true})),
    ()=>options.source?.observations?.()??[], options.source !== undefined, ()=>audit.healthy);
  const operations = new AdminOperations(authority, repository, runtime, options.eventExists ?? (async()=>err(appFailure('EVENT_UNAVAILABLE'))));
  let timer: ReturnType<typeof setInterval> | undefined, running: Promise<void> | undefined;
  const cycle = async () => {
    if (running) return running;
    running = audit.cleanup();
    try { await running; } finally { running = undefined; }
  };
  return {audit, operations, repository, maintenance: {
    start: async () => { await cycle(); timer = setInterval(()=>{void cycle();},3600000);timer.unref(); },
    stop: async () => {if(timer)clearInterval(timer);await running;},
  }};
}
