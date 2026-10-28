import { createHash } from 'node:crypto';
import { decodeBrowseId } from './browse-values.js';

/** Existing exact-occurrence mapping, shared by browsing and recommendations. */
export function sourceEventId(browseId: string): string {
  const occurrence = decodeBrowseId(browseId);
  if (!occurrence) throw new Error('CONTROLLED_EVENT_ID_INVALID');
  return `${browseId.startsWith("pa_")?"pa":"tm"}_event_${createHash('sha256').update(occurrence,'utf8').digest('hex')}`;
}
