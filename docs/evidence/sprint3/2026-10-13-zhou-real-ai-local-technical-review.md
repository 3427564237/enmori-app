# ZHOU remaining AI packet — independent local technical review

Date: 13 October 2026, SGT. Review mode: read-only local agent review, followed
by author fixes. **This is not JIN's formal GitHub review or LI acceptance.**
Reviewers: `github_scope_audit` (authority, code and complete packet),
`mobile_contract_audit` (old/new protocol coverage). Root also performed author
self-review; `context_authority_audit` authored the concentrated packet.

The controlling source is the four-choice F01 decision at
`20ff6cfc01ec0caaa7f811ec3d9d4eec547f2072`, not the superseded old F01 hold.
The old #90 proposal at `99583d6bd601ba51c577d46901b3e07e389e6fd8` remains the
candidate-detail/supersession source. #92's observations and independent owner,
JIN and LI schedules keep their original attribution and limits.

| Finding | Disposition and validation |
| --- | --- |
| Self-review: failed Auth observation could be followed by a successful regrant on the same old request. | Fixed: known false, malformed authority, exceptions and original-guard loss synchronously latch terminal; no later fresh check reopens it. Three new adversarial tests cover regrant, malformed/throwing guards and another pending check's late success. Independent reviewer read the final delta and ran 30/30 tests. |
| Packet said cleanup “starts” at original expiry+24h, although that is the completion deadline. | Changed to “最迟在原 expiry+24h 完成”; all late-copy/cleanup clauses preserve the same original deadline, with overdue I/O reported as failure. |
| NC11 was only implicit through retained old text. | Explicitly retained any Cancel's synchronous dispatch shutdown and late token/prepare cleanup/invalidation without execute, plus the validation row. No new client rule or code delta. |
| NC12 was only implicit through retained old text. | Explicitly retained messageId merge, sequence ordering, original U ID/sequence/persistedAt stability, no second U and no late available revival of tombstone. Accepted R1/R2 stay accepted. |
| Expiry-deletion row could be read as only marking parent deleting. | Explicitly reuses complete whole-delete fences, pending initialization/content I/O settlement, all messages/sources/effects/controls/children and parent-last deletion, with original expiry+24h and no user 204. |

Final independent local review found **no remaining mandatory fix** in the
selected-policy code or concentrated packet. It checked the four remaining
groups, same-U A→B→C protection, initial-guard ABA, absent-parent/restart limits,
closed/unresolved semantics, canonical empty-versus-missing sources, offline
revoke→regrant generation, non-destructive treatment of corrupt generations,
checkpoint absent→create ABA and independent retention clocks.

Code review confirms both helpers are SDK-/I/O-/content-free and unwired; the
strict synchronous fake-Port is unchanged. The expiry helper requires trusted
full-precision now/creation and valid lineage. The adapter must fail closed when
a millisecond-only clock cannot distinguish the cutoff boundary; it must not
round to gain access time. The write control's matching barrier identity and
same-U CAS remain caller/N02 obligations. Closed observation alone is not
effect/readback proof; acknowledged SDK completion alone is not content validity.

The final owner Backend run is 542/542 PASS, including the 30 new tests;
independent local reviewer ran only the two new suites (30/30). Earlier 27/27
and 539/539 were pre-fix intermediate snapshots, not the final reviewed code.
Document/source verification and normalized hashes are recorded in the
[source manifest](2026-10-13-zhou-real-ai-local-source-manifest.json), with
[verification evidence](2026-10-13-zhou-real-ai-local-contract-and-policy-evidence.md).

No reviewer started an Emulator/service or wrote externally. No new formal
review, schema/purpose selection, implementation release or runtime approval is
claimed. The concentrated pending choices and real-adapter Not Run items remain
visible for the later actual JIN/LI handoff.
