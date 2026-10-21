import { appFailure, type AppFailureCode } from "../../shared/application/app-failure.js";
export class SocialFailure extends Error { constructor(readonly code: AppFailureCode) { super(code); } }
export const fail = (code: AppFailureCode): never => { throw new SocialFailure(code); };
export const failure = (error: unknown) => appFailure(error instanceof SocialFailure ? error.code : "SERVICE_UNAVAILABLE");
export function visible(value: unknown, self: boolean, friend: boolean): boolean {
  return self || value === "public" || (value === "friends_only" && friend);
}
