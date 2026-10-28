# Groq transport and durable quota — integration-source receipt

28 October 2026. Source `cadaa9640d87e3acb224592a5da6aa3de5cbf311`.
[Approval](../../decisions/2026-10-28-li-cloud-independent-request-recovery.md) ·
[Retained persistence proposal](../../planning/2026-10-28-cloud-durable-quota-proposal.md) ·
[Commands, results and hashes](verification.json).

## Implemented and verified

The Backend now has a fixed-host Groq Chat Completions adapter and an explicit
cloud Conversation authorization bridge. The existing chat serializer is shared
without changing its request messages or adopting the experimental prompt.
The cloud factory binds quota reservations, final HTTP admission, cloud consent
and input token bounds; construction starts closed and performs no network or
database operation. No default credential, HTTP client, tokenizer or consent
implementation can silently enable it.

The approved `ai_cloud_quota/current` adapter implements minute/day request and
token reservations using existing Firestore transactions and runtime epochs.
It stores only provider/account-scope configuration and accounting metadata,
never user IDs, message contents, credentials or provider text. Unknown commits
close admission and retain recorded reservations; there is no automatic retry,
refund, provider fallback or initial empty ledger creation.

Recovery carries the remaining windows from the last confirmed ledger write
forward, without crediting unproved downtime. This may extend quota waiting
after a restart, and repeated restarts can extend it again. It never establishes
remote termination. Within one process, elapsed accounting uses anchored
monotonic time and rejects excessive UTC drift; fractional deadlines round
conservatively. 429 cooldown is persisted and checked again immediately before
HTTP, including when an earlier response arrives while new authorization waits.
Missing Retry-After uses a full-day cooldown; an uninterpretable supplied value
persists a closed sentinel requiring explicit operator reconciliation.

Other covered boundaries include cancellation despite an uncooperative HTTP
client, bounded/invalid UTF-8 bodies, duplicate envelope keys, refusals,
truncation, incomplete usage, credential reflection, stale permits/epochs,
cloud-consent loss and mutation of the token-counting input snapshot.

Strict compilation passed; full Backend **1640/1640**, evaluation tools **41/41**.
The actual Firebase Admin gateway and Firestore emulator passed **2/2** tests:
competing reservations cannot both consume the final minute slot, and a write
committed through the SDK with a deliberately lost acknowledgment remains
accounted for when an adapter recovers into a replacement epoch. This is not an
OS/service restart or a real cloud database test. The isolated `demo-` project,
loopback endpoints and filtered environment exclude real account data. Emulator
rules are permissive by default; these tests do not prove production IAM.

The earlier full-suite run from a separate build directory had two path-related
calendar-index failures; standard output resolved them. The temporary output
kept the concurrently running synthetic evaluation's compiled inputs unchanged.
The full receipt retains that failed verification instead of hiding it.

## What remains before production

- The tested model remains unaccepted: [constraints-v3](../2026-10-28-li-ai-repair/groq-constraints-v3-assessment.md)
  is 16/24, with material failures and regressions. All **96** Groq synthetic
  calls are consumed; the Backend tests add none.
- A verified model-specific input tokenizer/framing bound must implement the
  required counting interface. The evaluation byte estimate is not a production
  tokenizer. The factory rejects reservations smaller than configured input
  plus completion bounds; no fake counter is enabled in production.
- Real cloud-processing consent and source provenance must be implemented.
  Existing selected-context contracts still say `processing: local`; the new
  consent interface deliberately supplies no permissive default. Existing
  local grants cannot authorize Groq transfer.
- Conversation/Persona/F0 must use one actual production owner. The new factory
  is not connected to the controlled phone service, and first-flow still binds
  the local lane. No production consumer was switched.
- The ownership callback requires actual exclusive controlled-host authority.
  A local lock and one Firestore epoch read do not prove cross-host exclusivity;
  migration must verify the old relevant runtime is stopped before enabling
  the replacement. Missing/mismatched quota state remains closed until a
  separately verified initialization/reconciliation, never silently zeroed.
- Azure host, managed identity/Firebase access, HTTPS, endpoint allowlist,
  physical-phone and personal-host-off tests remain unperformed. No VM,
  permission expansion, real quota-document write, new key or APK occurred.

Focused subagent review found concrete boundary defects that were corrected
and regression-tested. This is still author-owned source/emulator evidence,
not independent team approval, UAT, Release or Done. Existing local service and
prior failed-model evidence remain intact.
