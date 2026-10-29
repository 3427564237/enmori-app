import { Buffer } from "node:buffer";
import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { ProactiveAccountRoster } from "../ports/account-roster.js";

/** One bounded binding page, then only settings metadata for those owners.
 * Bad rows cannot stall all later users; dependency failure keeps the cursor. */
export class FirestoreProactiveAccountRoster implements ProactiveAccountRoster {
  constructor(private readonly gateway:FirestoreGateway){}
  page(after:string|undefined){return this.gateway.runTransaction(async tx=>{
    if(!tx.listPage)throw Error("Bounded roster unavailable");
    const rows=await tx.listPage("auth_bindings",after,25),actors:string[]=[];
    if(rows.length>25)throw Error("Invalid roster page");
    for(const row of rows){
      const uid=Buffer.from(row.id.slice(4),"base64url").toString("utf8");
      if(createAuthBindingDocumentId(uid)!==row.id)continue;
      const owner=parseAuthBinding(row.data);if(!owner)continue;
      const state=await tx.get(`accounts/${owner}/proactive_state/current`);
      if(state&&Array.isArray(state.activeIntentIds)&&state.activeIntentIds.length>0&&state.activeIntentIds.length<=3)actors.push(uid);
    }
    return {actors,next:rows.length===25?rows.at(-1)!.id:undefined};
  },{maxAttempts:1});}
}
