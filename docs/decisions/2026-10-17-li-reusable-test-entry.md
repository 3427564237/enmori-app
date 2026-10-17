# PM decision — reusable Tailscale test entry, execute without scheduling gates

- Source ID: S-PM-1017-LI-REUSABLE-TEST-ENTRY.
- Authority: LI HOURUI / ENMORI PM; confirmed 17 October, clarified 18 October 2026, Asia/Singapore.
- Status: confirmed direction; actual connection and business results remain to be demonstrated.
- Latest confirmation: “我们不需要窗口和约定直接执行就行了，我说过无数次了不需要这么工程化”.

## What changes

The latest instruction explicitly supersedes the mandatory service-window, SGT appointment, expiry and three-person coordination prerequisites in [the earlier record](https://github.com/3427564237/enmori-app/blob/1a0731420c3009e11b0360d5620eca20745a6720/docs/decisions/2026-10-17-li-reusable-test-entry.md). The old 17 October 22:27–22:57 record remains historical; no replacement window is required. Its expiry must not block new work. Remove mandatory window arguments/checks from the reusable entry and its instructions; determine usability from current service/connectivity/configuration state instead. This does not remove real request timeouts or current configuration/lifecycle checks.

Preserve [the existing owner and independent-review allocation](2026-10-16-li-low-blocking-kickoff.md): JIN builds and maintains the entry, LI operates the Linux host, and SHI independently tests. First deliver the reusable entry; do not transfer all testing to LI.

## Execute the small delivery

Proceed with JIN's [concrete minimal proposal](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235109065): two private Tailscale raw-TCP forwards for the current Backend TLS port and Auth9099, plus corresponding Windows loopback byte forwarding and the existing ADB reverse/handoff. This is the bounded connection adaptation within the existing Tailscale arrangement; do not wait for another appointment or repeat approval of this same small proposal. Keep access limited to the authorized test operators/devices. Preserve the original APK, TLS trust, existing HTTPS443 route and private credential boundaries. No public exposure, new account/identity or unrelated infrastructure is authorized.

JIN supplies practical startup, connection-check and private-configuration handoff steps, scripted where useful, and fixes entry defects. The steps identify Linux-side and SHI-side actions. SHI can run ordinary startup without JIN and LI both being present. LI keeps the host available while executing the current test work; this is not a promise of permanent uptime.

Use current valid configuration and real runtime state. An expired session, an unresolved original invocation or a held/unknown model operation cannot be bypassed merely to obtain a passing connection. Starting the approved controlled service for actual testing is part of this task once those conditions are met; do not restore an obsolete demonstration solely for rehearsal. Credentials/configuration remain in the existing private handoff, not GitHub.

## Acceptance and remaining work

The acceptance criterion is now: **SHI can follow the supplied instructions, connect to the currently available Linux Backend/Auth and independently begin an assigned business test, without an appointment or a simultaneous three-person conversation.** Actual results establish this; scripts, an installed APK or open ports alone do not.

JIN's new code remains independently reviewed by SHI. LI independently checks JIN's evidence and reviews ZHOU's new work. Completed APK receipt/install/readback and #135/#136/#137 reviews are not repeated. Real business, model and platform outcomes remain separate, truthful records. This document does not merge PRs, close Issues, change the board or claim whole-application/Sprint/UAT/Release acceptance.
