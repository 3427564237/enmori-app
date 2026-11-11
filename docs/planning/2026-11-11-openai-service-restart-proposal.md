# OpenAI service restart recovery — concrete bounded proposal

Status: proposal for LI confirmation, not authorization to claim a live owner. Basis: [two-month teacher delivery](../decisions/2026-11-11-li-two-month-teacher-delivery.md) and [operating evidence](2026-11-11-teacher-delivery-operating-plan.md).

## Problem and scope

The current one-use expected-fence claim is appropriate for an operator-controlled trial. After Azure replaces its process, that claim cannot open AI again. Merely making its expiry longer or reading the latest fence and stealing it would not establish exclusive ownership. The [5 November decision](../decisions/2026-11-05-li-sol-test-app-acceptance.md) explicitly forbids automatic takeover; this proposal supersedes that restriction only for the single configured existing Azure service after an initial verified stop/drain and migration. Local service, old binaries, other regions and other hosts remain excluded.

Keep the existing Azure plan, managed identity, Firebase project, monolith, HTTPS and dependencies. Add a small renewable exclusive-owner capability, used by all cloud consumers and Settings writers. It does not renew credit, release unknown cost, regenerate an old request or change per-account consent. No new public endpoint, Admin command or client field is proposed.

## Exact private state and configuration

Preserve the exact existing `ai_runtime_fence/current` fields and semantics. Add one Backend-only document **`ai_runtime_fence/service_owner`** in that existing collection, with exactly:

- `schemaVersion: "openai_service_owner_v1"`;
- `serviceKey`: bounded opaque configured identity for this one Azure service, not a credential or user identifier;
- `enabled`: operator-controlled boolean;
- `processEpoch`, `generation`: the same owner as the current runtime fence;
- `leaseVersion`: nonnegative safe integer, incremented for each confirmed lease write;
- `renewedAtMs`, `leaseUntilMs`: trusted Firestore observation time and its bounded lease expiry.

An explicitly installed vacant record uses the verified existing fence, version 0 and both times 0. Startup never creates a missing document or guesses a corrupt one. The record stores no account, message, content, token or credential. It is current operational coordination state, not a history archive or new product-data retention purpose.

In the existing private OpenAI configuration, retain the current `claim` branch for manual recovery, and add an exclusive alternative `ownership` branch containing exactly `mode:"renewable_service_lease"`, the approved `serviceKey`, `leaseDurationMs:120000`, `renewEveryMs:30000` and `safetyMarginMs:15000`. Having both, neither, malformed values, a different configured service, or a missing/disabled owner record closes cloud admission. This adds no environment variable and does not alter the existing optional `firstFlow` configuration.

## Ownership and time proof

Use Firestore's own snapshot `readTime` as the lease transaction's time authority. Extend only the internal infrastructure snapshot metadata projection to expose that immutable service observation; do not persist local wall time as proof that another host has expired.

1. Acquisition reads the owner record and current fence together. It requires the configured service, enabled state, exact matching epoch, and a server observation at or after the old `leaseUntilMs`. A single transaction advances the existing runtime fence and writes the same new epoch plus a 120-second lease. Contention or lost acknowledgement never opens an owner.
2. Renewal reads both records together and requires the exact original epoch/version and an unexpired lease. It updates only owner lease metadata. No renewal advances the runtime epoch, touches budget or adopts a replacement owner.
3. For either operation, record the local monotonic instant **before** submitting the transaction. Only a definite acknowledgement within the 15-second response bound can install a local capability, and its deadline is that original instant plus 105 seconds. This deadline is conservative relative to the server lease; response delay never adds lifetime. Every use synchronously checks this deadline, the active epoch, shutdown state and the unchanged service identity. Invalid/backward clocks or a failed/unknown renewal retire the local capability permanently.
4. All existing cloud dispatch guards, Settings writers, proactive ticks, publication/delivery guards and consent services consume this same ownership capability. Existing transaction-level runtime fencing remains mandatory. A new process cannot borrow an old HTTP session, consent lease, cost reservation or dispatch capability. Cross-process consent writes cannot overlap valid ownership intervals.
5. After owner loss, close admission immediately and dispose the process through the existing shutdown path. Do not call an aborted HTTP operation physically stopped; retain remote unknown holds and occurrence outcomes. The existing Azure supervisor can start a fresh process, which must wait for the durable lease to expire before acquisition. Startup waits only within the platform's verified startup allowance. It never force-clears an old owner or extends its own expired capability.

No early graceful-release shortcut is proposed: even after shutdown, the next owner waits for the conservative server expiry. This makes the initial implementation smaller and prevents a local cleanup observation from becoming proof of remote model termination. The initial live migration still requires positively verified old Azure/local processes stopped, because those old binaries do not enforce the new lease.

## Verification and release boundary

Before live arm, test the source and a guarded Firestore Emulator with two competing processes; server/read-time and monotonic-clock divergence; slow/lost acquisition and renewal acknowledgements; paused/resumed old processes; missing/disabled/corrupt owner state; epoch replacement; Settings withdrawal racing with count/inference/publish/FCM; and unchanged budget/attempt/unknown-hold recovery. Verify at most one permitted owner without requiring a winner under transaction contention. Fake time tests must check the deadline inequality, not only successful acquisition.

Review the completed implementation independently, then rehearse controlled restart on the existing host with zero paid dispatch. A real scheduled OpenAI reply and physical push arrival remain separate tests requiring their specific authorization. If the platform cannot meet the bounded startup/recovery conditions, report that measured limitation; do not add a host, scale the plan or loop over unsafe claims.

Migration: retain the active package and exact current ledger/attempt digests; stop/drain; initialize only the one approved vacant owner record conditioned on the captured fence; install the reviewed compatible package/configuration; start; verify owner/fence equality, old-owner exclusion, unchanged monetary state and ordinary endpoints. Rollback closes/stops the leased owner first, verifies drain and preserves the owner record; an old package uses an explicit fresh manual claim or ordinary-only configuration. No deletion/reset of the owner or financial state is a rollback strategy.

This proposal solves restart ownership only. It does not make the existing midnight-expiring verification or November gift credit last two months. Future purchased-credit contract, amount and validity still require actual billing evidence and a concrete operator grant. Keep that funding boundary visible.

Suggested confirmation: “按此方案增加同一 Azure 服务的自动重启恢复；保留单实例、共享预算、逐账户同意和未知结果不重放，不自动续费。”
