# Stable-detail expired-projection repair

Date: 17 November 2026, Asia/Singapore. **Implemented and locally regressed; not deployed or physically accepted.**

Authority: [LI's narrow implementation approval](../../decisions/2026-11-17-li-expired-projection-repair.md), option A of the [prior proposal](../2026-11-17-stable-followup/authorization-and-backend-proposal.md). Base checkout: `4ad2b4b79db40d58ae3489fab9e24e5f73182867`. AI renewal, a production diagnostic sink, backend deployment and phone operation remain outside this approval.

## Root cause and exact change

`ControlledSourceProjection.event` previously captured an already-expired shared snapshot, performed a successful fresh exact-source lookup, then rejected that result because the captured list snapshot was expired. Repeating the exact lookup could not recover until another route replaced the list generation. The earlier synthetic diagnosis established this local mechanism; it did not attribute every production 503 to it.

The production change is limited to `backend/src/event-browse/infrastructure/controlled-source-projection.ts`:

1. Keep the existing wait for a pending generation replacement and the original epoch/abort checks.
2. If the snapshot is already expired **before the new exact lookup**, atomically retire it, clear its observed-page/read state and advance the epoch.
3. Capture the post-retirement epoch and snapshot, then use the unchanged exact-source read and final `requireCurrent` check.

This does not fetch a replacement catalogue or publish a new list snapshot. It does not re-date or reuse expired rows. A cold exact-source result remains governed by that provider's existing validation. If the snapshot was still live at exact-read admission, its expiry remains the in-flight bound: expiry during the read still rejects the result. A new or failed replacement, abort, clear/disable and source failure still fail closed. The change introduces no retry, TTL/timeout increase, endpoint, DTO, schema, dependency or configuration change.

Production diff: **9 insertions, 3 deletions in one file**, including comments and capture-name changes. The permanent synthetic regression file is `backend/test/event-browse/stable-detail-expiry.test.ts` (183 lines, 32 cases).

## Red before green

All work below uses the existing **Node 24.19.0** and installed pinned TypeScript compiler. No dependency installation or upgrade, network request, model call, remote write, phone operation or service restart was performed by this repair work.

| Stage | Result | Meaning |
| --- | --- | --- |
| Build with new tests and unchanged production source | Passed | TypeScript accepted the regression fixtures before the repair. |
| New 32 cases before production edit | **24 passed, 8 failed**, zero skipped/cancelled | Both provider identities reproduced refusal of fresh exact detail and a genuine `undefined` result after expiry. Cases containing a newer exact read also failed because that newer read was incorrectly rejected. Existing protective outcomes passed. |
| Build after the narrow production edit | Passed | Strict compilation completed without dependency changes. |
| Focused regression after edit | **63 passed, 0 failed/skipped/cancelled** | New 32 cases plus existing freshness, generation-replacement and controlled-projection tests passed. |
| Whitespace/diff check | Passed | `git diff --check`. |

The two provider identities are synthetic Ticketmaster and onePA IDs; these tests do not call either live provider. Each provider runs the same 16 cases:

- Cold exact reads succeed without creating or acquiring a list generation.
- A live cached list is not substituted for exact detail.
- At the exact 300,000 ms expiry boundary, two explicit fresh exact reads succeed without a new list acquisition; `ready` remains false and no stale social row appears through `peek`.
- Underlying failure and `undefined` remain distinct, with one call and no stale fallback or retry.
- A snapshot live at admission but expired during the read still rejects.
- Retiring the expired snapshot allows a new exact read without reviving an older in-flight exact read or later-page read.
- A pending replacement is joined; failed replacement prevents the exact call.
- Replacement, failed replacement, cancellation and clear after retirement reject the in-flight result.
- A pre-aborted request makes no exact-source call.
- Runtime disable rejects the in-flight result, prevents another read and returns tracked pending work to zero.

The focused command is:

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test \
  backend/dist/test/event-browse/stable-detail-expiry.test.js \
  backend/dist/test/event-browse/source-freshness.test.js \
  backend/dist/test/event-source-generation-regression.test.js \
  backend/dist/test/controlled-event-projection.test.js
```

Here `node` denotes the already-installed pinned 24.19.0 executable, not the unrelated host default. Build and test transcripts remain in the private operator directory `/home/miku/.local/state/enmori-backend-expiry-20261117/`: `build-red.log`, `red.log`, `build-green.log`, `focused-green.log`. No raw production logs or private data were copied into this report.

| Artifact | SHA-256 |
| --- | --- |
| Production source after repair | `e6c253e428307edd16de3f4a4be7941b9bd032f14d297bfbe2767df228a6e89a` |
| New permanent test source | `1d5c5b70fedbfbb6f4ccd87eb78dac39ec2bbb9439ecfb1f47d228b5fbbc3cf4` |
| Red transcript | `06e2e6d89ead15ddf5defd5b135ca2d8374f7ee1a99c8730165229d48c0a8735` |
| Focused green transcript | `69ef42d669e501adae121ac80592328a6ef6a42c5fbe6f0cbdad7021142cb5dd` |

## Remaining gates and interpretation

The source was handed to the root thread for full backend verification and independent review after the focused run. This report records the focused results only; the final package receipt must identify the reviewed source, full-suite result and actual artifact hash. No deployment or release-readiness result is inferred from compilation or unit tests.

The onePA 503s that continued after fresh Browse acquisition, the original startup read failure, and v79's historical return-to-Home observation remain separate open findings. This repair is not evidence that those root causes are closed. Before deployment, LI must review the concrete changed package, verification and rollback scope. After any separately approved deployment, compare the actual mounted identity and test the same exact stable ID after expiry, including real source failure and recovery; phone acceptance remains deferred. AI authorization and its existing expiry/cost/owner state are untouched.
