import type { FirestoreGateway,FirestoreTransactionGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { context,visible,fail,failure } from "./social-authority.js";
import { ok,err } from "../../shared/domain/result.js";
/** JIN's privacy/relationship boundary for SHI's existing participation reader.
 * The callback executes against the same transaction and receives internal IDs
 * only after current field permission. No client-selected account IDs. The SHI
 * callback must return its own allowlisted result and perform no external IO. */
export class AuthorizedParticipation {
  constructor(private readonly store:FirestoreGateway){}
  async read<T>(principal:AuthPrincipal,username:string,
    project:(tx:FirestoreTransactionGateway,viewerAccountId:string,subjectAccountId:string)=>Promise<T>){
    try{return await this.store.runTransaction(async tx=>{
      const c=await context(tx,principal.firebaseUid,username);
      if(!visible(c.target.fields.participation,c.self,c.friend))return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
      return ok(await project(tx,c.viewer.id,c.target.id));
    });}catch(e){return err(failure(e));}
  }
}
