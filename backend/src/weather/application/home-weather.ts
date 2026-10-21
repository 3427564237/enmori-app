import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { Clock } from "../../shared/ports/clock.js";
import { ok,err } from "../../shared/domain/result.js";
import { appFailure } from "../../shared/application/app-failure.js";
import { coarsePosition,parseWeatherProjection } from "../domain/weather.js";
import type { WeatherProvider } from "../ports/weather-provider.js";
import type { WeatherPurposeAuthority } from "../ports/weather-purpose-authority.js";

/** Oct19 Home purpose is separate from Q13's persisted Check-in enrichment. */
export class HomeWeather {
  constructor(private readonly authority:WeatherPurposeAuthority,private readonly provider:WeatherProvider,private readonly clock:Clock){}
  async current(principal:AuthPrincipal,input:{position:unknown;expectedSettingsRevision:number}){
    try{
      const position=coarsePosition(input.position);
      if(!position||!Number.isSafeInteger(input.expectedSettingsRevision)||input.expectedSettingsRevision<0)return err(appFailure("REQUEST_INVALID"));
      const before=await this.authority.current(principal.firebaseUid);if(!before.ok)return before;
      if(before.value.settingsRevision!==input.expectedSettingsRevision)return err(appFailure("SETTINGS_REVISION_PRECONDITION_FAILED"));
      const now=this.clock.now();if(!now.ok)return err(appFailure("SERVICE_UNAVAILABLE"));
      const value=await this.provider.current(position,now.value.getTime());
      const after=await this.authority.current(principal.firebaseUid);if(!after.ok)return after;
      if(after.value.accountId!==before.value.accountId||after.value.settingsRevision!==input.expectedSettingsRevision)return err(appFailure("SETTINGS_REVISION_PRECONDITION_FAILED"));
      const weather=parseWeatherProjection(value);
      return weather?ok({weather}):err(appFailure("SERVICE_UNAVAILABLE"));
    }catch{return err(appFailure("SERVICE_UNAVAILABLE"));}
  }
}
