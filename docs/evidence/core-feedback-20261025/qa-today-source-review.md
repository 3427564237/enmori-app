# QA — automatic current-day source review

Date: 2026-10-25. Reviewed Context candidate:
`e89ebf3613f87a8c91e4a8c1e43425c81122275b`, parent
`087281e11ec5a681fd012b9d64431b225ed6f8ea`. Contract read:
Integration's `api/ai-today-context-contract.md`, committed in `72fc616`.

Independent source review found no blocking defect in this Context slice.
No Node/TypeScript build, test, Firestore, HTTP, emulator, model or service call
was performed by QA for this review. Context's reported 78/78 remains author
evidence. Root-owned HTTP validation/serialization and App UI are outside this
candidate and are not implicitly verified.

## Source checks

- `currentReplyDay` derives the date from the server clock and reuses the
  existing canonical-zone/civil-day parser. The client supplies only a zone.
  Invalid zones, offset/abbreviation forms and unavailable day/query capability
  fail rather than become a successful empty day.
- The Admin transaction query binds current owner, inclusive day start,
  exclusive next-day start, and captured server `asOf`. It orders created time
  and document ID descending, projects owner/time metadata only, and limits to
  six rows. The first five are selected; the sixth only determines `hasMore`.
- The adapter validates bounded query results, owner, canonical times, order,
  duplicate identities and range. Full selected records and version metadata
  are reread in the same transaction; missing/unavailable selected sources do
  not silently disappear from the selection. The sixth record's content is not
  read, and exclusions do not trigger another query or fill from the sixth.
- The simple-chat retained-message wrapper explicitly forwards the new query
  method. Its actual prepare composition receives that wrapper. The repository
  index file includes owner ASC / createdAt DESC / document ID DESC; this is
  local source evidence, not a claim about a deployed index or actual SDK query.
- Empty today is a valid zero-source selection. Source authority and consent
  remain required. Turning references off uses explicit `sources:[]`; it does
  not mean all inherited conversation history is absent.
- The date/zone metadata is copied into the preparation and accepted grant.
  A rollover during preparation fails; execute checks day validity before
  admission, and accepted source reads validate against their captured `asOf`.
  Existing operation consumption, token/owner binding, original expiry and
  saved-User retry identities remain.
- Automatic source cards alone gain owned Check-in IDs to match current-topic
  exclusions onto new keys. Manual card shape is unchanged. New model fields
  were not added: `SelectedReplyReader` still copies occurrence time, Note and
  stored Mood/Activity explicitly. IDs, versions, date, timezone, location and
  weather are not copied into the model projection.

Source anchors at the candidate:
`backend/src/ai-conversation/application/today-reply-selection.ts`;
`application/application-conversation-operations.ts:100–146, 155–179`;
`infrastructure/firestore-selected-reply-reader.ts:24–126`;
`infrastructure/retained-message-times.ts:50`;
`backend/src/shared/infrastructure/firebase/firestore-gateway.ts:108–117`.
Unchanged composition/model anchors:
`backend/src/bootstrap/isolated-conversation-composition.ts:65–104`;
`backend/src/ai-conversation/application/selected-reply-reader.ts:35–54`;
`firestore.indexes.json:9–25`.

## Required integrated counterexample

**A dispatched execute returning `AI_CONTEXT_SELECTION_CONFLICT` does not prove
no effect.** The new Application midnight gate precedes executor effects, but
the public error vocabulary contains no stage attestation, and the same generic
conflict can arise after the User message is saved. The client must read the
original operation and preserve its unresolved/saved-User state. It must not
automatically create another operation or infer a safe resend from this error.

At the exact integrated head, retain a focused case for that outcome alongside
fresh today/off selection, excluded-ID matching, changed/deleted source,
expired/midnight preparation, and same-topic draft preservation. HTTP tests must
exercise the real route/serializer and should use fake context/model boundaries;
these source findings do not require a new model call.

## App source follow-up

QA read all eight production changes and four test-file changes in App candidate
`abf75c507cb26d04b863fbafe51fdbd7cf7e4957`, based on the earlier Send repair
`6d0e3f6`. No new blocking defect was found in this source review.

- Today and off modes prepare fresh on every explicit Send. Today carries only
  the device IANA zone; the server supplies the day and bounded owned IDs. Missing
  zone/capability remains an explicit failure, with no manual/history/UTC fallback.
- Optional preview reads at most the returned five owned records. Exclusions
  retain owned IDs and map onto fresh selection keys; no sixth record is fetched
  to replace an excluded one. Topic off uses explicit zero sources. Successful
  sends preserve topic off/exclusions; a new topic clears them.
- Unknown/dispatched conflict still blocks another logical send and requires the
  original operation readback. Existing expiry, session/consent/background fences
  and saved-User retry remain in the same controller.
- The later-contact chooser filters current-topic visible saved User messages,
  rechecks session/topic/source after selection, and uses the existing typed
  follow-up action. Previewing/selecting a message does not dispatch chat; the
  composer remains owned by its existing controller.

QA also read the then-current Integration wiring at HEAD `15ad082`: the working
file enables today references under `ControlledDemoApp.companionFirstFlowEnabled`
and reuses `followUpTimePortProvider.currentIanaZone`. This is evidence for that
composition/flag path, not a claim that every app root enables the feature.
The format-adjusted avatar provider/editor still retain the session-bound pending
attempt documented in `qa-avatar-source-review.md`.

No new tests were executed at this checkpoint. The next independent run is
limited to the original three Send counterexamples and avatar route reentry,
after Root freezes its integrated head and releases the shared Flutter slot.

Root's analyzer subsequently caught the local `review` variable shadowing the
`review()` method in `previewToday`. QA read App correction `7fef973`: it only
renames that local and its uses to `preparedReview`. The earlier source review
was not a compile check; the correction adds no behavior or execution evidence.
