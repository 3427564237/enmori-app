# QA — Settings readiness and fixture diagnosis

25 October 2026. Independent bounded diagnosis of Integration's frozen shared
composition `60f110571177b3758f25056c0d3b7c39fbce533f`. Integration reported that
its two sign-out tests reached the actual Settings route but needed bounded
pumps after `pumpAndSettle` timed out. Those callback tests did not establish
Settings readiness. QA was assigned an exclusive short Flutter window to
resolve that observation separately from D1's unknown-mutation repair.

QA made two private tests from the actual `ControlledDemoApp` fixture, changing
only whether D1 had a null installation or a configured fake messaging port with
an empty initial delivery reference. Both used the real Settings controller and
HTTP adapter with the same synthetic successful onboarding/settings responses.
Neither called sign-out, permission, token acquisition or registration. The
tests required `PreferencesPhase.ready`, the saved-preferences text, settled
frames and no mutation/registration request.

## Preserved observations and diagnosis

The first tool attempt stopped before any test because the private no-pub
archive lacked the generated `package_graph.json`. QA copied that file from
the existing pinned environment with the same unchanged lockfile. No package
resolution or production change was made; the failed attempt is retained.

The first executed pair failed only at `pumpAndSettle`. Both cases had already
reached `PreferencesPhase.ready`, foreground true, the saved-preferences text
and zero circular loading indicators. Only onboarding and account-settings GETs
were recorded. Thus the evidence did not support a D1-specific or account-form
loading failure.

A bounded diagnostic of those same two cases identified exactly one active
ticker in each: `LinearProgressIndicator` under `AppLanguageControl`. The
existing language repository was waiting on its native preferences channel,
which the shared router fixture had not mocked. The diagnostic log retains the
ticker creation stack and ancestor chain. Its two readiness passes are the same
cases under diagnosis, not two additional product acceptance cases.

QA restored the original readiness and `pumpAndSettle` assertions and supplied
only a read-only `PlatformAppLanguageRepository.channel` test handler returning
`en` for `readLanguage`. This matches the already established language-router
fixture boundary; any language write would fail the test. Both cases then
passed, **2/2**, with no scheduled frames, one language read, only the two GETs
and zero registration or mutation requests. Production files remained unchanged.

The observation is a missing native-channel response in the test fixture.
It does not justify a production Settings fix. QA sent Integration the exact
cause and returned the Flutter window. Integration owns any lasting change to
its shared test fixture and the later integrated regression run.

## Evidence and limits

Private evidence:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/root-60f1105-settings/`.

- `source-manifest.json` and `source-readback.json`: all 405 original archived
  files unchanged; the only added Dart file is the private diagnostic fixture.
- `flutter-second.log`: both original settle failures and ready-state evidence;
  SHA-256 `a91f8c2b5cc23ecfdd735dfa73bf37e05173c631dccca3560189d7a6b67a5524`.
- `flutter-third.log`: active-ticker diagnosis;
  SHA-256 `9bf070db409139106f4b95fdbad44186b444dc2324d464e59d4e3f8a3e63b28b`.
- `flutter-final.log`: restored assertions with the missing language mock,
  exit 0 and 2/2;
  SHA-256 `801a0c03ff57c4bab149717a7ede6e9a2abb6df5c601e8774a720faea3fde121`.
- Final private test SHA-256:
  `f2769544ba293f47ca2d931219c34f87a8b964a1876f3f4d83718335a6daf188`.

Commands used the pinned existing package configuration/graph and lockfile,
`fvm flutter test --no-pub` and the shared nonblocking validation lock. The
different diagnostic attempts are preserved rather than summed. This is a
focused Settings-readiness result at `60f1105`, not complete visual acceptance,
native preferences verification, sign-out revalidation, D1 acceptance or device
proof. No real SDK, Backend, Emulator, model, FCM or physical device was used.
