import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface FriendSummary {pendingCount(uid:string):Promise<Result<{pendingRequestCount:number},AppFailure>>}
