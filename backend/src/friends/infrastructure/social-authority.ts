import { emptyProfileDetails,parseFieldPrivacy,parseProfileDetails,privateFields,type FieldPrivacy,type ProfileDetails } from "../../account/domain/profile-details.js";
import { isVisibility,normalizeDisplayName,type ProfileVisibility } from "../../account/domain/profile-values.js";
import { canonicalizeUsername } from "../../onboarding/domain/username.js";
import { appFailure,type AppFailureCode } from "../../shared/application/app-failure.js";
import { createAuthBindingDocumentId,isSafeDocumentId,parseAccountProjection,parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { friendPairKey,parsePair } from "./firestore-friend-repository.js";

export interface Reader { get(path:string):Promise<StoredDocument|undefined> }
export class SocialFailure extends Error { constructor(readonly code:AppFailureCode){super(code);} }
export const fail=(code:AppFailureCode):never=>{throw new SocialFailure(code);};
export const failure=(error:unknown)=>appFailure(error instanceof SocialFailure?error.code:"SERVICE_UNAVAILABLE");
export interface Member {
  id:string; data:StoredDocument; username:string; displayName:string|null;
  visibility:ProfileVisibility; fields:FieldPrivacy; details:ProfileDetails;
}
export interface SocialContext {
  viewer:Member;target:Member;self:boolean;friend:boolean;pairPath:string;
  pair:StoredDocument|undefined;revision:number;specialCare:boolean;
}
export async function member(reader:Reader,id:string):Promise<Member> {
  if(!isSafeDocumentId(id))return fail("SERVICE_UNAVAILABLE");
  const data=await reader.get(`accounts/${id}`), access=await reader.get(`friend_access/${id}`);
  const account=data&&parseAccountProjection(data);
  if(!account||!data)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  if(access?.eligibilityState!=="eligible")return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const fields=data.fieldPrivacy===undefined?privateFields:parseFieldPrivacy(data.fieldPrivacy);
  const details=data.profileDetails===undefined?emptyProfileDetails:parseProfileDetails(data.profileDetails);
  const visibility=data.profileVisibility??"private";
  const displayName=data.displayName===undefined?null:normalizeDisplayName(data.displayName);
  if(!fields||!details||!isVisibility(visibility)||displayName===undefined)return fail("SERVICE_UNAVAILABLE");
  return {id,data,username:account.username,displayName,visibility,fields,details};
}
export async function viewer(reader:Reader,uid:string):Promise<Member> {
  const bindingId=createAuthBindingDocumentId(uid);
  if(!bindingId)return fail("AUTH_FORBIDDEN");
  const binding=await reader.get(`auth_bindings/${bindingId}`);
  if(!binding)return fail("ONBOARDING_REQUIRED");
  const id=parseAuthBinding(binding);
  if(!id)return fail("SERVICE_UNAVAILABLE");
  try{return await member(reader,id);}catch(error){
    if(error instanceof SocialFailure&&error.code==="ADD_FRIEND_TARGET_UNAVAILABLE")return fail("AUTH_FORBIDDEN");
    throw error;
  }
}
export function visible(value:unknown,self:boolean,friend:boolean):boolean {
  return self||value==="public"||(value==="friends_only"&&friend);
}
export function revision(pair:StoredDocument|undefined,accountId:string):number {
  const revisions=pair?.revisions;
  if(revisions!==undefined&&(revisions===null||typeof revisions!=="object"||Array.isArray(revisions)))return fail("SERVICE_UNAVAILABLE");
  const value=(revisions as Record<string,unknown>|undefined)?.[accountId]??0;
  if(!Number.isSafeInteger(value)||Number(value)<0||Number(value)>=Number.MAX_SAFE_INTEGER)return fail("SERVICE_UNAVAILABLE");
  return Number(value);
}
export async function context(reader:Reader,uid:string,username:string,profileRequired=true):Promise<SocialContext> {
  const own=await viewer(reader,uid);
  const normalized=canonicalizeUsername(username);
  if(!normalized.ok)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const reservation=await reader.get(`username_reservations/${normalized.value}`);
  if(typeof reservation?.accountId!=="string")return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const target=reservation.accountId===own.id?own:await member(reader,reservation.accountId);
  if(target.username!==normalized.value)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const self=own.id===target.id, path=`friend_pairs/${friendPairKey(own.id,target.id)}`;
  const stored=self?undefined:await reader.get(path);
  const pair=stored===undefined?undefined:parsePair(stored,own.id,target.id);
  if(stored!==undefined&&!pair)return fail("SERVICE_UNAVAILABLE");
  if(pair?.blockedByAccountIds.length)return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const friend=pair?.friendship===true;
  if(profileRequired&&!visible(target.visibility,self,friend))return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
  const preferences=stored?.specialCareByAccount;
  if(preferences!==undefined&&(preferences===null||typeof preferences!=="object"||Array.isArray(preferences)||
      Object.keys(preferences).some(id=>id!==own.id&&id!==target.id)||
      Object.values(preferences).some(v=>typeof v!=="boolean")))return fail("SERVICE_UNAVAILABLE");
  return {viewer:own,target,self,friend,pairPath:path,pair:stored,revision:revision(stored,own.id),
    specialCare:friend&&!!(preferences as Record<string,boolean>|undefined)?.[own.id]};
}
