import type { FirestoreGateway } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { parseServiceFence, parseServiceOwner, parseServiceOwnership, serviceObservationMilliseconds, serviceOwnerUuid } from '../domain/service-owner.js';
import type { ServiceOwnerAuthority, ServiceOwnerLease, ServiceOwnerResult, ServiceOwnershipConfiguration } from '../ports/service-owner.js';

const OWNER='ai_runtime_fence/service_owner', FENCE='ai_runtime_fence/current';
/** Only the two approved coordination records. No financial, consent or product writes. */
export class FirestoreServiceOwner implements ServiceOwnerAuthority {
  private readonly configuration: ServiceOwnershipConfiguration;
  constructor(private readonly gateway: FirestoreGateway, configuration: ServiceOwnershipConfiguration) {
    const parsed=parseServiceOwnership(configuration);if(!parsed)throw Error('INVALID_SERVICE_OWNERSHIP');this.configuration=parsed;
  }
  acquire(processEpoch:string,current:()=>boolean):Promise<ServiceOwnerResult>{
    if(!serviceOwnerUuid(processEpoch))return Promise.resolve({kind:'unavailable'});
    return this.write(processEpoch,undefined,current);
  }
  renew(original:ServiceOwnerLease,current:()=>boolean):Promise<ServiceOwnerResult>{return this.write(original.processEpoch,original,current);}
  private async write(processEpoch:string,original:ServiceOwnerLease|undefined,current:()=>boolean):Promise<ServiceOwnerResult>{
    try{return await this.gateway.runTransaction(async tx=>{
      if(!current()||!tx.getSnapshot)return {kind:'unavailable'};
      // Every operation starts a fresh R/W transaction; occupied observations stage NO writes.
      const ownerSnapshot=await tx.getSnapshot(OWNER),fenceSnapshot=await tx.getSnapshot(FENCE);
      if(!current())return {kind:'unavailable'};
      const owner=parseServiceOwner(ownerSnapshot?.data),fence=parseServiceFence(fenceSnapshot?.data);
      const ownerTime=serviceObservationMilliseconds(ownerSnapshot?.readTime),fenceTime=serviceObservationMilliseconds(fenceSnapshot?.readTime);
      if(!owner||!fence||ownerTime===undefined||fenceTime===undefined||!owner.enabled||
        owner.serviceKey!==this.configuration.serviceKey||owner.processEpoch!==fence.processEpoch||owner.generation!==fence.generation||
        owner.leaseVersion>=Number.MAX_SAFE_INTEGER)return {kind:'unavailable'};
      const observed=Math.min(ownerTime,fenceTime);
      let generation=fence.generation;
      if(original){
        if(original.serviceKey!==owner.serviceKey||original.processEpoch!==owner.processEpoch||original.generation!==owner.generation||
          original.leaseVersion!==owner.leaseVersion||original.renewedAtMs!==owner.renewedAtMs||original.leaseUntilMs!==owner.leaseUntilMs||
          observed<owner.renewedAtMs||observed>=owner.leaseUntilMs)return {kind:'unavailable'};
      }else{
        if(observed<owner.renewedAtMs||processEpoch===owner.processEpoch||generation>=Number.MAX_SAFE_INTEGER)return {kind:'unavailable'};
        if(observed<owner.leaseUntilMs)return {kind:'occupied',remainingMs:owner.leaseUntilMs-observed};
        generation++;
      }
      const lease:ServiceOwnerLease=Object.freeze({serviceKey:owner.serviceKey,processEpoch,generation,
        leaseVersion:owner.leaseVersion+1,renewedAtMs:observed,leaseUntilMs:observed+120000});
      if(!current())return {kind:'unavailable'};
      if(!original)tx.set(FENCE,{processEpoch,generation,cleanupGeneration:fence.cleanupGeneration});
      tx.set(OWNER,{schemaVersion:'openai_service_owner_v1',enabled:true,...lease});
      return {kind:'confirmed',lease};
    },{maxAttempts:1});}catch{return {kind:'unknown'};}
  }
}
