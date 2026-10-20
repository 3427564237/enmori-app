import type { WeatherPurposeAuthority } from "../ports/weather-purpose-authority.js";
import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId,parseAuthBinding,parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { ok,err } from "../../shared/domain/result.js";
import { appFailure } from "../../shared/application/app-failure.js";
export class FirestoreWeatherPurposeAuthority implements WeatherPurposeAuthority {
  constructor(private readonly store:FirestoreGateway){}
  async current(uid:string){
    try{return await this.store.runTransaction(async tx=>{
      const key=createAuthBindingDocumentId(uid);if(!key)return err(appFailure("AUTH_FORBIDDEN"));
      const binding=await tx.get(`auth_bindings/${key}`);
      if(!binding)return err(appFailure("ONBOARDING_REQUIRED"));
      const id=parseAuthBinding(binding);if(!id)return err(appFailure("SERVICE_UNAVAILABLE"));
      const account=await tx.get(`accounts/${id}`),revision=account?.settingsRevision??0;
      if(!account||!parseAccountProjection(account))return err(appFailure("AUTH_FORBIDDEN"));
      if(!Number.isSafeInteger(revision)||Number(revision)<0)return err(appFailure("SERVICE_UNAVAILABLE"));
      return ok({accountId:id,settingsRevision:Number(revision)});
    });}catch{return err(appFailure("SERVICE_UNAVAILABLE"));}
  }
}
