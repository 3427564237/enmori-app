import { EventBrowse } from "../event-browse/application/event-browse.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";
import type { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import { appFailure } from "../shared/application/app-failure.js";
import { err, ok } from "../shared/domain/result.js";

/** No provider construction or enablement here. The guarded test root supplies a source. */
export interface IsolatedEventBrowseInput {
  readonly source: BrowseSource;
  readonly now?: () => Date;
}

export function createIsolatedEventBrowse(
  onboarding: Pick<GetOnboarding, "execute">,
  input: IsolatedEventBrowseInput,
): EventBrowse {
  return new EventBrowse({
    async verify(principal) {
      const result = await onboarding.execute(principal);
      if (!result.ok) return result;
      return result.value.status === "completed"
        ? ok(undefined)
        : err(appFailure("ONBOARDING_REQUIRED"));
    },
  }, input.source, input.now);
}
