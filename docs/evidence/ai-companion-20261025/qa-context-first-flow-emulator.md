# QA — atomic F0 persistence on the isolated Emulator

25 October 2026. Independent source and actual Auth/Firestore Emulator review of
Context `14f73900913f7e03f510f99c2b6a6226d2eb1f57`. QA froze that commit with
`git archive` and compiled it privately with the pinned Node 24.19.0 / TypeScript
7.0.2 toolchain, exit 0. The author's later uncommitted F1a work was excluded.
No production implementation was changed by QA.

Integration explicitly assigned exclusive use of project
`demo-enmori-companion-20261025`, Auth `127.0.0.1:19099` and Firestore
`127.0.0.1:18180`, with its isolated credential profile. QA used the actual
`FirebaseAdminFirestoreGateway`, `withRetainedMessageTimes`,
`FirestoreConversationStore.firstFlowTransaction`, `FirestoreFirstFlowStore`
and `FirebaseIdentityVerifier`. All account/message content was synthetic.
Only named QA-created owners were mutated and cleaned. Model and FCM calls: 0.

## Independent execution

**10/10 selected Emulator groups passed**, in an initial eight-group run and a
two-group supplement. No earlier case was rerun to increase this count.

| Group | Actual observed result |
| --- | --- |
| Canonical publish and ordinary read | Message `retainedCreatedAt`, occurrence `publishedAt` and state `lastAttemptedAt` were the same actual Firestore `Timestamp`. Message, receipt, occurrence, state and parent shared `updateTime`. Raw state retained an empty rolling array plus scalar timestamp; the public publication time came from readback. Genuine assistant/proactive sequence 3 had no fake user/reply-to field. |
| Publish ACK loss | The wrapper suppressed acknowledgement only after the actual commit. Publish returned unknown; original intent read back the one message. A new message ID with the stale reservation was rejected and absent. Each transaction callback ran at most once. |
| Reconstructed-store recovery | A new Store instance changed reserved work to failed. Separately, published/dispatching became unknown; no subsequent claim succeeded and the original budget timestamp remained unchanged. This is Store reconstruction, not process/Emulator reboot. |
| Source deletion / purpose epoch change | Actual source deletion or revoke/regrant generation change between reserve and publish rejected publication. Parent, state and occurrence update times were unchanged; neither new message nor receipt existed. |
| Concurrent settings CAS | Two actual concurrent revision-zero replacements produced one success and one revision conflict, with committed revision 1 and no callback retry. |
| Retention and sequence | Published P3 retained the old cutoff. A synthetic seeded subsequent U4/A5 pair advanced it under ordinary retention rules; reads returned U1/A2/P3/U4/A5. The ordinary pair was a fixture seed, not a newly exercised chat-append application flow. |
| Revoked accepted-message source | After purpose generation changed, ordinary P3 reads hid text and cards, and the old card failed resolution. |
| Actual revoked identity | Disabling the synthetic user in Auth caused fresh verification to deny reserve before any Firestore transaction. |
| Dispatch-claim ACK loss | The actual claim committed to dispatching, but the returned value was only unknown, with no send capability. Store reconstruction recovered unknown and rejected reclaim. No sender was called. |
| Late physical commit | QA delayed the actual transaction after callback admission until its commit was **155 ms beyond the old topic cutoff**. The physical message and occurrence existed, but publish readback returned unknown, the expired topic remained unreadable and dispatch claim was refused. The late copy did not renew retention. |

The first group also checked the owner-only source resolver and message anchor,
rejected an unrelated principal, and confirmed that marking sequence 3 read did
not update the conversation parent. Source cards exposed a minimized locator;
the persisted receipt contained no synthetic source quotation or Persona copy.

Per-fixture clocks were controlled to exercise due/expiry boundaries. Commit
timestamps and Firestore transaction semantics were real Emulator observations.
Initial U/A metadata and the later ordinary pair were explicitly synthetic
seeds. This is not real-account, production scheduling or wall-clock delivery
proof. No Firestore rules acceptance follows from Admin access/default rules.

## Additional bounded source/fake checks

QA read the Store, same-transaction conversation bridge, source-use-v2 resolver,
timestamp wrapper and all three retention projections (read, maintenance and
cleanup). Reads precede staged writes; each effect requests `maxAttempts:1`.
Fresh asynchronous identity is awaited before effects, with current-actor
checks around reads, exact purpose-generation/source identity checks and no
model/send operation inside transaction callbacks.

The wrapper writes server timestamps for both publication and its bounded
charge, preserves those original timestamps on later updates, and rejects
missing/caller-shaped commit evidence. Independent execution of only
`retained-message-times.test.js` passed **4/4 fake tests**, with global fetch
blocked. Its `.123456789` → `.124` example establishes the conservative upward
millisecond projection in the simulated nanosecond case. These four tests are
separate from the ten actual Emulator groups and the author's 461-test suite.

No blocking defect was found in this reviewed slice. Complete worker/HTTP/model/
sender composition, real process restart/export/import, maintenance/cleanup
execution, F1a, notification routing and Android/device behavior retain their
own gates. The existing local-model semantic failures are unchanged.

## Evidence and cleanup

Private directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/context-14f7390/`.
It retains frozen sources, both exact script revisions, raw logs, commands and
results. The first script's hash still matches its execution record; the later
script selects only the two supplementary cases.

| Record | SHA-256 |
| --- | --- |
| Initial actual Emulator result | `a9a5d2fcb0b11819bfdea5f33e195b3b05993a4db32d72a83f06b4538e7fa0cd` |
| Supplementary actual Emulator result | `2197ee6aedaedf3d5b9677b84a4eb97d13ffdb074ca11bdc40e9915eb361dcfd` |
| Four timestamp fake-test log | `09425fa06a55dc76b34edcad72abb0b965c59cd37bf6f3ab427197588fec7bef` |
| Evidence manifest | `0d14b654db1893078dba29bf079105f0667543512feb9b1cd5606b89bc266d45` |

Both executions exited 0. All 9 + 2 QA-created owner trees, auth bindings and
Auth users were cleaned successfully. QA returned the exclusive slot to
Integration, disabled its local execution-authority record and left the
Integration-owned Emulator services running.
