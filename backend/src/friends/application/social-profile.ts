import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { SocialRepository } from "../ports/social-repository.js";
/** Trusted principal only; no client owner/account ID is accepted. */
export class SocialProfiles {
  constructor(private readonly repository:SocialRepository) {}
  profile(principal:AuthPrincipal,username:string){return this.repository.profile(principal.firebaseUid,username);}
  record(principal:AuthPrincipal,username:string,checkInId:string){return this.repository.record(principal.firebaseUid,username,checkInId);}
  records(principal:AuthPrincipal,username:string,input:Parameters<SocialRepository["records"]>[2]){
    return this.repository.records(principal.firebaseUid,username,input);
  }
  month(principal:AuthPrincipal,username:string,input:Parameters<SocialRepository["month"]>[2]){
    return this.repository.month(principal.firebaseUid,username,input);
  }
  care(principal:AuthPrincipal,username:string,input:Parameters<SocialRepository["care"]>[2]){
    return this.repository.care(principal.firebaseUid,username,input);
  }
  remove(principal:AuthPrincipal,username:string,expectedRevision:number){
    return this.repository.remove(principal.firebaseUid,username,expectedRevision);
  }
}
