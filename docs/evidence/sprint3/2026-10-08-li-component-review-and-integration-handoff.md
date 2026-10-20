# LI current component review and integration handoff

Date: 8 October 2026, Asia/Singapore. Operator: LI's delegated Codex agent. Publication requested within completion of LI's current tasks; no merge or board change is performed.

## Observed inputs and controlling outcomes

Remote main stayed `f46a903cb5b339365ac2024004b32b7b96b99e7c`. The following heads were fetched and refreshed before review/publication; each PR was Open/Draft.

| Component | Exact head | Current disposition |
| --- | --- | --- |
| My Friends #61 | `5bdbcf8d61e0d84ba13e2146167db48704a1e7ae` | SHI source Approve 5453097326; both R1/R2 threads resolved. LI [scoped component evidence acceptance](../../decisions/2026-10-08-li-my-friends-isolated-component-acceptance.md) recorded; shared integration/merge pending |
| DU history #64 | `32b443b022878859aba0641a1847f1e3bb1fd855` | LI [formal Changes Requested 5457554482](https://github.com/3427564237/enmori-app/pull/64#pullrequestreview-5457554482), three focused findings; no component acceptance |
| Persona #65 | `885dbcc87fe8574265014eb4305c49fc0950daa3` | No formal implementation review observed. JIN's exact-head review pending; LI scoped acceptance pending. Owner 348/348 and Emulator 64/64 are owner-attributed, not LI executions |

