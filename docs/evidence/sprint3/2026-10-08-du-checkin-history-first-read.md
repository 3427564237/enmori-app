# DU Check-in history first-read evidence

**Status:** Focused implementation is prepared for independent LI review; Android product execution and APK evidence remain Not Run.
**Decision:** `S-PM-1007-LI-HISTORY-PHYSICAL-A` (LI approved option A at the exact reviewed contract head `f075c0f11dc50ce58e4116d53d794fa53f4f26d4`).
**Implementation base:** `f46a903cb5b339365ac2024004b32b7b96b99e7c` (`main` at the time of checkout).
**Target:** isolated `demo-enmori-rmvp01a-r10` Auth/Firestore Emulator only.

## Synthetic timestamp audit

Named dataset: `S3-04-history-audit-2026-10-08`, seeded only inside the existing resettable Auth/Firestore Emulator fixture harness. The audit paged the full `check_ins` collection by document ID with page size 2. It emitted aggregate metadata only; no Note, document ID, path, cursor or raw record was printed. The test harness reset Auth and Firestore after execution.

```json
{
  "total": 5,
  "string": 5,
  "canonicalFixedMillisecondUtc": 5,
  "otherStringFormat": 0,
  "nonString": 0,
  "years": { "2026": 5 },
  "pages": 3,
  "pageSize": 2,
  "coverage": "5/5",
  "passed": true
}
```

This proves compatibility only for the five explicitly named synthetic records in this isolated test. It is not evidence about any real-user, controlled-demo or deployed datastore.

## Implemented

- Authenticated `GET /v1/me/check-ins` with required `date` and IANA `timeZone`, optional encrypted opaque cursor and a fixed 20-row page.
- Temporal civil-day bounds use the exact pinned Backend-only `@js-temporal/polyfill@0.5.1`; canonical fixed-millisecond UTC storage/query/cursor values, DST and skipped-day behavior, and four-digit UTC year boundaries are checked.
- A Check-in-local read-only Firestore query port revalidates UID binding and Account inside each transaction, orders by `createdAt DESC` then document ID DESC, reads at most 21 matching rows, fails closed on malformed rows, and does not query Check-ins for a valid skipped date.
- AES-256-GCM cursor uses a process-local 32-byte CSPRNG key, binds owner/date/zone/range/last tuple, and keeps the first-page-anchored 15-minute expiry. Restart invalidates the cursor and requires a fresh first page.
- Added the approved composite index source only. No index deployment or runtime promotion was attempted.
- Flutter has a strict history response parser/repository method and Android obtains the device IANA zone from the platform. No new history UI screen or visual behavior was introduced in this increment.
- Responses are `Cache-Control: no-store`; public failures reuse the approved error catalogue.

## Verification

Toolchain used: Node.js 24.19.0, pnpm 11.19.0, Flutter 3.47.2, JDK 21.0.12.1.

| Check | Result |
|---|---|
| Backend TypeScript compile | Pass |
| Backend unit/contract/transport tests | 323/323 Pass |
| Isolated Auth + Firestore Emulator suite | 39/39 Pass, including the 5/5 compatibility audit and authenticated 20+1 history pagination |
| Flutter analyze | Pass, no issues |
| Flutter tests | 157/157 Pass |
| `git diff --check` | Pass |
| Debug APK build | Not Run successfully. `flutter build apk --debug --no-pub` failed at `:app:validateSigningDebug` with `AccessDeniedException` on the temporary `debug.keystore.lock`, including after isolating Android/Gradle homes and a local elevated retry. No APK artifact was produced. |
| ADB device | Not Run: `adb devices -l` returned no attached devices. |
| Device history flow/screenshots/semantics | Not Run |
| Deployed compound index / runtime data | Not Run; not authorized by this decision |
| UAT / Release / Done | Not Run |

The Android build and physical-device evidence are not inferred from Backend/Flutter tests. The Emulator does not validate deployed compound-index availability. The history UI and real-device flow remain follow-up work; no live data or credentials were accessed.
