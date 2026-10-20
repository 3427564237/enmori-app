import type { AppFailure } from "../../shared/application/app-failure.js";
import type { Result } from "../../shared/domain/result.js";
import type { CheckInProjection } from "../../check-ins/application/check-in-model.js";
import type { ProfileDetails } from "../../account/domain/profile-details.js";
import type { Position } from "../../weather/domain/weather.js";
export interface SocialProfile {
  readonly username:string;
  readonly displayName:string|null;
  readonly details:ProfileDetails;
  readonly relationship:"self"|"friend"|"other";
  readonly specialCare:boolean;
  readonly friendshipRevision:number;
  readonly interests:readonly {readonly interestTagId:string;readonly displayName:string}[];
  readonly mapAvailable:boolean;
  readonly participationAvailable:boolean;
}
export interface SocialRecords {
  readonly checkIns:readonly CheckInProjection[];
  readonly nextCursor:string|null;
}
export interface SocialMonth {
  readonly month:string; readonly timeZone:string;
  readonly days:readonly {readonly date:string;readonly count:number}[];
  readonly points:readonly {readonly checkInId:string;readonly createdAt:string;readonly location:Position}[];
}
export interface SocialRepository {
  profile(uid:string,username:string):Promise<Result<SocialProfile,AppFailure>>;
  records(uid:string,username:string,input:{date:string;timeZone:string;cursor?:string}):Promise<Result<SocialRecords,AppFailure>>;
  record(uid:string,username:string,checkInId:string):Promise<Result<CheckInProjection,AppFailure>>;
  month(uid:string,username:string,input:{month:string;timeZone:string}):Promise<Result<SocialMonth,AppFailure>>;
  care(uid:string,username:string,input:{specialCare:boolean;expectedRevision:number}):Promise<Result<{specialCare:boolean;friendshipRevision:number},AppFailure>>;
  remove(uid:string,username:string,expectedRevision:number):Promise<Result<void,AppFailure>>;
}
