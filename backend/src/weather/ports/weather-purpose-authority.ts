import type { Result } from "../../shared/domain/result.js";
import type { AppFailure } from "../../shared/application/app-failure.js";
export interface WeatherPurposeAuthority {
  /** Current identity/settings only. Explicit purpose and grid come from this request. */
  current(uid:string):Promise<Result<{accountId:string;settingsRevision:number},AppFailure>>;
}
