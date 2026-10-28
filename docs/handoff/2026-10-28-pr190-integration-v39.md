# 28 October — reviewed recommendations integrated into v39

LI requested progression of the current integration, then chose manual phone
testing and requested the APK. See the [execution boundary](../decisions/2026-10-28-li-pr190-integration.md).

## Source and review

Base: v38 `3ac2230766ac41dc980294babf2374a2e0ad1d39`.
Incoming: JIN #190 `127943d292c3e9e42346989ef6041c5a7e305c39`, verified current
with ZHOU's [APPROVE 5668581504](https://github.com/3427564237/enmori-app/pull/190#pullrequestreview-5668581504).
All three original threads are resolved by ZHOU; the old failures remain.
Combined source/build: `0c8efb7deae33ac78656fc3404d8ba633e71f4bb`.
The merge preserves both parent histories. This is a local integration commit,
not a GitHub main merge or independent approval of LI's new composition.

Three textual conflicts were resolved by retaining both changes: complete
venue address plus classification/region projection, corresponding internal
occurrence fields, and recommendation reasons plus foreground-return refresh.
Automatic shared-file merges were inspected for avatar and opt-in-address
retention. A new combined projection/HTTP test proves full address and Dance/
region metadata coexist, while internal recommendation metadata stays out of
the public Event Detail DTO.

## Actual validation

- Strict Backend compile and full offline suite: **1,585/1,585**, no skipped cases.
- Five recommendation Flutter files: **56 passing**. The command also named a
  nonexistent `event_recommendations_test.dart`, so its overall exit was 1;
  that loading failure is retained rather than labelled a green command.
- Correct recommendation-page file, interest controller/page/session, native
  Event actions and foreground refresh: **38/38**, exit 0. These files are
  disjoint from the first five files.
- Full Flutter analysis: no issues. Dependency manifests/locks unchanged.
- Isolated real Firebase Auth/Firestore Emulator SDK: **1/1**, successful outer
  exit, owned profile removed and five ports confirmed free. This is not a
  real-account or phone result.
- Release APK build: successful, 81.1 seconds. Signer/package and all nine
  permissions match v38; non-debuggable. No device installation was attempted.

The earlier v37 full Flutter run retained 73 baseline failures. This run does
not claim a green full Flutter suite or repeat unaffected AI/phone acceptance.
Author/reviewer counts are not added to these LI execution counts.

## Live provider read

At 28 October 2026 10:55 SGT, the existing permitted SG provider returned five
pages, 85 raw occurrences and 79 eligible projected Events in 2.36 seconds.
All pages reported 85. Current interest-derived matches: Music 59, Gaming 4;
all other existing tags 0. This is an observed traversal, not an upstream
cross-page snapshot guarantee. No private account/profile data was changed.

The returned classification taxonomy contains the implemented conditions for
Film, Fitness, Dance, Food & Drink, Fine Art, eSports, Community/Civic and Music.
Books/Literary, Travel, Photography, Technology, Outdoor Recreation and
Volunteering conditions were not found in that taxonomy response. Current empty
SG matches and absent source conditions are separate limitations; do not claim
14 populated categories or fabricate alternative sources. Region/social signals
may still truthfully qualify an Event independently of an interest match.
None of the 79 projected events supplied the required complete address. The
existing disabled-map protection remains applicable; no partial address fallback.

[Provider counts](../evidence/2026-10-28-pr190-integration-v39/provider-coverage.json),
[verification](../evidence/2026-10-28-pr190-integration-v39/verification.json),
[APK identity](../evidence/2026-10-28-pr190-integration-v39/candidate.json) and
[local log hashes](../evidence/2026-10-28-pr190-integration-v39/logs.json) retain
exact evidence. Raw logs, private configuration and signing material are not
committed. The one-off provider probe logs only aggregate coverage.

## Manual installation and check

APK: `build/group-delivery-v39/ENMORI-group-v39-release.apk`.
Package `com.enmori.app.group`, versionCode 39, versionName
`1.0.0-group20261028`. Install over the existing group app; do not uninstall or
clear data. Retains the existing account and signing identity.

1. Open Home and All Events recommendations; verify ranking and displayed reasons.
2. If desired, save a different interest selection and check that recommendations
   refresh. Music and Gaming currently have actual matching source events;
   zero matches in other tags are a source limit, not evidence of a stuck list.
3. Open all suggested friends; use Next/Previous where more than two candidates
   exist, and confirm exhaustion is explicit. Do not infer missing candidates.
4. Return from Event/browser pages and check the existing state/refresh behavior.

LI performs these real-account decisions and phone observations manually. This
run does not change consent/privacy/interests/participation, generate AI replies,
start a worker, perform a two-account journey, close Issues, publish a release,
or claim UAT/Release/Done.

## Controlled service receipt

The existing service completed a normal stop/start with the frozen combined
source at 28 October 2026 10:58 SGT. Configuration bytes and dependency versions
are unchanged; the previous candidate and prior drop-ins remain available.
Firebase Auth/Firestore readiness passed, AI maintenance is healthy with no
pending/unknown model work at startup, Events are enabled, and worker/push
remain disabled. No chat generation was requested by this verification.

Both local recommendation routes reject anonymous requests with 401. The APK's
configured HTTPS endpoint also responds 401 to anonymous onboarding, confirming
reachability and the identity gate. An initial probe used a nonexistent Friend
URL and got 404; the corrected actual route returns 401. These probes are not
an authenticated recommendation or physical-device result. See [service receipt](../evidence/2026-10-28-pr190-integration-v39/service.json).
