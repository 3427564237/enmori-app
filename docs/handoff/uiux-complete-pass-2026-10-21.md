# One-prompt handoff: connected UI/UX completion

Copy the following into one new ENMORI chat. Use a separate worktree/branch so the
LI host integration chat can continue runtime work. Do not fork the long chat merely
to copy all history; this prompt and linked repository sources are the context.

---

Continue ENMORI's connected UI/UX completion in one coherent delivery. The user has
confirmed that global UX is core work now, while features are still incomplete.
Read AGENTS.md, docs/tooling/skill-routing.md, ARCHITECTURE.md, applicable existing
contracts, and docs/decisions/2026-10-21-li-history-footprint-chat-feedback.md first.
Follow existing approved deep-green/Playfair HCI design and shared components.

Start from the current remote branch `souma/li-zhou-runtime-20261020` / Draft #165
in https://github.com/3427564237/enmori-app. Fetch and record its exact HEAD before
work; do not start from main or the obsolete v3 ZIP alone. Create a separate managed
worktree and a new `souma/uiux-connected-flows-20261021` branch from that integration
branch. If that name already exists, inspect/reuse only if it belongs to this work.
Preserve existing changes. Do not edit the integration checkout or private host
runtime/signing/Firebase/Tailscale configuration. No need for LI's device or secrets.

Complete the following together in one prompt and one reviewable Draft PR:

1. Separate Check-in History and Footprint as real navigation destinations.
   History shows saved entries, details, existing calendar/date selection, and
   authorized saved weather/location. Footprint shows the approved map nodes and
   chronological point connections, labelled accurately, with each node navigating
   to its exact record. Reuse existing history/calendar/social-map components and
   server projections; support self/friend permissions without fetching hidden data.
   Make the currently misplaced/missing map discoverable. Preserve the five bottom
   destinations; Check-in remains a Home action. Do not invent old GPS/weather data.
2. Finish the Check-in save journey: clear pending/success/failure, understandable
   return/navigation, preserved drafts and same-request recovery without duplication.
   The normal saved-record screen should show the real snapshot, mood/note/activity,
   visibility and relevant actions. Remove confusing presentation of diagnostic
   readback controls from the primary flow while retaining needed recovery paths.
3. Chat: immediate local outgoing bubble after local validation; pending assistant
   ellipsis bubble in the message list; small message-local send/wait/error state.
   Keep the newest interaction visible when the user is at the bottom, and respect
   deliberate reading of older messages. Reconcile local pending with existing
   committed identities to prevent duplicates. Preserve consent, account switching,
   cancellation, outcome-unknown readback, history and explicit retry rules. Do not
   change model prompts, backend authority, provider or AI data permissions.
4. Review the connected Home/Friends/Events/AI/Profile journeys for consistent
   hierarchy, spacing, typography, buttons, bottom sheets, keyboard/back behavior,
   loading vs empty vs error and success feedback. Fix demonstrated local UX gaps
   and unfinished entry wiring within existing capabilities; don't add fake data,
   unsupported features, a new architecture, workflow system or dependencies.

LI owns the v15 false invalid-response fix: guarded POST creation must accept 201,
while idempotent replay returns 200. It is in the integration branch; retain that
fix and don't implement automatic retries to hide failures. Host/API/data/runtime
and final signed APK/device validation remain in the LI integration chat.
If a required projection or approved API is truly missing, record the exact route,
field and blocked interaction, continue independent UI work, and give one bundled
handoff. Do not declare backend-missing until checking current modules and wiring.

Use existing Flutter/Riverpod/Repository structure and the smallest applicable
skills. Verify changed flows with one concentrated affected-test batch and analyze;
retest only actual subsequent fixes. Prioritize meaningful keyboard/back, draft,
save/return, node-to-record and pending-to-committed chat cases. No repeated broad
suite or synthetic fixture-only claim of true device usability. Preview UI with
available local tooling, stating what is real vs fixture vs not run. Do not require
a phone before implementing and reviewing work possible locally.

Deliver code, a concise before/after journey checklist, required backend issues
(if any), exact base/head and actual checks, then push and open one Draft PR with
base `souma/li-zhou-runtime-20261020`. No main merge, public publication, service
restart, credential access or whole-project Done claim. Keep the work coherent;
do not split it into many prompts or wait for per-widget approvals within this scope.
