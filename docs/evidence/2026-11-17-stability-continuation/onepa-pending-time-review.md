# onePA shared pending read: each caller's original time boundary

17 November 2026 SGT. Independent investigation against
`272decbfd0a209c0ccf3eb1b17500f090cce4096`, which contains the separately approved
identity/refusal repair. **The separate per-caller time repair is now approved
and implemented; permanent RED → GREEN and the full backend checks pass.**
Deployment is not part of this evidence. The original investigation and proposal
below are retained as the approval trail.

This is separate from the [identity/refusal repair](onepa-investigation.md).
Its [approval](../../decisions/2026-11-17-li-onepa-identity-refusal-repair.md)
explicitly excluded a shared-pending/asOf change. The initial assignment was
read-only investigation and a concrete proposal for separate confirmation.
LI subsequently instructed “加入修复并回归”, persisted in the
[per-request time decision](../../decisions/2026-11-17-li-onepa-pending-time-repair.md).
That decision authorizes exactly the two-added/one-removed-line change below and
regression tests. No service, device, provider, real account or AI operation was
changed by this implementation work.

## Proven boundary

`OnePaBrowseSource.load(url, asOf, signal)` coalesces work by URL. The first
caller creates a promise that parses the page against that caller's `asOf`.
A later caller with a different `asOf` receives the same already-projected row.
The completed-cache branch already checks `cached.row.startAt > asOf` for each
caller, but the shared pending branch returned `await work` without this check.

The actual application composition does not supply the missing filter:

- `CombinedEventSource` forwards exact reads to the selected provider.
- `ControlledSourceProjection.event/detail` filters a cached list candidate by
  `startAt > asOf`, but a new exact source result returns after the existing
  generation/freshness/cancellation fence without repeating the time predicate.
- `createControlledEventRecommendations` maps a returned row into the requested
  stable detail; `GetEventDetail` preserves a successful result.
- `EventBrowse.read` serializes a returned exact row as successful Browse detail.
- The participation composition calls `availableEvent(id, asOf)`. That becomes
  a presence check on the same exact read. `FirestoreParticipationRepository`
  then accepts the source-current result and can save a newly selected plan.

The [approved source contract](../../decisions/2026-10-15-li-real-event-contract-selection.md)
requires the existing future-occurrence filter. The
[participation contract](../../../api/event-participation-contract.md) requires
an existing current occurrence for a new selection. This finding concerns
inconsistent application of the **original caller-supplied asOf**, not a new
requirement to compare against wall-clock time again at response delivery.

## Offline reproduction and positive controls

The diagnostic uses the actual OnePaBrowseSource → CombinedEventSource →
createControlledEventBrowse/ControlledSourceProjection chain and the actual
stable, Browse and participation compositions. The source HTML/catalogue,
authenticated account records, clock and Firestore gateway are synthetic.
`InMemoryFirestoreGateway` records only in-process fixture writes. No server
listener, Firebase SDK/emulator, Chromium, provider request or real write occurs.

For each failing case, the first caller's `asOf` is one second before a synthetic
activity's start; a single source read is held. A second caller joins that URL
at an `asOf` equal to the activity's start. The synthetic page is then released.

| Case | Observed result on the baseline | Expected existing boundary |
| --- | --- | --- |
| Stable Event detail | Both callers succeed; joined result has startAt equal to its original asOf; one provider read | Later caller cannot receive a future-eligible exact row |
| Browse detail | Same successful joined result at the start boundary; one provider read | Later caller cannot receive that row |
| New Going selection | Joined participation operation returns Going/revision1 and saves one synthetic participation fact | Source-current rejection; no new participation fact |
| Two callers both before start | Both succeed, sharing one source read | Positive control passes |
| Cold new selection at start | EVENT_UNAVAILABLE; zero synthetic facts | Positive control passes |
| Read completes, then a later cache-hit caller at start | Stable, Browse and new selection each return EVENT_UNAVAILABLE; zero synthetic facts; no second source read | Positive control passes |

Formal run: pinned **Node 24.19.0**, six new cases, **3 passed / 3 failed**,
exit1, no skipped/cancelled cases, approximately 0.77 seconds. The three failures
are the intentional assertions that the joined current-time request must be
rejected. Earlier callers still succeed after the synthetic clock advances;
the diagnostic does not add a response-time clock rule.

