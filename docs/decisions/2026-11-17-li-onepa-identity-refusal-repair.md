# LI: approve exact onePA detail identity and refusal handling repairs

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

Following the [stable-candidate continuation](2026-11-17-li-stable-candidate-continuation.md),
LI reviewed the concrete three-file proposal and answered:
**“批准修复，部署另确认”**.

Approved scope:

1. At both onePA detail entry points, require the returned occurrence's canonical
   identity to equal the requested identity. Do not relabel another product's
   content with the requested Event ID.
2. On an explicit static or browser-navigation HTTP 403/429, stop subsequent
   rendering/readiness acquisition and perform existing resource cleanup. Preserve
   safe unavailable mapping and bounded ordinary rendering in the other approved
   cases; add no refusal retry or access-control workaround.

Reviewed, initially unapplied patch SHA-256:
`7bfeff36ce22be5b893c354a2a1abd1a6b256bc3b5f83e4d23714db5ccda204b`.
Affected production files are `public-event-pages.ts`, `onepa-public-reader.ts`
and `onepa-browse-source.ts` under event-browse infrastructure. Add permanent
regression coverage, run the applicable backend checks, independently review,
and prepare a concrete candidate artifact for separate deployment approval.

This preserves existing API, data model, dependencies, cache lifetime, source
scope, authentication, account data and AI authorization. It does not approve a
new logging sink, a shared-pending/asOf redesign, or a new equality assumption
between Product.ID, xp.Event.Id and URL numeric text. That broader initial
identity proposal was withdrawn before approval and was never applied.

The [15 November provider-refusal decision](2026-11-15-li-event-content-performance.md)
and existing exact-occurrence contracts remain controlling. These offline-proven
defects do not establish the cause of every historical onePA 503 or the initial
startup failure. Deployment, real-source recovery and stable-release acceptance
remain separate gates. AI renewal and physical-phone operation remain deferred.
