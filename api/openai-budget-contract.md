# Bounded OpenAI trial monetary ledger

Authority: [LI's 2 November recovery decision](../docs/decisions/2026-11-02-li-cloud-ai-backend-resume.md)
and its approved bounded implementation. This is an internal Backend accounting
contract, not a public HTTP DTO or permission to spend. It preserves the previous
Groq quota ledger and grants. It does not install a real grant, initialize a real
database, migrate data, enable a consumer, or authorize a provider fallback.

## Fixed grant and units

One shared OpenAI trial grant covers evaluation, failed attempts, retries,
test-app, Conversation, Persona and proactive calls. Every one of those calls
must cross the same monetary authority before HTTP dispatch; separate process
memory or an evaluation-only budget is insufficient.

All money is an integer number of USD nanodollars, where USD 1 = 1,000,000,000.
All persisted integers are nonnegative safe integers; rates are integer
nanodollars per million tokens. Intermediate cost multiplication, summation and
5% calculation use `bigint`. The grant cap is fixed at verification:

`min(floor(originalGiftCreditNanoUsd / 20), verifiedSpendableRemainingNanoUsd)`.

The original cycle gift is not the remaining gift and is not recomputed after a
call. Neither restart, epoch change nor a new cycle renews or enlarges the grant.
A separately verified new grant needs an explicit operator/review path; there
is no automatic rollover, top-up, overwrite or replacement implementation.

Credit expiry, balance-valid-until and price-valid-until are independent. Any
missing, corrupt, mismatched, not-yet-verified, expired or unknown authority
closes cloud monetary admission. The earliest expiry controls. A zero cap is
valid exhausted authority. Ordinary Backend features do not depend on this
ledger. Real balance, expiry, current price and intended model access still need
verification; fabricated fixtures and this schema prove none of them.

## Reservation and settlement

`CloudCostBudgetOwner` wraps `CloudCostBudgetAuthority`; Infrastructure provides
`FirestoreCloudCostBudget`. The owner starts closed and explicitly recovers an
existing ledger. It never initializes missing state. Recovery preserves every
reserved and spent nanodollar and every attempt record; there is no TTL or
downtime refund. An ambiguous read/write acknowledgment closes that owner and
must not be retried automatically. A replacement epoch may recover the stored
amounts but cannot recover an old dispatch capability or replay an old attempt.

A trusted caller supplies a fresh random UUID and a verified upper bound for the
exact request's complete input and output token counts. Output includes hidden
reasoning. The Port's input ceiling is 272,000 tokens; a transport may impose a
lower ceiling. This keeps the slice below higher input pricing tiers; crossing
that ceiling requires another explicit pricing contract. No token estimator or
permissive default exists in this ledger.

Reservation uses the highest of the explicit ordinary-input, cached-input and
cache-write rates for every possible input token, including a cache-write
premium. Every possible output token is charged at the output rate. The exact
sum is divided by one million and rounded upward to a whole nanodollar. The
reservation and permanent attempt ID record are committed atomically before a
local dispatch capability exists. Duplicate IDs are rejected for every state,
consumer and epoch, including previously reconciled attempts.

The original opaque permit can begin dispatch once. A dynamic guard also checks
the original live callback, grant validity, local clock and trusted exclusive
host ownership. This is a local guard, not a synchronous remote fence read.
Every database mutation independently reads and verifies the existing
`ai_runtime_fence/current` in the same transaction. An exclusive-runtime owner
must revoke the old host guard before replacing it; this budget ledger does not
establish exclusive process ownership by itself. Consumer consent, original
request, content-write and delivery checks remain separate and mandatory.

Only a complete trusted terminal provider response with validated usage may
reconcile an original dispatched reservation. Normalized usage contains exactly
`provider: openai`, `model`, `inputTokens`, `cachedInputTokens`, `cacheWriteTokens`,
`outputTokens`, `reasoningTokens` and `totalTokens`. Cache reads and writes are
disjoint subsets of total input, and their sum cannot exceed `inputTokens`.
Reasoning is already part of `outputTokens` and is never charged twice.
`totalTokens` equals input plus output. Each count must be a nonnegative safe
integer, and total input/output must stay within the original reservation's
bounds. A missing cache-write count/rate is unknown, never assumed zero.

Reconciliation atomically removes the entire original reserve and adds the
confirmed calculated cost once. A repeated identical confirmation returns
`already_reconciled`; a different confirmation cannot revise that charge. A
terminal refusal, truncation or rejected output may still carry billable
confirmed usage; accounting does not authorize content delivery. Confirmed
billing may be reconciled after withdrawal or grant expiry without restoring
dispatch consent or reopening new generation. The original host, clock,
runtime-fence and unambiguous-transaction checks still apply.

Timeout, local cancellation, a nonterminal response, invalid/missing usage, lost
response, or unproved remote termination retains the full reservation. A
confirmed usage count above the reserved bound closes the owner. Unknown
transaction outcomes close the owner without guessing whether either write
committed. Restart never releases an unknown reservation.

## Exact internal Firestore fields

These fields are the approved slice's implementation detail. Backend Admin-only
access is required; none is a public DTO. No prompt, response text, account ID,
conversation/message/operation target, credential, token or secret is stored.
References below are bounded opaque verification identifiers, not raw account
pages or screenshots.

`ai_cloud_cost_budget/current` contains exactly:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `openai_cost_budget_v1` |
| `grant` | Immutable verified grant below; must exactly match the configured grant |
| `processEpoch`, `generation` | Current existing runtime-fence epoch; positive generation |
| `lastObservedAtMs` | Last confirmed monotonic-compatible UTC observation |
| `reservedNanoUsd` | Sum of full outstanding worst-case reservations |
| `spentNanoUsd` | Sum of confirmed reconciled charges |
| `attemptCount`, `reconciledCount` | Permanent created and reconciled attempt counts |

`grant` contains exactly:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `openai_cost_grant_v1` |
| `grantId` | Random UUID, immutable for this grant |
| `provider`, `currency` | `openai`, `USD` |
| `cycleId` | Opaque current-cycle evidence identifier |
| `cycleStartedAtMs`, `creditExpiresAtMs` | Verified cycle start and gifted-credit expiry |
| `originalGiftCreditNanoUsd` | Original gift amount for that cycle |
| `verifiedSpendableRemainingNanoUsd` | Verified spendable credit at grant creation |
| `balanceVerifiedAtMs`, `balanceValidUntilMs` | Verification time and explicit freshness boundary |
| `capNanoUsd` | Exact fixed formula above |
| `priceSnapshot` | Immutable price verification snapshot below |

`priceSnapshot` contains exactly `snapshotId`, `verifiedAtMs`, `validUntilMs` and
`prices`. Each unique model price contains exactly `model` (`gpt-6-luna` or
`gpt-6.1-sol`), `serviceTier: default`, `inputNanoUsdPerMillionTokens`,
`cachedInputNanoUsdPerMillionTokens`, `cacheWriteNanoUsdPerMillionTokens`, and
`outputNanoUsdPerMillionTokens`. At least one and at most both approved candidate
models may be present. Ordinary-input and output rates are positive; cached and
cache-write rates must be explicitly verified nonnegative integers.

`ai_cloud_cost_budget/current/attempts/{attemptId}` contains exactly these base
fields; `attemptId` is a random UUID and is never derived from user data:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `openai_cost_attempt_v1` |
| `grantId`, `attemptId` | Original grant and permanent unique attempt |
| `consumer` | `evaluation`, `test_app`, `conversation`, `persona` or `proactive` |
| `model` | One model explicitly priced in the immutable grant |
| `maxInputTokens`, `maxOutputTokens` | Original verified token bounds |
| `processEpoch`, `generation` | Original reservation's runtime epoch |
| `createdAtMs` | Original reservation time |
| `reservedNanoUsd` | Original full worst-case cost; never rewritten |
| `state` | `reserved` or `reconciled`; `reserved` also covers unknown outcomes |

Only `reconciled` records additionally contain exactly `reconciledAtMs`,
`chargedNanoUsd` and `usage` (the exact normalized usage above). Attempts are not
deleted, compacted, expired or reused by this implementation. Existing counters
and retained ID records must remain intact for the grant. There is no delete,
repair or retention/migration tool in this slice.

## Transaction inventory and offline initialization

All transactions use `maxAttempts: 1` and complete every read before writes:

1. Recovery reads runtime fence and ledger, validates the complete immutable
   grant and counters, then updates only the ledger epoch and observed time.
2. Reserve reads runtime fence, ledger and original attempt path, verifies
   capacity and the original live callback, then creates the attempt and updates
   ledger reserve/count in the same transaction.
3. Reconcile reads runtime fence, ledger and original attempt, validates the
   exact original capability and usage, then updates terminal attempt and ledger
   reserve/spend/count atomically. An already identical terminal record adds
   nothing and never grants another dispatch.

The pure `createOfflineCloudCostBudgetSeed(grant, epoch, observedAtMs)` function
returns the path and a zero-counter record for separately invoked synthetic or
offline review. It performs no I/O, creates no runtime fence, installs no grant,
and is not called by recovery or dispatch. Tests explicitly seed a handwritten
transaction fake. No live Firestore migration, IAM change, index, initializer
command or deployment is included. Source/fake tests do not claim emulator,
real-provider, concurrent-host, physical-phone, UAT or release evidence.

## Recorded local verification, 2 November 2026

The existing pinned Node 24.19.0 and TypeScript 7.0.2 built the strict Backend
successfully. The two monetary Domain/Application/transaction-fake suites passed
18/18 tests. The focused `tool/run_cloud_quota_emulators.mjs` workflow passed
8/8 tests: five new `openai-cost-budget.integration.test.ts` cases plus three
existing Groq-quota/consent cases. The new SDK cases cover competing monetary
reservations, lost reservation acknowledgment and restart, exact-once settlement
with cache-write/reasoning arithmetic, lost settlement acknowledgment and restart,
and refusal to initialize a missing ledger.

The competing-reservation case asserts at most one actual stored claim, matching
ledger amounts and fail-closed unknown owners. With `maxAttempts: 1`, both lock
contenders may abort; the test does not promise a winner or retry either original
attempt. A fresh epoch verifies any remaining capacity using an independent new
attempt. An initial test incorrectly required exactly one acknowledged winner;
the Emulator recorded transaction lock timeouts, and the assertion was corrected
without changing the adapter.

This was an isolated, guarded `demo-enmori-rmvp01a-r10` Emulator run using synthetic
balances/prices/IDs and a temporary credential profile. It establishes local SDK
transaction evidence, not production Firestore, live model, verified provider
balance/pricing, physical concurrent hosts, consumer adoption, phone acceptance,
UAT or release evidence.