An initial shell invocation used the host default Node26.13.1 and produced the
same three failures. That preliminary log is retained privately but is not the
pinned-runtime acceptance evidence. The formal three-case reproduction was
repeated with Node24.19.0 before adding the three positive controls. The earlier
9/11-case diagnostics were not rerun or counted as these six cases.

This is evidence of application-visible behavior with controlled ports, not an
observed production incident or an actual Firestore transaction. It does not
attribute historical onePA 503 responses or establish frequency in real use.

## Original minimal proposal, subsequently approved

Change only `backend/src/event-browse/infrastructure/onepa-browse-source.ts`,
inside `load` after awaiting the shared work:

```diff
-      return await work;
+      const row = await work;
+      return row && row.startAt > asOf ? row : undefined;
```

This matches the existing completed-cache predicate, keeps each caller's
original `asOf`, and preserves the shared projection/cache rather than deleting
it for other callers. It introduces no new clock read, extra acquisition,
reprojection, timeout, TTL, cancellation or pending-generation semantics, source
permission, API, data field or automatic retry. The existing `finally` still
owns pending cleanup. Rejection follows existing undefined/unavailable behavior.

The two-added/one-removed-line patch is private
`onepa-pending-asof-proposal.patch`; SHA-256
`cccdbd9bc84523cc00aa0ec9fc5a41b91a48073feb10a357d51cfd6b86825405`.
`git apply --check` passed before approval. The source before/proposed hashes are
recorded in the historical `pending-asof-patch-metadata.json` with
`applied:false`; that original proposal receipt is retained unchanged. The final
source hash below exactly matches its proposed source hash.

The proposal's required follow-up was to promote these composition cases to permanent
regression tests; preserve same-time/before-start/at-start/after-start behavior,
earlier caller success after a later clock advance, completed cache behavior,
single acquisition, correct participation rejection/no mutation and all existing
identity/refusal/generation/abort checks. Run focused then applicable backend
verification and independent review before preparing a separately approved
artifact/deployment. Its implementation results are recorded below; live
recovery is not claimed by these offline checks.

## Approved implementation and permanent regression

Only `OnePaBrowseSource.load` changed in production, exactly as the approved
patch. `backend/test/event-browse/onepa-pending-time.test.ts` adds 13 permanent
tests. Stable detail, Browse detail and new Going each cover both `asOf == startAt`
and `asOf > startAt` while sharing an earlier caller's held source read. The
earlier caller must still succeed using its original `asOf`; later application
requests return the existing `EVENT_UNAVAILABLE`. Participation cases compare
the complete synthetic gateway before and after, including existing accounts,
and require no mutation. Cold reads, completed cache reads, two eligible pending
callers, private source output and thrown source failure remain covered, with a
single acquisition asserted. No real source/Firebase request is used.

The first permanent-test run had six intended rejection failures plus one
positive-control fixture failure. That fixture mixed an initial stable exact
read with a Browse read which correctly established a newer projection
generation and retired the first read. The positive control was restored to
two stable requests, as in the original diagnostic; the generation guard and
production source were not changed. This first log is retained separately.
After that test-only correction, with the unchanged baseline source hash, the
formal RED was **7 passed / 6 failed**, exit1. All six failures were the expected
rejections returning success on the old code. Only then was the approved patch
applied.

Pinned Node **24.19.0** and existing dependencies were used throughout. Commands
below use `NODE=/home/miku/.local/state/enmori-backend-expiry-20261117/toolchain/node`
as notation (no environment/toolchain change):

```sh
"$NODE" node_modules/typescript/bin/tsc --project backend/tsconfig.json
"$NODE" --test backend/dist/test/event-browse/onepa-pending-time.test.js
"$NODE" --test 'backend/dist/test/event-browse/*.test.js'
"$NODE" --test 'backend/dist/test/**/*.test.js'
```

- Compilation passed before RED and after the production edit; no dependency
  installation was needed.
- All Event Browse tests, including the 13 new cases and the existing refusal,
  exact identity, freshness, deadline, disable and abort coverage: **184/184**
  passed, 1.53 seconds.
- Full backend unit suite on the same final compiled source: **2105/2105**
  passed, 9.85 seconds, no failures/skips/cancellations. This is the earlier 2092
  baseline plus the 13 permanent cases, not a reuse of that earlier run.
- `git diff --check` passed. Production, permanent test and compiled output are
  frozen for separate deployment preparation.

