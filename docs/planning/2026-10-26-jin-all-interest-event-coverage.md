# JIN: cover all existing interests in real Event discovery/recommendations

26 October 2026, Asia/Singapore. Explicit LI assignment in the current chat:
"多加一些组别，至少要覆盖到我们所有已有的兴趣标签，交给jin即可".

Continue the existing JIN Backend/recommendation work from the latest published
`souma/ai-companion-integration-20261025` branch; record its exact full SHA.
Retain the 25 October recommendation-completion direction and current reviewer
chain. Do not restart from old main or redo already-delivered v29/v30 features.

## Actual gaps inspected

- `createControlledEventRecommendations` obtains only `source.firstBatch` and
  currently scores only the explicitly bound Music tag. Changing most selected
  interests consequently does not introduce a corresponding candidate group.
- The current Ticketmaster SG read reported 85 raw upcoming source occurrences;
  the first 20 contained multiple real genres but only three segment labels.
  This is a dated source observation, not a permanent catalogue size.
- Existing category labels are display metadata; assigning the same arbitrary
  label to an event does not establish an interest match.
- List/detail API samples had no `info`, `description` or `pleaseNote` content,
  and most supplied URLs led directly to ticket/seat selection. Source expansion
  must state the real information and link coverage it can actually provide.

## Required complete package

Account for every current active interest: **Books, Travel, Films, Fitness,
Dance, Food, Photography, Technology, Outdoors, Volunteering, Art, Gaming,
Community, Music**. Supply a compact per-tag matrix of actual source/classifier,
explicit matching rule, availability, real empty/error behavior and evidence.
Do not deliver only Art/Dance or defer the remaining named tags generically.

Deliver usable classification/filter data and recommendation matching for the
approved source set, across the available candidate scope rather than silently
reusing one fixed first batch. Respect deterministic Backend ranking, actual
selection changes, stable identities/ties, real recommendation reasons,
authorization, revocation and unknown-result behavior. Retain the 25 October
scope for choosing and explaining reasonable initial weights; do not claim
unsupported signals have been used. Never map unrelated activities to an
interest merely to populate every group.

If an interest needs a different provider, licence, credential, physical schema,
dependency or deployment boundary, give the exact minimal candidate, data/use
contract and real access gap under AGENTS.md. Investigate all interests and
continue the portions already authorized; do not invent a new provider or
hide a limitation behind fake results. Real LI-host credentials/runtime/model,
signed APK, installation and final integration stay with LI.

Integration is independently fixing the single AI reference panel, visible
Event foreground/route-return reads, and explicit search across existing paged
available events. Preserve its shared Home/router/API ownership. Coordinate any
necessary minimal API/UI classification extension in one packet instead of
concurrently replacing those shared files.

Return one complete Draft PR based on the integration branch: exact source/head,
per-tag coverage matrix, changed contracts, relevant checks/results, limits and
one LI real-verification journey. ZHOU remains the independent reviewer of JIN's
package under the latest team prompt. This handoff does not assert that JIN has
started or agreed to an ETA and does not close an Issue or accept UAT/Release.
