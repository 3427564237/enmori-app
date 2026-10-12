# LI #85 — shared isolated History/Conversation entry

12 October 2026, Asia/Singapore. Owner LI; independent reviewer DU; refreshed
combined-gate executor JIN. Implementation is authorized by [the human LI
parallel-delivery reissue](https://github.com/3427564237/enmori-app/blob/f8c67722581f85846ca06d850cb1dfe92586ed46/docs/decisions/2026-10-12-li-parallel-delivery-reissue.md)
and [Issue #85](https://github.com/3427564237/enmori-app/issues/85).

## Exact source and scope

Executable commit `a972e1b2870b8565cf408069f8485e62b4844a4d`, tree
`859d0a206ce0c1abcf033b3bd492ed02ff0c72bb`, based on #86 evidence head
`bae777d1de637cbbe6c4e312bdb9c50a54ff90d4`. Four changed Dart files only;
subsequent evidence commits change no executable content. No Backend/API,
schema, dependency, index, runtime configuration or provider permission change.

This contribution implements independently optional concrete page builders,
Home controls and authenticated routing on the accepted isolated baseline.
No feature is enabled by default. Actual DU/ZHOU page bindings are not yet
received at this checkpoint; their destinations remain absent. Test surfaces
are only test code, not product pages, delivered history UI or Conversation.

## Concrete owner handoff

Import `lib/app/router/isolated_history_ai_pages.dart` from an explicit isolated
harness. The existing isolated flag must be true and the real controlled
feature/dependencies must be supplied; a missing page leaves its own entry and
route absent without holding the other feature.

| Feature | Provider override | Builder callback contract | Flutter route |
| --- | --- | --- | --- |
| DU History | `isolatedHistoryPageProvider` → `IsolatedHistoryPage` | `build(BuildContext, {required VoidCallback onBack, required ValueChanged<String> onOpenSavedCheckIn})` | `/check-ins/history` |
| ZHOU Conversation | `isolatedAiConversationPageProvider` → `IsolatedAiConversationPage` | `build(BuildContext, {required VoidCallback onBack, required VoidCallback onOpenSettings})` | `/ai-assistant` |

Both provider defaults are null. Back pops a valid stack or returns to existing
Home. History hands the decoded ID to existing `AppRoutes.savedCheckIn(id)`;
Settings uses the existing route. These are Flutter paths, not HTTP endpoints.
Owners can deliver their real page/controller/client and own harness now,
without editing shared Home/router or waiting for a new signature confirmation.
A handwritten AI test transport belongs only in an explicitly synthetic harness.

Navigation checks the mounted context/provider, current authenticated gate,
isolated flag, current UID, identity of the observed authenticated session and
foreground source route before acting. An observed fresh session, including
same UID, replaces the owned route stack. Logout, old/disposed/covered callbacks
and removed readiness cannot navigate. Session observation is added only when a
shared feature is supplied; existing compositions retain their dependency path.

The feature owns its reads, cancellation, exit/discard protocol, authorization
and late-reply handling. Router callbacks confer no source authority and do not
implement unresolved real submission, N02/F01/F03, permanent-unknown recovery
or source cleanup. No fake success or mock destination is supplied by product
composition.

## LI actual verification

Pinned Flutter 3.47.2 / Dart 3.13.2; offline pub get completed without lockfile
changes. All checks below ran on the final four-file executable payload.

| Check | Result |
| --- | --- |
| Full Flutter unit/widget suite | Pass, 336/336, exit 0; includes 23 new routing tests |
| Fatal-info analysis, lib/test/integration_test | Pass, no issues, exit 0 |
| Non-writing format of four changed Dart files | Pass, zero changes, exit 0 |
| New source/staged diff whitespace | Pass |
| Actual Android/new feature flow | Not Run; real owner builders not received |
| DU independent review | Requested in the Draft PR; Pending at publication |
| JIN refreshed combined gate | Not Run for this changed executable |

New tests cover independent readiness, ordinary/default exclusion, all seven
non-authenticated gate states, existing saved read with one-time ID encoding,
Settings/Back, same/new UID replacement, observed logout, stale/covered/disposed
callbacks, removed readiness and 320×640 Home with 2× text, semantics and minimum
48px control height. Enlarged widget assertions are not human TalkBack or device
accessibility acceptance. Existing Persona/Event/Account regressions pass in
336; they are not added to historical component totals.

Commands: `flutter test --no-pub --reporter expanded`,
`dart analyze --fatal-infos lib test integration_test`,
`dart format --output=none --set-exit-if-changed` on the four files,
`git diff --cached --check`. No test retry suppression or compiler relaxation.

Preliminary failures are retained in local logs: first focused run 19 passed /
2 failed because the test gate entered Home before auth observation; diagnostic
read counts were already 2 before navigation. The fixture now resolves auth
before entering Home, preserving the meaningful one-read Back assertion.
First full run 316 passed / 18 failed because unconditional new session
observation activated the unavailable auth stream in existing independent
router fixtures and left Riverpod retry timers. The final source scopes this
observation to supplied shared pages; focused existing/new routing 42/42 passed
before adding the two explicit logout cases, and final full suite 336/336 passed.
No accepted tests were disabled or rewritten to conceal that regression.

Final LI local log SHA-256, under ignored `build/li86-review/`:

| Log | SHA-256 |
| --- | --- |
| flutter-shared-final.log | `16fe5e5cf2f35daa94036e072e4e4ad4ff862030a11a7dc69641ae9ff0a5b60a` |
| shared-analyze-final.log | `e8dc9876c280f5e5856ad02bdfff74e10fe944a331b6e4f3ea1f4297666ad735` |
| shared-format-final.log | `2ccd718946510ed38922cb26bb8228cb8dafcdca1f087a96261014eea7cc9a01` |

The temporary Node dependency symlink used for the separate clean #86 Backend
review was removed; its cache target was not changed. No credentials, private
logs or APKs are published. The inherited #86 full-base EOF whitespace exception
remains inherited, not a blanket full-diff Pass.

## Remaining delivery

DU reviews this new shared code; DU/ZHOU deliver real controlled builders and
page-specific evidence; LI binds coherent received pages; JIN executes applicable
changed-source gates. These are localized remaining tasks. This packet completes
the concrete shared-code handoff and local verification, not every checkbox of
#85, accepted real feature reachability, #82/#83 completion, merge, Sprint, UAT
or Release. Keep Draft/Open; no automatic closing keyword or board transition.
