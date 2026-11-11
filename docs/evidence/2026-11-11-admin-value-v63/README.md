# Admin value increment — local integration and v63 candidate

Authority: [LI's approved decision](../../decisions/2026-11-11-li-admin-value-integration.md), accepting the [concrete contract](../../planning/2026-11-11-admin-value-contract-proposal.md). The [API boundary](../../../api/admin-operations-contract.md) records the implementation and rollout constraint.

## Delivered behavior

- Profile → Administration opens Runtime status, Interest tags, Event categories and Operation records.
- Runtime status reads existing process observations. It does not dispatch AI/provider work. Unseen/stale source state remains unknown; onePA cache hits do not fabricate fresh success. AI readiness is not generation success.
- Event categories support create, rename, deactivate, restore, search and lifecycle filters. An authorized administrator can assign or clear a category on an existing accessible Event. Source category text remains separate. Returning from classification rereads the owning detail.
- Effective Interest, Event Category and assignment mutations append one minimal verified-actor record atomically. No-op/failed attempts do not become committed records. Reads expire at 30 days independently of bounded startup/hourly cleanup; failed maintenance is visible. Connected permanent deletion remains disabled.
- New frontend writes require independent readback. An unknown result stays locked through capability refresh and failed reads. Session replacement clears drafts/data and invalidates old confirmations.

## Verified source boundaries

Implementation commit: `0c9d22dcdf9a2bc8c0fcd4b7b8781cd551e72a67`.
Candidate source including the portable preview-harness fix: `7d0b67f02151e491271f53f4c563e0655c11bf88`.
Preserved demo development parent: `2603656366ad250ecf0e4f6aa7e015e8dcb47d99`, including the v62 discovery-profile and Friend Activity source-preparation changes.

| Check | Result |
| --- | --- |
| TypeScript compilation | Passed on the merged source |
| Complete Backend unit/contract suite | 1,868 / 1,868 passed |
| Directed Flutter suite | 180 / 180 passed across 16 files, including existing Interest management, Event presentation/navigation and the v62 regressions |
| Complete Flutter analysis | No issues found |
| Guarded Firestore/Auth Emulator suite | 6 / 6 passed |
| Widget visual/layout checks | Both languages, narrow screen, light/dark, 2× text and keyboard viewport; 10 optional preview frames rendered |

The Emulator checks cover concurrent name/revision conflicts, inactive-assignment races, atomic rollback on audit failure, real query pagination/expiry/cleanup and current Auth role/disabled state. They use only the guarded `demo-enmori-rmvp01a-r10` fixture; they are not production Firestore or scheduler acceptance.

[Chinese management home](zh-home.png), [Chinese categories](zh-categories.png), and [English classification](en-classification.png) use production widgets with synthetic data and host test fonts. These are desktop-rendered widget evidence, not screenshots from a physical phone. The status preview intentionally uses a reduced synthetic service set; the real wire contract requires five services.

## Artifact and integration

The signed release build succeeded. Package `com.enmori.app.group`, versionCode **63**, versionName `1.0.0-demo20261111`; `apksigner verify` confirmed the original group certificate. APK: `/home/miku/Downloads/ENMORI-admin-v63-release.apk`, SHA-256 `75939653a622f9f7c0b52e3298bd396a7759e1d37ca949e41cfcc12d802a98f3`.

The source was fast-forward merged into local `souma/demo-ready-20261111`, preserving the complete v62 parent. [Machine-readable verification](verification.json) records the exact source, artifact, integration and log hashes. Evidence-only commits do not alter the built application. Credentials/signing material remain outside Git. No package or lockfile changes are introduced.

The first `--no-pub` release attempt retained a development-only integration-test plugin registrant. Inspection of the installed Flutter tooling confirmed that `--no-pub` skips release-mode plugin regeneration. The final build enables the standard regeneration path; no dependency or product-source workaround is used.

## Remaining runtime boundary

No deployment, phone installation, real catalogue/association mutation, role grant, paid model probe, remote-main merge or teammate message is part of this task. A signed build does not prove login retention or physical-device journeys. Full Flutter-suite, live-service, real cleanup timing, independent review, dual-device, iOS, UAT and Release acceptance are not claimed.

Before the first real Event assignment, coordinate the updated APK with the Backend deployment: older strict version-3 APKs reject a populated `managedCategory` field. This candidate has no real assignments and preserves existing data. Physical audit cleanup within 24 hours remains a target awaiting real-runtime evidence.
