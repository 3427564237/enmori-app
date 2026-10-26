# v30 AI runtime recovery and LI confirmation

26 October 2026, Asia/Singapore. LI reported that sending with Check-in
references disabled showed AI unavailable, and enabling references also failed.
The installed APK was confirmed as v30.

## Observed failure boundary

The existing Backend process was running, but its startup report had
`ai.configured=true` and `ai.available=false`. Both reported attempt periods had
HTTP 503 responses. The first such response predated the v30 build/install, so
this is not evidence of an AI change introduced by SHI #187.

Local Qwen was loaded. One empty-prompt readiness probe returned HTTP 200,
matching `qwen3.5:9b`, `done=true`, an empty response and `done_reason=load`.
No user message, Check-in or model reply content was used or logged by that
probe. Read-only runtime-control inspection found a valid previous epoch and
zero operation fences; no old operation was replayed or forcibly cleared.

The deployed candidate's dependency link led through the integration checkout
to a missing older checkout, so a new SDK import failed with MODULE_NOT_FOUND.
The existing AI initialization catch retains unavailable state after a failure;
the original caught exception was not retained. These observations establish
the broken dependency tree and failed initialization, but do not independently
identify which original startup instruction threw.

## Recovery performed

The exact existing package manifest and lockfile were copied into an owner-only
runtime dependency directory outside managed checkouts:
`/home/miku/.local/state/enmori-runtime-deps-20261026/`.

Using approved Node 24.19.0 and pnpm 11.19.0, offline frozen-lock installation
restored 692 cached packages, with zero application-package downloads and no
install scripts. Direct versions remain Temporal 0.5.1, Fastify 5.12.1 and
Firebase Admin 14.3.0; no manifest, lockfile, application code or dependency
version changed. The available pnpm 11.25.0 was first rejected by the existing
engine guard; it was not used to bypass the pin.

Both the integration and deployed candidate now link directly to that durable
dependency tree. During the first link operation, repairing the integration
link made the candidate's indirect chain valid and triggered an overly strict
second assertion. The candidate was then linked directly to the same resolved
tree. Exactly one normal `enmori-group.service` restart was performed; no forced
kill, lock removal, data reset or old-operation resend occurred.

At 09:23:31 SGT, the new process reported AI available and maintenance healthy,
with no model operation pending or outcome unknown at initialization. The
first-flow owner selection was retained; worker and push remained unconfigured.
The existing normal epoch/startup maintenance path was used, rather than
ad-hoc Firestore control edits.

## Actual verification

- Account and interest snapshots retained the same hashes across restart.
- Record counts increased during LI's new testing; this is not a claim that
  the complete database was byte-identical. The assistant issued no business
  write request and did not generate or resend a user chat message.
- The local model logged successful `/api/chat` responses at 09:25:12 and
  09:26:52 SGT; no request/response content was collected.
- LI explicitly confirmed **both references off and references on now reply
  normally**. This is bounded user-reported phone evidence for those two modes,
  not a broader AI semantic, UAT or Release acceptance.
- The service remained active/running with no automatic restart after this
  recovery. v30 and its installed signature/permissions remain unchanged;
  no new APK or product test rerun was needed for this environment-only repair.

Sanitized [recovery evidence](../evidence/core-feedback-20261025/v30-ai-runtime-recovery.json)
and the prior [v30 artifact handoff](2026-10-26-shi187-v30.md) retain the separate
source, artifact, runtime and phone evidence. Private local diagnostic receipts
remain under `/home/miku/.local/state/enmori-v30-ai-recovery-20261026/`.
