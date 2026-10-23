# Product expansion round 2 — 23 October 2026

Authority: [confirmed PM scope](../decisions/2026-10-23-li-product-round2.md).
Previous round and calendar repair close at
`58e8e06f71cc888007d7fde1ec1aa8a0bc52f480`.
The initial commit containing this index and the decision is the common round-2
baseline; Integration records and dispatches its exact SHA after committing.

Integration branch: `souma/product-round2-integration-20261023`.
Module PR target: that integration branch. Integration PR target:
`souma/product-integration-20261023`. All new PRs are Draft; no main merge.

| Module | Existing chat ID | New branch | Capability / consumer / interface | Delivery SHA / status |
| --- | --- | --- | --- | --- |
| Integration | `01a1689a-d9ea-7cd0-82cc-8da9d0d1770f` | `souma/product-round2-integration-20261023` | Shared routes, composition and final candidate | Baseline preparation |
| App | `01a1689b-0799-7550-a624-e44ec1aa3081` | `souma/product-round2-app-20261023` | Audit and select; Home/Profile/Settings; reuse module sources | Pending dispatch |
| Social | `01a1689b-0dd3-7560-b85b-25100b4a02eb` | `souma/product-round2-social-20261023` | Audit and select; Friends/Events; coordinate consumers | Pending dispatch |
| Journal | `01a1689b-1662-7f13-bc79-b5ffeeadd284` | `souma/product-round2-journal-20261023` | Audit and select; Check-in/History/Footprint | Pending dispatch |
| AI | `01a1689b-1e74-7c10-8268-48613e5c668c` | `souma/product-round2-ai-20261023` | Audit and select a supported non-small-plan capability | Pending dispatch |
| Backend | `01a1689b-274c-7173-a559-90cd40e96985` | `souma/product-round2-backend-20261023` | Named frontend consumer support only | Pending dispatch |

Owners preserve their old branch, verify the common baseline includes accepted
round-1 delivery, and protect any dirty work before branching. Keep one source
for preferences and business facts. Report selected capability, how it differs
from existing behavior, consuming screen, interface needs and a short acceptance
path early; continue independent implementation instead of waiting for routine
approval. New authority-sensitive behavior remains scoped for review.

Flutter validation is serialized with
`/home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock`;
Integration owns Gradle/APK builds. Deliver exact commits, bounded check results,
remaining limitations and new Draft PR links. Integration accepts only reviewed
deliveries and tests composition and critical return paths.

The prior 19 targeted calendar/transport checks passed; calendar deployment and
phone verification remain not run. The 58-probe AI relevance diagnosis remains
unsuccessful, and further small-plan tuning/model probes are stopped. No source
or fixture result is reported as real AI/device acceptance. No shared runtime,
real data, phone, signer or infrastructure is changed during this round.
