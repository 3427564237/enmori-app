# LI release — isolated real-AI capability verification only

- Source ID: S-PM-1012-LI-AI-CAPABILITY-VERIFICATION-ONLY.
- Operator: LI/PM agent executing the user's delegated instruction to complete
  LI/PM work and reissue practical, locally bounded tasks today. This is a
  technical verification assignment, not a new human selection of rule changes.
- Exact proposal: [#90 head 99583d6bd601ba51c577d46901b3e07e389e6fd8](https://github.com/3427564237/enmori-app/blob/99583d6bd601ba51c577d46901b3e07e389e6fd8/docs/planning/2026-10-12-zhou-real-ai-slice-closure-proposal.md),
  only row **A: locked-stack capability verification** and the probes below.
- Independent proposal review: [JIN APPROVE 5491753860](https://github.com/3427564237/enmori-app/pull/90#pullrequestreview-5491753860),
  document/technical review only; not code or amended-rule approval.
- Preserved authority: [human conditional A](2026-10-12-li-isolated-note-conversation-conditional-a.md)
  and [parallel reissue](2026-10-12-li-parallel-delivery-reissue.md).

## Released work and exact limits

ZHOU may implement and execute a small, isolated **verification test/tool**
against the existing locked SDK and the existing guarded synthetic Auth/
Firestore Emulator environment. Reuse approved dependencies, demo project,
environment guard, private ephemeral fixture/cleanup pattern and fake model
boundary. No new service, cloud/private access, credentials, index deployment,
dependency/version or persistent product schema is selected.

The only released experiments are:

1. Fixed readTime capability across multiple synthetic documents and a query:
   mutate fixtures between reads and record whether a single historical view
   is actually supported, rejected or insufficient on this SDK/Emulator.
2. Immutable message-document createTime/readTime precision and identity:
   compare observable metadata across creation/update; do not equate requested
   server time with physical commit, or claim controllable 1ns server commits.
3. Real synthetic transaction commit/ACK versus a local cancellation marker and
   a separate durable barrier: record any counterexample to strict local-time
   no-late-effect semantics and the actual database ordering observed.
4. Locked transaction retry options and an intentionally conflicting fixture:
   distinguish callback attempts, observed commit and unknown ACK; absence of a
   record/exception is not proof that an outstanding write cannot commit.

Keep these as disposable, explicitly synthetic capability probes. They do not
implement Conversation routes, store adapters, AI readers, new producer fields,
terminal lifecycle behavior, recovery UI or production cleanup. Source/test
code and commands/results belong in one focused Draft handoff; no secrets,
tokens, content, private paths or user identities in published output. Record
actual Pass/Fail/unsupported/unproved and cleanup, including failed commands.

Owner ZHOU → independent reviewer JIN → LI bounded evidence assessment. LI
shared code, if later changed, retains DU review; this release changes none.
Use existing #81/#83 threads, no new task tracker. Work begins without waiting
for DU History or the outstanding shared-code/composition reviews. Today's
existing 23:59 delivery target remains; it is not a feasibility guarantee or
authorization to claim real-adapter completion.

## Unselected choices and supersession trail

The proposal's **F01-A strict existing semantics remain controlling**; this
record selects no amendment. F01-B terminal-commit ordering/SDK buffer purpose,
F01-C late expiry copies, F01-D external Auth checkpoint, N02 records/fields/
indexes/exceptional control retention, F03 producer authority/snapshot, R-A
permanent-unknown exit and C-A cleanup/runtime responsibility remain unselected.
Slices B/C/D/E remain held only on their applicable missing contracts.

Neither document approval nor successful probes selects those choices. Evidence
may support a later concrete human decision packet, not silently supersede
C06/Q31/Q14/Q19 or higher authority. In particular no last-second deadline
pressure authorizes weaker privacy/expiry/permission rules.

Preserve #81, its original closure candidate, #90 and JIN's review. Supersede
only the proposal row A's waiting-for-a-bounded-verification-assignment status;
the older conditional-A restriction against unapproved product prototype/
adapter/schema work remains. This technical test assignment grants no real
product write/read purpose or environment enablement. Existing accepted client,
fake-Port and combined checkpoints remain unchanged. No merge, closure, board
promotion, whole Sprint/UAT/Release/Done or provider/live-model result.
