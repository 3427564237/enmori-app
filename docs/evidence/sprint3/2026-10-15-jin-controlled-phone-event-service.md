# JIN — controlled phone service Event construction handoff

Date: 15 October 2026, Asia/Singapore. Draft construction/fixture delivery; SHI reviews the new composition and LI independently disposes JIN evidence. No runtime activation is performed by this packet.

## Authority and exact inputs

- [LI's bounded #84 construction assignment](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6188049349): optional process-owned Event source/enable-disable injection into the ongoing controlled service, existing protected reads/current Auth/onboarding/no-store, default disabled; no new API, key, storage or dependency choice.
- Accepted service #117 `f6036d4efbc4f3d7a33378cd7184b01d4eda31bb` and accepted Event Bootstrap/API #113 `e34f4a2bc40ddc9a4805ac90e31e1ab0215b4691` are actual parents of merge `83da4a69e74104d4f9952fee213d518aa64dd070`, tree `d8814da15d62a320dec19c65541186f5cdd36bee`. No conflict resolution or manual product edit was required for that merge.
- SHI #110 `0b730c52fd62ddfc02bdc7166ab1a80374eb2681` supplies the byte-identical corrected `TicketmasterBrowseSource` and its 13-case test file. Existing Application/Domain/Port projections remain unchanged; the nonempty-source/false-empty correction is retained.
- Tested product `3c8202dff914d897ba4b2ce1dd8095711eeb07c9`, tree `8e0e8130b9a228b5a9ae66c31abd2887a8e7a538`; source/log fingerprints are in the [JSON receipt](2026-10-15-jin-controlled-phone-event-service.json). Later publication adds evidence only. Earlier rejected source/checkpoints remain identified there.
- LI #123 disclosure/client work, actual provider/device evidence and live preview are separate inputs, not part of this Backend source. #121's received manual model-idle procedure remains applicable; its test/document-only branch is not merged here.

## Delivered behavior

The same controlled-phone factory now registers the two already-approved protected Event reads. A missing source or disabled source yields the existing sanitized `503 SERVICE_UNAVAILABLE` after actual current Auth/onboarding; invalid locators retain the approved protected `404` behavior. Ordinary/default composition remains unchanged. All Event responses retain `Cache-Control: no-store`; no cache, provider database, importer, participation, pagination or recommendation change is introduced.

`createControlledPhoneService` accepts optional `eventBrowse: { source, now? }` using the existing `IsolatedEventBrowseInput`. It returns a private in-process `eventBrowseControl` capability with `enable`, `disable` and non-content `observation`. This capability is not a public route, request field or client feature flag. A configured source starts disabled. Enable requires a source and a running service; stop synchronously disables it before awaiting drain. A failed source does not stop Account, Persona or AI.

Disabling aborts all admitted Event reads and invalidates their result generation. Re-enabling cannot release an older pending result. An uncooperative original source remains included in the existing service I/O count until it actually settles; abort does not prove cleanup. Stop holds the original service rather than closing the fixture under that pending request. No replacement service/model lane, reset, forced cleanup or public contract is added.

This invalidation covers results still inside the guarded source call. It cannot retract bytes already delivered, a response already released to Transport, or a prior client copy. LI's client memory clear/disclosure/removal exercise remains necessary; no global instantaneous erasure claim is made.

## Private runnable handoff to LI

Use the existing Linux-only operator and its locked, exclusively owned empty Emulator startup. The source has no hot-reload path into the current live preview. Do not replace/reset that preview or disturb its pending originals as part of consuming this source. LI owns any separately accepted next service startup, private configuration, host and device operation.

1. Strictly build this product with the existing pinned Node/TypeScript dependencies. Retain the current operator's private TLS/model/tokenizer/phone configuration and `node tool/controlled_phone_service.mjs --live-existing-host` stdin mechanism. No new endpoint, deployment or key setup is required.
2. The existing five-field configuration still works without Event. Optionally add the private top-level field `eventBrowse: { key: <existing authorized private provider key> }`. It accepts only that field; an enable flag is rejected. The key is used only inside the operator/source and never enters `handoff.json`, status, APK, URLs returned to the client or this repository. Supplying it constructs a source but does not activate it or call the provider.
3. Wait for the usual original-service handoff/status. `status.json.eventBrowse` reports only `configured`, `enabled`, and `pending`; initially `enabled` is false. Running HTTP and startup model preflight do not establish permanent model residency. Preserve the received #121 manual cold-idle procedure and fail-closed adapter.
4. Only after LI's applicable use/link, disclosure/removal readiness and controlled-integration gates permit an actual source action, atomically place a private mode-0600 `event-command.json` in the existing mode-0700 owned `phone.sessionDirectory`. Its exact body is `{"enabled":true}` or `{"enabled":false}`; no other keys. Write a complete temporary file, then rename it into place. Keep a single operator writer; do not overwrite an unconsumed command. No phone request can issue this command.
5. The existing operator tick consumes the command before acting. File creation alone is not acknowledgment: observe its removal and a subsequent status write with the requested state and `eventControlFailed:false`. A malformed/unreadable/unremovable command fails Event closed and reports `eventControlFailed:true`; the same AI service continues. Correct the private file problem before issuing a new command. No provider request occurs merely because enable was acknowledged; the existing protected browse request is still required.
6. Disable is observed on the next existing operator tick (normally 500 ms; not a scheduling guarantee). After acknowledged disable, pending source results are invalidated and new source calls denied. LI must clear the client's prior Activity memory/disclosure state separately and verify unavailable reads. A stop request takes precedence over Event enable; queued Event commands are not executed after stop.
7. Existing explicit `stop` and all three original cleanup receipts remain controlling. Source pending count must settle; no provider wait is bypassed. LI retains its existing private-file disposal responsibility, including any unconsumed Event command and private configuration. Key custody is not a product-record deletion claim.

The public client contract is unchanged: `GET /v1/event-browse` and `GET /v1/event-browse/{browseId}`, using the existing native Auth and same service base URI. No extra public handoff DTO or provider credential is needed by LI's approved pages.

## Actual verification

See the JSON receipt for exact commands, result counts, source identities, retained failure and local log SHA-256. All tests here use synthetic fixtures. The actual SDK checks use guarded Auth/Firestore and real local HTTP; provider, compiler and generation are explicit doubles. New source results are not copied from #117/#119/#123.

- Strict locked compile and full Backend regression **912/912 Pass**, including normative API/inventory agreement, source projection and new process-gate unit cases.
- Operator seam tests **15/15 Pass**, including default-disabled private construction, explicit control, malformed/private-I/O control failures, stop precedence, and all prior report/removal-failure hold regressions.
- Full actual guarded Auth/Firestore/HTTP/Dart suite **164/164 Pass, outer exit 0**, including ongoing-service Event authority ordering, read-only source behavior, disabled/unavailable responses, old-result invalidation, uncooperative source drain/hold, Account/Persona coexistence and absent-source startup. Both private profiles were removed and all five required ports freed. The three new service Event cases and six inherited Event composition cases are included in 164, not additive.
- Source bindings: accepted producer copies, actual two-parent merge, unchanged API bytes from #113, dependency/environment manifests, all tracked working inputs and new-delta whitespace.

Retained failure: the first actual SDK run at `4b386b1726eb156cd4f4127ea7eaa60fd180af47` was **163/164, exit 1**. The new test removed the completed timestamp from an already-bound Account and incorrectly expected onboarding-required 409. The unchanged repository correctly treats that corrupt bound record as unavailable 503. The correction retains that 503 case and separately removes/restores the owned binding to prove actual onboarding-required 409; source calls remain excluded in both. No product error/auth rule was relaxed. Both original profiles/required ports cleaned despite the failed assertion.

The first local identity helper also rejected CRLF working files by incorrectly requiring raw-byte equality with LF Git blobs. Its corrected check distinguishes exact and CRLF-equivalent UTF-8 inputs: all **1,144** tracked inputs bind (**66 exact, 1,078 CRLF-equivalent**), including all eight increment paths. API Git bytes equal #113 (**35 operations / 45 schemas**). This is a tooling correction, not a claimed initial check Pass. Binary inputs require exact bytes; keys/raw logs remain local.

Publication preflight initially read root worktree status through the still-empty temporary index and refused publication. The corrected preflight reads the original index for that check, then uses the separate index for the two-file evidence commit. No tracked root edit or upload preceded that refusal; it is not a product-suite failure.

The original published source suite has no new Flutter/APK/Android/provider/live-model execution in this packet. The Linux operator's actual private-file/HTTPS/provider/device exercise on LI's host is also Not Run here; portable operator tests use explicit seams. Previous actual phone/model results retain their original attribution.

## Remaining handoff and limits

SHI's independent new-source review and LI's evidence disposition are required. LI then owns any authorized private activation, actual first-batch/Detail/native-browser phone test and stop-source/client-clear exercise; DU reviews LI's new shared UI source. This source delivery does not represent those actions as complete. The original service owner/data/stop boundaries and model idle-unload limitation remain.

Keep Draft/Open. No main merge, Issue closure, Project promotion, ordinary/cloud/provider/model enablement, new deadline, whole-module/42-route/38-state/Sprint/UAT/Release/Done claim.
