import type { VenueAddress } from "../../event-detail/domain/venue-address.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface BrowseItem { readonly browseId:string; readonly eventId?:string; readonly title:string; readonly startAt:string; readonly endAt?:string; readonly locationLabel?:string; readonly categoryLabel?:string }
export interface BrowseDetail extends BrowseItem { readonly externalSourceUrl:string; readonly locationLabel?:string; readonly categoryLabel?:string; readonly shortDescription?:string; readonly coverImageUrl?:string }
/** Internal source metadata; never serialized into public browse DTOs. */
export interface BrowseOccurrence extends BrowseDetail { readonly musicSegment?: true; readonly venueAddress?: VenueAddress; readonly interestConcepts?: readonly string[]; readonly regionNames?: readonly string[] }
export interface RecommendationSnapshot { readonly items: readonly BrowseOccurrence[]; current(): boolean }
export interface BrowseBatch { readonly asOf:string; readonly scope:"ticketmaster_sg_first_batch_v1"; readonly items:readonly BrowseItem[]; readonly nextCursor?:string }
/** Completed-owner check; caller identity is verified by Transport, not JSON. */
export interface BrowseAccountGate { verify(principal:AuthPrincipal):Promise<Result<void,AppFailure>> }
export interface BrowseSource {
  recommendationSnapshot?(asOf:string,signal:AbortSignal):Promise<RecommendationSnapshot>;
  batch?(asOf:string,page:number,signal:AbortSignal):Promise<{readonly items:readonly BrowseOccurrence[];readonly nextPage?:number}>;
  availableEvent?(eventId:string,asOf:string,signal:AbortSignal):Promise<boolean>;
  event?(eventId:string,asOf:string,signal:AbortSignal):Promise<BrowseOccurrence|undefined>;
  firstBatch(asOf:string,signal:AbortSignal):Promise<readonly BrowseOccurrence[]>;
  detail(browseId:string,asOf:string,signal:AbortSignal):Promise<BrowseOccurrence|undefined>;
}
export interface BrowsePosition {
  encode(uid:string,asOf:string,page:number):string;
  decode(uid:string,token:string,now:Date):{asOf:string;page:number}|undefined;
}