Independent review checked the exact production/test/dist hashes, the approved
predicate, unchanged cleanup/identity boundaries and all 13 new tests; it found
no blocking issue. On this same final compiled output, the reviewer reran the
three new repair files (**57/57**), the isolated Firebase integration suite
(**21/21**) and Azure entry tests (**9/9**); all exited0 with no skips. The
Firebase emulators were shut down after the run. These are new combined-source
checks, not reuse of the earlier two-point repair receipts. See the
[independent review](onepa-final-independent-review.md) for exact commands and
environment. The author independently checked the log summaries and hashes.

The source now consistently applies the existing future-occurrence predicate
to each caller's original request time. This does not establish production
incident frequency, attribute historical 503s, validate a physical device, or
introduce a new response-delivery time rule. No deployment or release approval
is inferred from test results.

## Independent check of the already approved two-point repair

The reviewer separately inspected its three-file production diff and all 44 new
permanent tests, then ran only those two test files with pinned Node24.19.0:
**44 passed**, no failures/skips, approximately 0.98 seconds. Explicit static
403/429 rejection covers successful body cancellation, cancellation failure and
absent body; browser refusal checks zero readiness work and context/browser
closure. Matching identity, allowed unequal provider fields, both lookup paths,
cold/cache/coalesced wrong identities and real CombinedEventSource application
paths are covered. Non-refusal ordinary rendering remains allowed. No blocking
issue was found in that approved scope; this new asOf issue remains separate.

## Evidence receipts

Private root: `/home/miku/.local/state/enmori-onepa-stability-20261117/`.
Only sanitized findings and hashes enter this report.

| Artifact | SHA-256 |
| --- | --- |
| `pending-asof-composition.test.mjs` — final six cases | `1a18510f1fc3cf32410af7551328a488155486935a13056f209a39ff4570b9dd` |
| `pending-asof-composition-node24.log` — three failures | `540441af47f2150e82baeb467a2d2556723e0545482af5f2186e66b5b3e18fb2` |
| `pending-asof-controls-node24.log` — three passes / three failures | `a39f1e93db30ded9038528a9afb995fae17b2f13f5ccdd8cc7cc343d21de852a` |
| `independent-boundaries-green.log` — approved two-point 44-pass check | `f48b304d26e656020775b5f0fc8c4fcafc0f0748d24ebf81274c34f10adb4704` |
| `backend/dist/src/event-browse/infrastructure/onepa-browse-source.js` used by diagnosis | `9b6a5e68983446486bfb84715cb40da4c60489353514453427785c2b10ab7f94` |
| `onepa-browse-source.ts` before the proposed third change | `d16e9d7a2ca54b2a933f627e8a45d0cf768846e18235ef7e68bd45d859e59b58` |
| `pending-time-permanent-red.log` — initial 6 target + 1 fixture failures | `513d5ef5368b83287f6df17fb750b44aa81307ced42c157482f2464e8994bc8f` |
| `pending-time-permanent-final-red.log` — formal 7 passes / 6 target failures | `b9c50b8937c8a242ddad9fde76cc1f593fd69f83f198ee1950e2b87a43515600` |
| `pending-time-focused-green.log` — 184 passes | `828d9e3f5fa904f68dff8474773428ecb81bfded686e47a68d02edc1de181a90` |
| `pending-time-full-backend-green.log` — 2105 passes | `ba555251c1825c5c49935a769ab129d639f5bc5b2e541ccc8408a95dd84c0221` |
| `pending-time-green-build.log` — successful compiler, empty output | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final `backend/src/event-browse/infrastructure/onepa-browse-source.ts` | `e58aa5b5485cfd41056bf1f135f2040d949864a55e81a390bdc3580a09d86ac4` |
| Final `backend/test/event-browse/onepa-pending-time.test.ts` | `6eabef92595b63de48bdf937a9511c30a54d241f9227252f335c12a6603a1c79` |
| Final `backend/dist/src/event-browse/infrastructure/onepa-browse-source.js` | `aa6c7bc4c12e7130d07272e9e31907273689e9f4bba9fe4f0e05ddd2b42056a3` |
| `final-combined-independent-focused.log` — independent 57 passes | `74026d86ea38297e1316e450f4740b44e8d42739db3ab0eae45c58737ee85ba9` |
| `final-combined-firebase.log` — final-source Firebase 21 passes and shutdown | `985f3474617ad7f24dafcd2f9b5d459ca828316d0cea823510265dcc66b0fa94` |
| `final-combined-azure-entry.log` — final-source Azure entry 9 passes | `4b5ae062bbc9286e191e143ae76bf814baa22f377fea360125af55560028b916` |
