# LI startup recovery and bounded v36 phone acceptance

The phone now opens ENMORI with its original login. v36 is installed over the
existing group package. The startup Retry action now restarts failed auth
observation, so recovery can return either the real authenticated identity or
the signed-out route. It does not fabricate identity or replay an AI request.

Source: `694bbb3407158c949323494f2160461ea4e22fdb`, based on PR #189 at
`afe06ae9ec97abb2f5c0448501ccc7fd5eb47733`. Backend remains
`44e44a2cc46f08c9f2eed47d3626cc156d469dda`. No backend restart, dependency,
permission, signing identity or API contract change was made.

## Verification

- Both new widget regressions failed before the fix and passed afterwards.
  Full Flutter analysis and 20 focused tests passed. The existing-email
  registration redirect test also fails on the unchanged baseline; it was
  excluded from the final focused run and is not claimed to pass.
- Release APK package, signer, permissions, native Firebase plugin registration,
  non-debuggable state and installed bytes were verified. First installation
  remains 21 October. No application data was cleared.
- Physical phone: prior login/home, cross-date manual reference selection,
  retained draft/selection, return to automatic today, Event search stop and
  continuation, cancelled ticket opening, and browser/detail/list return passed.
  No purchase, participation claim or existing Check-in edit was performed.
- Two warm synthetic execute requests returned HTTP 200 in 28.514 and 26.895
  seconds; the latter assistant reply was verified on screen, with editor and
  references usable afterwards.
- An eight-second mobile-data interruption produced an identity dependency
  failure/503. The original request remained unconfirmed with Send blocked;
  the draft stayed editable and an independent topic retained it without
  resending the original operation. Data connectivity and the temporary
  heads-up notification setting were restored. The host may share the phone's
  connection, so this is not an isolated phone transport test.

## Failed gate and investigation limits

The idle/cold first-send gate failed. The model was unloaded before the send;
empty-prompt preload took about 60 seconds (58 seconds loading). No assistant
reply appeared before the client timed out. A saved user row was subsequently
visible. Warm execution timing indicates that cold preload plus ordinary work
can exceed the retained 75-second execute window. Do not mark this as a
successful cold send or automatically repeat that operation.

The [26 October PM decision](../decisions/2026-10-26-li-v31-recovery-and-state-preservation.md)
explicitly retains 30-minute model residency and client 15/75/90-second limits.
This correction does not silently extend those limits or add background warmup.
Cold-path performance remains unresolved; a policy change needs a new scoped
PM decision retaining this source and its supersession trail.

Initial phone DNS failure was confirmed and recovered after reconnecting
mobile data. The cause of the subsequent original-v33 startup failure was not
conclusively established. The independently reproduced Retry no-op is fixed.
The temporary v34 diagnostic build incorrectly omitted native plugins; v35
corrected build generation, and v36 removes all temporary diagnostics. Do not
attribute the diagnostic-build defect to the original installed v33.

Other-app floating windows and keyboard overlays interrupted automation.
Foreground guards stopped actions outside ENMORI. Four synthetic sends were
performed; the second used the edited synthetic draft after select-all failed.
The final unsent synthetic draft was cleared only after matching its contents.
Private screenshots, raw UI XML, signing/configuration files and logs remain
outside Git. No private message bodies are included in this handoff.

Machine-readable [evidence](../evidence/2026-10-27-li-startup-recovery-v36.json)
separates source tests, artifact, phone checks and remaining failures. Independent
review, full UAT and Release/Done remain open. JIN's provider coverage and PR #190
review corrections remain separate owner work; no teammate was messaged.
