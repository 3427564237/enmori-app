import type { SourceFreshness } from '../ports/event-browse.js';
import { parseBrowseInstant } from './browse-values.js';

/** The public onePA cache owns this lifetime. Re-projection cannot restart it. */
export function freezeSourceFreshness(value:unknown):SourceFreshness|undefined {
  if(value===undefined)return undefined;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2)throw Error('Invalid source freshness');
  const row=value as Record<string,unknown>;
  if(typeof row.acquiredAt!=='string'||typeof row.expiresAt!=='string')throw Error('Invalid source freshness');
  const acquired=parseBrowseInstant(row.acquiredAt),expires=parseBrowseInstant(row.expiresAt);
  if(acquired===undefined||expires===undefined||expires-acquired!==300_000_000_000n)throw Error('Invalid source freshness');
  return Object.freeze({acquiredAt:row.acquiredAt,expiresAt:row.expiresAt});
}
export const sameSourceFreshness=(a:SourceFreshness|undefined,b:SourceFreshness|undefined)=>
  a?.acquiredAt===b?.acquiredAt&&a?.expiresAt===b?.expiresAt;
