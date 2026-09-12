# LI physical Android observations and environment handoff — 2026-09-13

LI HOURUI completed the three JIN-scripted physical paths using the configured current-main APK. All three displayed `Check-in saved.` followed by `Saved Check-in confirmed.` after the explicit later-read action. Scoped cloud verification confirmed the expected privacy branch, one matching Note-only Check-in per account and the approved minimal record shape. All three fresh synthetic accounts and their 18 exact associated Firestore records were then removed and absence verified.

**Classification:** PM-controlled Android observation, executed through LI's connected phone using ADB. This is neither DU execution nor independent review. JIN retains R14 evidence ownership; SHI reviews the final assembled evidence; LI scope acceptance follows that disposition. Formal focused UAT, Release and Project Done remain pending.

## Build, environment and prerequisites

- Product source/current main: `8b3f3fecb373c3dceb5b813e3b464070ee24297d`.
- JIN runbook and APK provenance: PR #23 at `4f2240f28473389515221fa45cf9d7a542373142`.
- APK SHA-256: `131D3E7B34CF95ED8D12B7840CBC31FF9C239CFF074E25DC783E9EFB0FFCA50E`; size 194,780,208 bytes. LI rehashed the delivered copy and found all five existing private Firebase/API values embedded. The build command/source attribution remains JIN's immutable preflight, not a new LI build claim.
- Device: vivo V2405A, Android 16/API 36; 1260 × 2800 pixels, density 560 dpi, font scale 1.0 (nominal 360 × 800 dp). Serial and network addresses omitted.
- Runtime: Node 24.19.0 / pnpm 11.19.0; frozen lifecycle-disabled install and `pnpm backend:build` passed in the isolated current-main worktree. No product source changes were made; existing test suites were not rerun for this evidence-only operation.
- The existing Backend was stopped at preflight. LI restarted the approved controlled runtime on loopback port 3000, preserving the existing private HTTPS Serve route. Auth and Firestore read permissions passed. The host's unauthenticated edge probe returned 401 AUTH_REQUIRED; this probe alone was not a product-flow result.
- Phone VPN presence was observed. Successful configured-app onboarding/create/read subsequently demonstrated reachability through the private HTTPS API route. No separate Tailscale-app UI screenshot is claimed.
- Every ADB action checked `adb get-state` and `adb devices -l` first. Only `com.enmori.app` local data was reset. Android initially rejected replacement because the two debug signatures differed; scoped uninstall/reinstall succeeded, using the unchanged verified APK.
- Physical fixture procedure was recorded before the functional run in commit `2bd17c1`: [procedure](physical-fixture-procedure.md). LI is the named physical environment operator; no ZHOU credential handoff is outstanding for this run.

## Observed results

| Anchor | Choice / stored consent / visibility | Save and later owner read | Cloud Note and exact field-set verification | Scoped cleanup | Verification timestamp (SGT) |
|---|---|---|---|---|---|
| CORE01 | Accept / accepted / public | Pass | Pass | Pass: 6 records + 1 synthetic Auth user | 2026-09-13 04:09:42 +08:00 |
| CORE02 | Reject / rejected / private | Pass | Pass | Pass: 6 records + 1 synthetic Auth user | 2026-09-13 04:11:52 +08:00 |
| CORE05 | Accept / accepted / public | Pass | Pass | Pass: 6 records + 1 synthetic Auth user | 2026-09-13 04:13:31 +08:00 |

For each branch, Auth email and Username reservation were verified absent before creation. The app performed registration, Username completion, optional-use information, the chosen Initial Choice, Note save and the explicit confirmation read. Cloud inspection was supporting verification, not a replacement for the app flow. Each Check-in contained only `ownerAccountId`, `note`, `createdAt`. The private branch stored `rejected/private`; public branches stored `accepted/public`.

The first registration attempt exposed dropped ADB text-input characters and was correctly blocked by password-match validation. LI reset local state, switched to paced input with field-length verification, and completed the run. This operator-input correction is not reported as a product defect or a separate passed UAT negative case. A temporary verifier's consent expectation was corrected to the existing `accepted/rejected` contract before any cleanup; no application change was made.

[Observed controls and timestamps](observations.jsonl) exclude credential fields. [Verification and cleanup results](verification.jsonl) retain only synthetic branch labels, booleans and counts. [Device profile](device.json) contains no serial. The temporary credential/identity manifest remains outside Git.

## Numbered operator steps and evidence mapping

1. Reset ENMORI local state; start the pinned APK and enter a fresh synthetic email/password/confirmation. Observe Choose your Username after Firebase registration.
2. Enter the fresh valid Username; Continue to Optional data use. Read the purpose/supporting copy and Continue to the paired choice page.
3. Choose Accept — Public for CORE-01/CORE-05 or Reject — Private for CORE-02. Observe direct entry to the Note-only composer.
4. Enter the corresponding synthetic `r14-core01-note-v1`, `r14-core02-note-v1` or `r14-core05-note-v1`; Save Check-in. Observe Check-in saved.
5. Tap Confirm saved Check-in. Observe Saved Check-in confirmed with the same Note and saved timestamp. CORE-02 additionally returned Home successfully.
6. Verify only the new account's cloud relationships and Note record; clean up that fixture and verify exact-record absence. Finish with ENMORI at the empty registration screen.

| Surface / existing authority | Current physical evidence |
|---|---|
| M02 registration and DEV-15 Username | `core05-before-email.png`, `core05-before-username.png`, `core01-registration.png` |
| M06 optional-use information / DEV-23 | `core02-before-continue.png` |
| M07 paired Initial Choice / DEV-23 | `core01-before-accept-public.png`, `core02-before-reject-private.png` |
| M08 bounded Home | `core02-home.png` |
| M19 Note-only composer / SP-01 | `core05-before-note.png` |
| M20 committed result and separate owner read / SP-05 | `core01-later-read.png`, `core02-later-read.png`, `core05-later-read.png` |

Authority remains S-PM-0903-RMVP01A-CONTRACT and S-PM-0903-Q04-RMVP01A-R1, narrowed for accessibility by S-SPONSOR-0910-RMVP01A-A11Y-DEFER. These ordinary-scale captures are reusable bounded physical evidence at this one device profile. They do not prove every responsive profile, every error state, full Q04 or accessibility compliance. Existing immutable DU mapping can be reused by JIN; only actual uncovered requirements need further work.

## Handoff and remaining work

The missing LI device execution and physical-environment procedure inputs are supplied. JIN should consume these immutable observations in PR #23, reconcile the focused result matrix/Q04 mapping and supply the still-missing expired-identity X-01 result or concrete blocker. SHI should review the final assembled evidence once. LI cannot independently approve these LI-operated observations. No new DU device run, R1–R16 re-review, accessibility-only run or full Release UAT is requested.
