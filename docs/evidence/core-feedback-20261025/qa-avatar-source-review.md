# QA — owner avatar source review

Date: 2026-10-25. Scope: Integration's new avatar Dart domain/repository,
providers, editor/view/header and Android picker/MainActivity wiring, against
`api/own-avatar-contract.md` at `d8b88105b7cc7b176f08fa25eb5c6f90c7d5e141`.
The reviewed implementation was an uncommitted Integration draft, not a released
or immutable commit. Backend candidate `1709a59` is outside this review.

QA performed source review only. No Flutter/Android build, test, photo selection,
upload, service, provider or phone operation was executed. Root's consolidated
verification window remains the execution point.

## Findings and source corrections

**P2 — closing an unresolved save lost its attempt and preview.** The initial
editor stored unknown/revision/hash/draft only in widget State. After an unknown
PUT response, busy became false and Back/Close could dispose that State. A new
editor could read the unchanged revision and permit a new PUT although the old
request might still commit. This bypassed the unchanged-readback fence and lost
the failed-save preview. QA reported the concrete leave/reopen path to Root.

The correction moves the attempt and preview into a non-auto-disposed,
session-bound `avatarPendingSaveProvider`. The editor restores the original
revision/photo on entry; another begin is rejected while an attempt exists.
Unchanged or inconsistent GET retains unknown. Only an advanced revision with
matching desired source hash, or a definite invalid/precondition response,
clears the matching attempt by identity. A session change clears it. The close
copy now says the save remains available for checking. This addresses the
reported path in source without preventing the user from leaving the page.

**P2 — Activity destruction did not cancel original-image reading.** The initial
native dispose only fenced result delivery; its worker could keep reading and
decoding a slow content URI while retaining the Activity and original bytes.

The correction tracks a CancellationSignal and active stream, cancels/closes
them on dispose, interrupts the worker, and checks generation/interruption before
open, in the read loop, before/after decode and before delivery. Stream and bitmap
cleanup use finally paths. This addresses the reported missing cancellation in
source. An already executing platform decode is still bounded processing, not
evidence of instantaneous cancellation. Ordinary picker-induced backgrounding
does not call this destruction cancellation.

## Other inspected boundaries

- The explicit system picker/document fallback accepts only the selected URI;
  no broad media permission, persistent grant or original-file copy is added.
- Native input is capped at 10 MiB and 64 million source pixels, decoded to a
  maximum edge of 768, then cropped/re-encoded to 192-square RGB PNG with required
  chunks only and a 128 KiB bound. Preview is separate from Save.
- The strict client reader checks canonical base64, bounded PNG header/dimensions,
  exact response fields, safe revision and source-hash shape. Full PNG validation
  belongs to the separate Backend slice; this review does not certify it.
- Read/save completion checks session, foreground, generation and route. Picker
  return preserves the selected preview and rereads the saved base when needed
  after its normal background/resume cycle.
- Avatar pixels use a locally owned codec/image, dispose stale generations and
  avoid the global ImageCache. Parent state removes pixels on session/background
  changes. The header and editor state the current owner-only visibility.

## Reproducible source checkpoint

Captured at `2026-10-25T12:19:20Z` in Integration worktree with HEAD
`41c8e9f5560ba936f3887a45b40bb7fd1d966e4b`; the following are working-file SHA-256s,
not an assertion that the draft is contained in that commit:

| File | SHA-256 |
| --- | --- |
| `lib/features/account/own_avatar_providers.dart` | `fb1b3abbaeb55ad6d9ade4e010c0b3a0b2b510045d90e40627b2fc4a1a9805b7` |
| `lib/features/account/presentation/own_avatar_editor.dart` | `de15ee999d9547ea864c6739a0b298dcced2fe531bd06447b592694f80851357` |
| `lib/features/account/presentation/own_avatar_view.dart` | `e4915ba5a7782b54997f7b871460b5d7689efea1423d4c6e5deab7072e67091d` |
| `android/app/src/main/kotlin/com/enmori/app/AvatarPhotoPicker.kt` | `6b141986ba936f925f57a7a384b6da0a9a9cd7ba08756c796052a342c2416a0b` |
| `test/features/own_avatar_test.dart` | `3cb42163e60e1c049ace63c8f7ab87354a18cf3070eb4cb08b5c5aa61cf9aa40` |

The added unknown-save route reentry test was read: it leaves/reopens within the
same ProviderScope, keeps writes at one after unchanged GET, and checks that
Save/Choose remain disabled. QA has not executed it. Both findings are
source-addressed; integrated widget, native runtime and physical-device results
remain separate evidence layers.