Sources: [approved history physical A](https://github.com/3427564237/enmori-app/blob/ddc4376beddec5ba5673db99024d0bbaa9da20ec/docs/decisions/2026-10-07-li-history-physical-option-a.md), [approved DU contract](../../planning/2026-10-07-du-history-physical-contract-proposal.md), [Persona Backend-only approval](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md), [Persona task #63](https://github.com/3427564237/enmori-app/issues/63), and the My Friends sources retained in the acceptance record. Earlier Pending/Not Run text remains historical where a specifically attributed new record supersedes it. No later report overrides source authority.

## Independent execution on immutable component heads

Node 24.19.0 was selected from the existing local pnpm runtime cache, not ambient Node 26.10.0. Pinned pnpm 11.19.0 acquired locked project packages. Flutter 3.47.2/Dart 3.13.2 used the existing FVM SDK. No tracked dependency/lock or global SDK changed. Tests on the two heads were separate, not a merged tree.

| LI check | #64 at 32b443b | #61 at 5bdbcf8 |
| --- | --- | --- |
| Direct Node 24.19.0 `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass | Pass |
| Direct Node 24.19.0 `node --test 'backend/dist/test/**/*.test.js'` | 323/323 Pass; zero failed/skipped/cancelled | 321/321 Pass; zero failed/skipped/cancelled |
| Actual isolated Auth/Firestore Emulator suite | 39/39 Pass, including 5/5 synthetic counts-only audit and history pagination | Not rerun by LI in this assessment; earlier owner/SHI evidence retains its source |
| `fvm flutter pub get --enforce-lockfile --offline` | Pass, tracked locks unchanged | Existing identical locked Flutter manifest/package resolution reused |
| `fvm flutter test --no-pub --reporter expanded` | 157/157 Pass | 222/222 Pass |
| `fvm dart analyze --fatal-infos lib test` | Pass, no issues | Pass, no issues |
| `git diff <base> <head> --check` | Pass | Pass |
| LI Android/device execution | Not Run | Not Run; JIN's current-head API 36 1/1 execution and readback inspected as owner evidence |

The #64 Emulator command used Node 24.19.0 directly on pinned `node_modules/firebase-tools/lib/bin/firebase.js` with `emulators:exec --project demo-enmori-rmvp01a-r10 --only auth,firestore --config firebase.json '<pinned-node> backend/scripts/run-emulator-tests.mjs'`. The CLI had a fresh temporary credential profile, no copied ambient credentials, explicit existing Emulator cache, loopback endpoints and JDK **25.0.4.1**. The unchanged repository runner filtered the actual child environment and validated demo-only/test-mode isolation. Exit 0; Auth/Firestore services stopped, both 8080/9099 were clear and the temporary profile removed. This does not certify production index availability or another dataset.

Initial `pnpm dlx pnpm@11.19.0 install --frozen-lockfile` and a subsequent scripted build launcher returned `ERR_PNPM_IGNORED_BUILDS` for `@firebase/util`, `protobufjs` and `re2`. Locked packages were installed but lifecycle scripts were not approved. Direct compiler/test equivalents above then passed. The generated untracked pnpm workspace metadata was removed; no source/manifest/lock change remained. These launcher failures are retained as environment failures, not product passes. Android preflight `adb devices -l` showed no attached device; no credential retrieval or live runtime was attempted.

## DU findings and additional diagnostics

The ordinary green suites do not exercise the failing boundaries below. Reviewer-only probes were saved outside tracked product files (`/tmp` and ignored `build/li-review/`), and no product fix was made.

| Finding | Source boundary | Reproduction and result |
| --- | --- | --- |
| R1 / P1 | `controlled-runtime.ts` unconditionally injects history into the real controlled-demo Firebase runtime. Approved first scope is synthetic Emulator-only, with separately required real-target audit/access/index gates | Source trace confirms controlled runtime forbids Emulator project/endpoints. Fake authenticated `buildApp` with the history dependency and no isolated environment returns 200; without that dependency returns unregistered-route 404. Required exclusion assertion fails |
| R2 / P2 | `parseCivilDay` treats Temporal recognition/unchanged timeZoneId as sufficient | Real use case with fake Ports accepts `EST`, `MST`, `CET` and accesses repository, although contract/OpenAPI reject abbreviations. Three rejection assertions fail; Asia/Singapore control passes |
| R3 / P2 | `_parseHistory` checks Note String type only | Real BackendCheckInRepository through UTF-8 HTTP mock accepts empty, whitespace-only, 501-grapheme and outer-whitespace Notes. Four rejection assertions fail; valid normalized Note succeeds. Existing Check-in projection requires already normalized 1–500-grapheme Note |

Node probe: 2 valid controls Pass / 4 expected rejection/exclusion assertions Fail. Flutter probe: 1 valid control Pass / 4 expected rejection assertions Fail. Existing current source, approved input/value rules, minimal reproductions and working controls establish the root causes before any correction recommendation. Repository Backend/Flutter review and systematic-debugging Skills were applied within approved project authority.

Minimal R2 reproduction after compiling the pinned #64 head, from its repository root:

```javascript
import { ListOwnCheckInsForDate } from './backend/dist/src/check-ins/application/check-in-history.js';
const uc = new ListOwnCheckInsForDate(
  { listForDate: async () => ({kind: 'page', accountId: 'synthetic', rows: []}) },
  { decode: () => undefined, encode: () => 'unused' },
  { now: () => ({ok: true, value: new Date('2026-10-08T00:00:00.000Z')}) },
);
for (const timeZone of ['Asia/Singapore', 'EST', 'MST', 'CET']) {
  const result = await uc.execute({
    principal: {firebaseUid: 'synthetic'}, date: '2026-10-07', timeZone,
  });
  console.log(timeZone, result.ok); // actual: true for every entry
}
```

R3 probe body, using the real repository/client and MockClient. Save in ignored `build/li-review/history_parser_probe_test.dart` and run `fvm flutter test --no-pub --reporter expanded build/li-review/history_parser_probe_test.dart` at pinned #64:

```dart
import 'dart:convert';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Future<Result<CheckInHistoryPage>> read(String note) async {
  final client = BackendApiClient(Uri.parse('https://example.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient((_) async => http.Response(jsonEncode({
      'checkIns': [{'checkInId': 'synthetic', 'note': note,
        'createdAt': '2026-10-07T01:00:00.000Z'}], 'nextCursor': null,
    }), 200, headers: {'content-type': 'application/json; charset=utf-8'})));
  try {
    return await BackendCheckInRepository(client).readOwnForDate(
      date: '2026-10-07', timeZone: 'Asia/Singapore');
  } finally { client.close(); }
}
void main() {
  test('valid normalized Note', () async =>
    expect(await read('Valid synthetic note'), isA<Success<CheckInHistoryPage>>()));
  final bad = {'empty': '', 'whitespace-only': '   ',
    'overlong': List.filled(501, 'a').join(), 'unnormalized': '  n  '};
  for (final entry in bad.entries) {
    test('reject ${entry.key}', () async =>
      expect(await read(entry.value), isA<Failure<CheckInHistoryPage>>()));
  }
}
```

DU returns one correction/regression/evidence packet addressing R1–R3 and requests LI re-review at its new head. Approved contracts and preparation acceptance remain; no silent migration, new dependency or unrelated redesign is requested. Missing Android, live-index and real-target evidence remain separately Not Run.

## Integration preflight and next accountable work

`git merge-tree --write-tree` was executed on the exact pairwise heads. It writes diagnostic Git objects only; no working-tree merge, conflict resolution or combined build occurred.

| Inputs | Reported content conflicts |
| --- | --- |
| #61 + #64 | `api/openapi.json` |
| #61 + #65 | `api/openapi.json`, `backend/src/transport/route-inventory.ts` |
| #64 + #65 | `api/openapi.json`, `backend/src/bootstrap/build-app.ts` |

Textually auto-merged files are not proof of semantic compatibility. Combined-tree compilation, tests, Emulator and Android evidence remain **Not Run**. Retain the exact union of separately approved routes/schemas; history must preserve the approved isolation boundary after R1, alongside existing Friend and Persona guards. The #65 supporting packet's suggestion to retain #64's controlled-runtime path cannot override the history approval or LI finding.

- JIN: independently review #65 at `885dbcc87fe8574265014eb4305c49fc0950daa3` against #63 and unchanged P01–P03/Backend isolation authority. PC11–PC13, client PC14 and Persona Android are outside the approved Backend-only delivery. Report actual findings and evidence attribution; owner 348/64 passes are not independent approval.
- DU: return R1–R3 corrected head and evidence to LI. Account for Android build/device limitation in actual 11 October feasibility; no generic restart/provisioning blocker replaces a concrete report.
- LI: #61 component evidence assessment is complete; #64 re-review follows the focused return; #65 acceptance follows JIN review/reconciliation. Resolve and validate a concrete authorized integration candidate only after its required component gates; JIN supplies the new combined gate, LI reviews it independently. No old combined gate is reused as proof of the new tree.

Keep all implementation PRs Draft/Open and #44 Open/Backlog; no Issue/Project transition, source merge, real-account/provider/demo activation, full route/module/Sprint/UAT/Release acceptance or automatic scope reduction. Existing preparation Done and 42-route/38-state/11 October target remain. Any unfinished original target requires explicit LI scope disposition using actual owner feasibility reports.
