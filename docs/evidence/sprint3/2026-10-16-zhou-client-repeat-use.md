# ZHOU client repeat-use regression packet

16 October 2026 SGT, workspace `D:\3851`. This is the independent AI/Persona client packet requested by the [confirmed module kickoff](../../decisions/2026-10-16-li-low-blocking-kickoff.md). It joins actual controllers, pages, strict wire repositories and HTTP transport to handwritten Auth/HTTP fixtures. No product defect was reproduced, so no production correction is invented.

## Source and behavior

Reviewed production base: #130 `9cf30134a522009f410485c6352df757ed0ab23d`. The branch starts from PM kickoff `dd1994af69d861253356571d59317c549c879914` and synchronizes already-approved main#131 `d59cb128bfe0b5889baae0b08c973e140505590f` at `25a5567a28540855f555edb67416dedbf9629b85`. That inherited32-path tooling update is not new product work or requested component reapproval.

**Source-only integration unit: `449f67459a02a8621f1212f82251da62bf1cc2b6`**, tree `52802f2761aa15e14266e6ef2b5f7de204673c8c`: two new test files only. All `lib`, Backend/API, Android/iOS, integration targets, runtime/operator scripts under `tool/`, dependency and lock inputs remain identical to reviewed#130. The inherited `.agents` and tooling-record changes are the explicitly excluded approved main#131 synchronization above. Later evidence commits do not change the tested client or tests.

| New joined regression | Observable assertion |
| --- | --- |
| Send → Reload → next Send, different text | One conversation, two regular sends, distinct operation/key and four unique ordered message DTOs. Reload is a GET, not generation. |
| Same fixed text twice | Two explicit actions still use `kind:send`, new operation/key/U+A IDs and sequences1–4, not Retry or a replay. Text and microsecond timestamps survive strict parsing. |
| Lost second execute acknowledgment | Existing first pair stays; history may show the second pair but cannot release unknown. A valid-shaped result for operationA cannot settle operationB. Only explicit current-B outcome restores sending. |
| Same UID, new observed session | Late B body cannot alter the replacement session. Acquired B is cancelled using its original token/key, not the replacement identity. |
| Cancel → actual leave → two returns | Return performs ordinary history only, with no automatic prepare/execute/outcome query. Pre-cancel canonical A may be visible while unknown remains; delayed original HTTP cannot release it. Explicit outcome precedes the fresh B action. |
| Persona detour and session replacement | Old AI and private Persona draft cannot cross observations. Repeated Persona entry preserves Keep editing/Discard; only a new explicit action sends B in the fresh session. |

The HTTP fixtures represent synthetic canonical DTO responses, not actual Firestore saves or a semantic/model implementation. Original operation identity, session fences, no blind retry, late-result barriers and existing timeouts remain product behavior. No new endpoint, field, key, automatic recovery or UI redesign is selected.

## Independent verification and retained failures

Pinned Flutter3.47.2/Dart3.13.2 with existing dependencies: **250/250 affected AI/Persona and network-harness tests Pass**, exit0. The six new cases are included, not added again. Scoped fatal-info analysis has no issues; non-writing format reports2files/0changed; delta whitespace Pass. Before/after working-vs-Git checks bind507 selected tracked inputs with normalized aggregate `735ae5e939ddc9f3c1ede9426f6f4996cee19bdc9d790bf3a4a725160d6b7caf`. Exact commands, source blobs and all local log hashes are in the [machine receipt](2026-10-16-zhou-client-repeat-use.json); raw logs remain local.

Early failures are retained rather than labelled product defects. Wire expectations inside an asynchronous HTTP callback conflicted with Flutter's guarded tester action; moving the same transport assertions to the owning test zone resolves that fixture issue. Widget helper failures came from lazy controls/rows not yet being built; actual scrolling/layout retained the original actions and assertions. One braces info was corrected in a new fake.

Independent fixture review also found a passing but inconsistent cancellation schedule: canonical persistence had been tied to delayed HTTP delivery after a terminal Cancel ACK. The final fixture separates them, commits A before that ACK, returns it through ordinary history while keeping unknown blocked, and delays only the original HTTP reply. The earlier two-case pass is preserved as pre-review evidence, not the final gate. The final identical-input variant and root250 pass cover the corrected files. No passing check is produced by weakening client outcomes or production rules.

The whole-application gate was not run for this client-only packet. The unrelated current-source Windows symlink-fixture limitation recorded in SHI#132 is not silently skipped or turned into a green full run here. JIN retains the applicable changed-source/unified-candidate gate.

## Minimal JIN comparison and Android handoff

No client product counterexample was obtained. The closest repeat-use comparison is the identical fixed routine `I read a book today.` twice, separated by explicit Reload: expected protocol is prepareA/executeA/GET history/prepareB/executeB, one conversation, two fresh send tickets and four ordered rows. The wire fixture proves those client requests and mapping, not that a real model will accept either generation. LI's older real second-round rejection has no retained raw candidate and remains unresolved; this pass does not assign that failure to a client or model cause. JIN owns shared source/persistence/lifecycle diagnosis on the identified actual candidate.

SHI owns Android cross-verification under the latest two-device allocation. Use a JIN-identified candidate/current authorized handoff, record actual source/APK/installed hash and confirm the relevant AI/Persona consumer blobs. Do not build an APK solely for these test additions, restore the expired demonstration fixture, invent credentials or assume a second Backend. Serialize conflicting stateful actions with the other device.

1. On the available owned test conversation, explicitly Send the fixed routine, Reload ordinary history, then explicitly Send it again. Record operation/reference/count metadata privately and check one target, two logical sends/four rows with no extra resend. JIN supplies any authoritative store/source readback through its existing authorized procedure.
2. During a natural waiting request, choose Request cancel and leave; return twice. Record the actual outcome, not a presumed no-effect. Return/history must not silently resend or settle unknown; use explicit Check result before any permitted new generation or saved-U Retry. Deterministic late-response injection is covered only by the client fixtures, not manufactured by altering a live runtime.
3. Exercise Persona entry/back/draft decisions and a same-subject replacement observation. Old private drafts/results must not reappear; fresh actions remain explicit. Keep loading/unknown/error states, keyboard/safe-area and large-text controls usable.
4. Record failures/Not Run exactly and send a minimal client mismatch to ZHOU or coupled persistence/source/lifecycle mismatch to JIN. A phone UI impression is not independent canonical/store proof; Android is not an applicable iOS gate.

The current disposable service/private handoff is expired and demonstration preparation is paused. Actual real-9B consecutive success, actual Backend/storage effects and new phone execution are **Not Run by this packet**. LI reviews this new contribution; SHI receives the concise device procedure when a usable candidate arrives. No main merge, Issue closure, Project/runtime promotion or full application/S3/UAT/Release/Done claim follows.
