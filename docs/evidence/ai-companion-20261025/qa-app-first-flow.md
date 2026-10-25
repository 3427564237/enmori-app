# QA — F0 recovery and composed routes

25 October 2026. Independent focused widget review of frozen Integration
`92c63423857e45ff8d76f18a2c238099f11c2cb0`, containing App baseline `d893d2d`
and recovery repair `be0a7b16fcf1b7324512a78c0dea24a4af1fe687`.

The repair adds separate read-only recovery buttons when the first settings or
active-intent GET fails. The form preserves its chosen time and confirmation;
successfully rereading prerequisites enables the explicit action without
saving settings or creating an intent automatically.

Integration assigned QA the exclusive Flutter slot for the two original
recovery counterexamples, three new route cases and necessary source guards.
QA used `git archive`, the existing package configuration and lockfile, and
`fvm flutter test --no-pub` under the global nonblocking
`flutter-validation.lock`. There was no package resolution, Gradle or APK run.

**8/8 independently executed widget cases passed**:

| Scope | Observation |
| --- | --- |
| Failed first settings GET | In-page reread preserves date, time and confirmation; zero settings saves/intent creates. |
| Failed first active-intents GET | Same preservation and explicit-action boundary; failure is not an empty active list. |
| Candidate disabled | Companion routes are absent; no proactive HTTP request occurs. |
| Source navigation/session identity | A source extra from the old session cannot survive same-UID session replacement or be reused to reopen the form. |
| Missing source / settings navigation | Missing source stays unavailable. Explicit navigation to settings issues only GETs. |
| Source retirement | Source text disappears, a late time-resolution result is ignored and no intent is created. |
| Form session replacement | Old source/form controls disappear; no settings save or intent create occurs. |
| Narrow Chinese large text | At 320 px width and 2x text scale, the source and explicit scheduling controls remain reachable and hit-testable without framework exceptions. |

The two recovery cases use the ordinary-size fixture; the separate narrow case
does not establish every error-button layout under every viewport. The tests
use approved fake repository/HTTP/time boundaries. They do not prove the native
timezone channel, real backend, notification delivery or device usability.

Private evidence:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/app-root-92c6342/`.
`command.json`/`result.json` bind the exact source, test names, command and
existing package configuration. The command exited 0; `flutter.log` SHA-256 is
`74735a3f116ead6d89ca716117e767bdcbaea4cfa76f794563668903098670d5`.
The preserved `pubspec.lock` SHA-256 is
`523dfbacd19c0d6e3c33fe9e6e46606ec62f8939bc78f7013810a01d5feb8a96`.
QA returned the slot immediately after completion. The author's wider test
counts remain author evidence and are not added to these eight checks.

## Separate daylight-saving fold repair

Product found a second P2 at the earlier App head: rejecting the entire time
resolution when any candidate was past also rejected a still-future candidate
during a repeated civil-time hour. QA reviewed repair
`16e1923bc3041d6384e59d702da5cd8623f4b6f3` and, in a new exclusive slot,
independently passed only its **2/2** targeted widget counterexamples.

With synthetic Berlin 02:30 candidates at UTC 00:30 and 01:30, and a controlled
clock at UTC 00:45, both choices remain visible, the elapsed choice is disabled
and labelled, and neither is selected by default. The future candidate requires
explicit selection and confirmation before the fixture records its exact UTC
instant. When the clock is after both candidates, the page rejects them. Source
inspection also confirms the selected instant is checked again on submission.

This used the same pinned lockfile and `fvm --no-pub`/global flock workflow, with
no rerun of the previous eight cases. Private evidence is in
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/app-16e1923/`;
the command exited 0 and the log SHA-256 is
`d5aaa1e96a75bbdfc7f8198a8af4ec5ebd6f95efa536332c05e02834da88ac49`.
The slot was returned. These are widget results using a fake time port, not
independent execution of Android's timezone database or a physical device.
