# Product round handoff — 23 October 2026

Base: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`.
Integration: `souma/product-integration-20261023`, target
`souma/li-zhou-runtime-20261020`. The existing integration worktree is unchanged.

| Module | Work branch | Accepted delivery SHA / PR | Contract and current state |
| --- | --- | --- | --- |
| App | `souma/product-app-20261023` | Pending | Profile/Settings draft recovery, explicit review before retry; existing revisioned Account/Settings APIs. Developing. |
| Social | `souma/product-social-20261023` | Pending | My plans from existing own participation reads; cumulative paging, explicit loaded-results filters, eventId navigation. Developing; shared route interface pending. |
| Journal | `souma/product-journal-20261023` | Pending | Existing month/day/record APIs; continuous recorded-date review, retained history pages, authorized map-point preview. Developing; existing entry routes. |
| AI | `souma/product-ai-20261023` | Pending | Small-plan composer from user-entered text, explicit send, existing conversation and Persona preview contracts. Developing; no new data access or streaming claim. |
| Backend | `souma/product-backend-20261023` | Pending | Proven stale process-lock recovery in local launcher; synthetic process identity tests. Developing; no deployment or new API. |

All five role branch heads were the base at startup. The GitHub open-PR search
for `head:souma/product-` returned no delivery PRs at the startup snapshot.
Pending means no SHA accepted into this branch, not an absent implementation.

Shared wiring stays in Integration: `lib/app/router/*`, `app.dart`, global theme,
motion and bottom navigation. App may edit `HomeShellPage` content. Social owns
its Activity/Event components; Journal's narrow map-preview change in
`social_profile_page.dart` is coordinated with Social. Backend additionally owns
the affected `tool/run_real_account_local*` launcher repair for this round.

Execution:

1. Confirm consumer interfaces and preserve account/session/permission fences.
2. Integrate exact delivered commits after ancestry and diff review; wire entry,
   detail, mutation/readback and return paths. Do not import undelivered branches.
3. Reuse module checks, run only composition/conflict/critical-route checks, and
   inspect affected phone-size/dynamic-text/reduced-motion surfaces.
4. Freeze the product commit, build one signed candidate if the existing signing
   path is available without exposing/copying secrets, and record version/hash/
   certificate. Any shared-runtime switch requires its own concrete approval.

Flutter commands use a single advisory lock at the local launch directory's
`flutter-validation.lock`; lock contention returns immediately for coordination.
APK/Gradle belongs to Integration only. Module delivery messages are exchanged
directly using the verified local roster, not inferred from document writes.

Current boundary: no module delivery integrated, no new APK/runtime/device proof.
v24 intermittent AI settings reads and pending-reply cross-page continuity remain
separate unverified findings from the historical checkpoint.
