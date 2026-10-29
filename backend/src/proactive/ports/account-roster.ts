/** Internal identity metadata only; no private records or caller-supplied owner. */
export interface ProactiveAccountRoster {
  page(after: string|undefined):Promise<{readonly actors:readonly string[];readonly next:string|undefined}>;
}
