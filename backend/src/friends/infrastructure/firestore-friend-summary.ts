import type { FriendSummary } from "../ports/friend-summary.js";
import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { Clock } from "../../shared/ports/clock.js";
import { ok,err } from "../../shared/domain/result.js";
import { viewer,member,fail,failure,SocialFailure } from "./social-authority.js";
import { parsePair,friendPairKey } from "./firestore-friend-repository.js";
import { isRequestRef } from "../domain/request-reference.js";
export class FirestoreFriendSummary implements FriendSummary {
  constructor(private readonly store:FirestoreGateway,private readonly clock:Clock){}
  async pendingCount(uid:string){
    try{return await this.store.runTransaction(async tx=>{
      const own=await viewer(tx,uid),now=this.clock.now();
      if(!now.ok||!tx.listPage)return fail("SERVICE_UNAVAILABLE");
      let after:string|undefined,count=0;
      for(let page=0;page<40;page++){
        const rows=await tx.listPage(`friend_inboxes/${own.id}/requests`,after,25);
        for(const row of rows){
          if(!isRequestRef(row.id)||Object.keys(row.data).length!==1||typeof row.data.pairKey!=="string"||!/^[a-f0-9]{64}$/.test(row.data.pairKey))return fail("SERVICE_UNAVAILABLE");
          const stored=await tx.get(`friend_pairs/${row.data.pairKey}`),ids=stored?.accountIds;
          if(!Array.isArray(ids)||ids.length!==2||!ids.includes(own.id))return fail("SERVICE_UNAVAILABLE");
          const other=ids.find(id=>id!==own.id);if(typeof other!=="string")return fail("SERVICE_UNAVAILABLE");
          const pair=parsePair(stored,own.id,other);if(!pair)return fail("SERVICE_UNAVAILABLE");
          if(friendPairKey(own.id,other)!==row.data.pairKey||pair.blockedByAccountIds.length||!pair.pending||
            pair.pending.requestRef!==row.id||pair.pending.recipientAccountId!==own.id||Date.parse(pair.pending.expiresAt)<=now.value.getTime())continue;
          try{const sender=await member(tx,other);if(sender.displayName!==null)count++;}
          catch(e){if(e instanceof SocialFailure&&e.code==="ADD_FRIEND_TARGET_UNAVAILABLE")continue;throw e;}
        }
        if(rows.length<25)return ok({pendingRequestCount:count});
        const last=rows.at(-1)!.id;if(last===after)return fail("SERVICE_UNAVAILABLE");after=last;
      }
      return fail("SERVICE_UNAVAILABLE");
    });}catch(e){return err(failure(e));}
  }
}
