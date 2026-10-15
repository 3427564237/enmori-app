import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface BrowseItem { readonly browseId:string; readonly title:string; readonly startAt:string; readonly endAt?:string }
export interface BrowseDetail extends BrowseItem { readonly externalSourceUrl:string; readonly locationLabel?:string; readonly categoryLabel?:string }
export interface BrowseBatch { readonly asOf:string; readonly scope:"ticketmaster_sg_first_batch_v1"; readonly items:readonly BrowseItem[] }
/** Completed-owner check; caller identity is verified by Transport, not JSON. */
export interface BrowseAccountGate { verify(principal:AuthPrincipal):Promise<Result<void,AppFailure>> }
export interface BrowseSource {
  firstBatch(asOf:string,signal:AbortSignal):Promise<readonly BrowseDetail[]>;
  detail(browseId:string,asOf:string,signal:AbortSignal):Promise<BrowseDetail|undefined>;
}
