# v44 overview introductions removed

Authority: [29 October PM decision](../../decisions/2026-10-29-li-event-overview-without-introduction.md).
Implementation: `2218c86`.

Home recommendations, Events and saved-plan overview cards use the shared EventCard, which now omits both description excerpts and missing-introduction placeholders. This applies whether the source supplies/caches a description or not. Existing cover, name, Singapore time, venue, source, pricing/status/deadline, recommendation reason and actions remain. No per-card detail requests or Backend changes were added.

The default ParticipationEventPage detail renderer now uses EventInformation so removing overview content cannot remove the description from detail when no custom renderer is injected. Existing production-root custom detail rendering and independent official actions remain.

Validation:

- 31 existing focused card, event information, participation-component and browse tests passed, including small-screen/large-text navigation and card action separation. The card test checks both present and absent source introductions remain hidden.
- Two official-information action tests passed using the actual default detail renderer, asserting the full description remains present and both providers open their exact official URL without participation writes.
- `flutter analyze --fatal-infos`: no issues.

The signed v44 build and physical installation are separate checks. At source-test completion ADB reported no connected device; no physical acceptance is claimed by these tests. The existing controlled Backend remains on its verified `229d333` snapshot.

Signed release build passed in 142.9 seconds. Delivery: `build/group-delivery-v44/ENMORI-group-v44-release.apk`, package `com.enmori.app.group`, versionCode 44, versionName `1.0.0-group20261029`. APK SHA-256: `a7a3ce3ccca15d362a50b3ccd8b7b604200d2e05937cc2b934f7ce1f579c98a1`. The APK signature verifies and matches v43, allowing an ordinary in-place upgrade. ADB remained empty after packaging, so this build has not been installed or physically verified.
