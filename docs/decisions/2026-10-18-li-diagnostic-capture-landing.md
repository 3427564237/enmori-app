# PM decision — controlled diagnostic capture landing

- Source ID: S-PM-1018-LI-DIAGNOSTIC-CAPTURE-LANDING.
- Authority: LI HOURUI / ENMORI PM, 18 October 2026, Asia/Singapore.
- Confirmation: human LI explicitly selected “批准该限定方案（推荐）” for the concrete storage/access and system-level cleanup proposal linked below.
- Scope: implement the controlled diagnostic landing on the existing Linux host. JIN owns implementation and faults; LI owns the host; SHI independently reviews new code. This is deployment-design approval, not proof of installation, access enforcement, cleanup, capture readiness or AI repair.

## Controlling sources and change trail

Continue [Q14 retention/logging policy](https://github.com/3427564237/enmori-app/blob/f434c49498e38d2575988907df073749c3401dd1/docs/decisions/2026-09-02-retention-logging-audit-policy.md), [Backend architecture](https://github.com/3427564237/enmori-app/blob/f434c49498e38d2575988907df073749c3401dd1/docs/decisions/2026-09-01-backend-architecture.md), and [LI's accepted diagnostic preparation and host facts](https://github.com/3427564237/enmori-app/pull/143) at `f434c49498e38d2575988907df073749c3401dd1`.

Select the two implementation/deployment choices in [JIN's concrete proposal](https://github.com/3427564237/enmori-app/blob/2d42a4832393d958a9b7e2fb7629c1a341b14d2b/docs/evidence/sprint3/2026-10-18-jin-capture-landing-decision.txt) from #146 `2d42a4832393d958a9b7e2fb7629c1a341b14d2b`. This supersedes only that proposal's PM-Pending status for the storage/operator-access landing and host-level cleanup mechanism. Q14's fields, periods, access restrictions and failure handling are unchanged; all earlier sources and original runtime failure history are retained. No unrelated deferred datastore, deployment or product choice is resolved.

## Confirmed landing and ownership

1. Use a dedicated private diagnostic-log store on the original controlled Linux host, separate from the disposable emulator/profile and runtime handoff. Store only revalidated Q14 metadata. Keep the exact private location and runtime configuration out of Git/public comments and handoff.json/route.json.
2. Provide controlled out-of-app access for the minimum Backend operator role. Preserve original trusted server `loggedAt`; deny reads at exactly `loggedAt + 30 days`. Reading/copying cannot renew retention. Mode 0700/0600 or a caller-supplied boolean alone does not establish this access/expiry boundary; ordinary operator access and raw-copy paths must actually obey it.
3. Use a host system-level systemd timer/oneshot for hourly cleanup plus startup catch-up, independent of phone-service and desktop login. LI owns host availability and authorized host operations; JIN implements the adapter, reader/CLI, runner, scoped installation procedure, health/failure handling and evidence. No new third-party service, dependency, port or product datastore is approved.
4. At expiry, records are immediately inaccessible; physical deletion must finish within the following 24 hours. Delete only owned capture records and verify completion. Host unavailability, a missed deadline, unknown deletion or capture/access failure must be reported and make capture unhealthy, refusing new positive AI work. Catch-up cannot backdate an on-time result. No Q14 exception, backup or grace period is introduced.

## Continue implementation and verify the actual landing

JIN may proceed directly with this bounded implementation without another vote on the same choices or repetition of #142 reviews. Deliver one coherent source/tests/evidence packet and a concrete least-privilege installation/execution procedure; LI can perform the required host operations once that artifact is available. Do not present an unbuilt procedure or fixture policy as an installed facility.

Retain the proposal's actual acceptance checks: writer injected before readiness; authorized and unauthorized access through the real selected boundary; metadata-only trusted timestamps; boundary-clock cases at day30/day31; real owned-storage deletion and wrong-owner/symlink/race/partial-write checks; no extension by copying; actual runner behavior after phone-service exit and logout; observable access/write/cleanup failure that blocks new positive handlers while allowing original settlement.

SHI reviews new JIN code/composition; LI independently reviews source-bound evidence and performs host responsibilities. Existing reviews, Settings/Check-in results and original model-termination facts stay complete. Historical application lease/fence/claim/store/provenance/cancel/cleanup outcomes remain unrecovered. Current source/configuration/TLS/tokenizer, exclusive model state, startup epoch/retirement/maintenance and fully wired capture health remain actual startup checks, not a new request to reconstruct the lost original service.

This decision does not itself start a service, install units, change access permissions, load/call a model, create a new phone attempt, or claim physical deletion. Any diagnostic attempt continues only through its existing approved runtime prerequisites; no blind Retry/Send/Check/cancel, model reset or reconstructed old fixture is authorized. Merge, Issue/Project transitions, whole-app/Sprint/UAT/Release/Done are unchanged.
