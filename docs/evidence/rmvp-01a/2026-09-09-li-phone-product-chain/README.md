# LI Android product-chain execution — 2026-09-09

## Scope and identity

- **Executor/device owner:** LI HOURUI (PM)
- **Device:** vivo V2405A, Android 16 (API 36)
- **Code head:** `c3189c5d00f583a74b287258cf42a9302a0c4e6c`
- **Installed debug APK SHA-256:** `bc78ba4e74347405e9a4832a8ebf7c834075afd84db4f7754a6622dda5b6b92e`
- **Execution window:** 2026-09-09 15:58–16:23 SGT (07:58–08:23 UTC)
- **Path exercised:** Android app -> Firebase Email/Password Auth -> private HTTPS edge -> loopback Fastify Backend -> Firestore
- **Replacement boundary:** LI's device was used for this execution. DU's device was not used and is not a dependency of this evidence.

The installed APK was pulled from the device and compared byte-for-byte with the local `app-debug.apk`; both had the SHA-256 shown above. No endpoint, Firebase credential, token, email address, password, UID, AccountId, CheckInId, or certificate is stored in this evidence directory.

## Preconditions observed

| Check | Observation | Result |
| --- | --- | --- |
| ADB | V2405A reported `device` | Pass |
| Flutter target | V2405A reported as Android 16 / API 36 | Pass |
| Private network | Controlled host and V2405A were online in the same tailnet | Pass |
| HTTPS edge | Private HTTPS forwarded to the Backend loopback listener | Pass |
| Backend ingress | Unauthenticated `GET /v1/me/onboarding` through HTTPS returned the stable `401 AUTH_REQUIRED` envelope | Pass |
| Firebase Admin boundary | Auth and Firestore were accessed through the approved controlled project identity | Pass |

## Executed product paths

### Accept -> Public

| Step | Observed result |
| --- | --- |
| Firebase registration | An Email/Password Firebase Auth user existed; no address or credential was recorded in evidence. |
| Onboarding | `optionalProcessingConsent=accepted`; `checkInVisibility=public`; completed at `2026-09-09T07:59:31.265Z`. |
| Note-only create | Synthetic Note saved once at `2026-09-09T08:13:01.279Z`. |
| Later owner read | Device UI displayed `Saved Check-in confirmed.` with the same Note and timestamp. |
| Firestore record | Exactly one matching controlled record; fields were exactly `createdAt`, `note`, and `ownerAccountId`. |

Visual and semantics evidence:

- `accept-public-later-read.png` — SHA-256 `158bd14f041b879ce7fbb90c616b30170d044168c9ab0e59da45a7919dddb568`
- `accept-public-later-read.xml` — SHA-256 `deb38c03e294eccc5a7a66c782feff98d0ff38f453b52a2ac4e6559c52a78e7b`

### Reject -> Private

| Step | Observed result |
| --- | --- |
| Firebase registration | A new Email/Password Firebase Auth user was created on V2405A at `2026-09-09T08:21:17Z`; no address or credential was recorded in evidence. |
| Onboarding | `optionalProcessingConsent=rejected`; `checkInVisibility=private`; completed at `2026-09-09T08:22:23.213Z`. |
| Note-only create | Synthetic Note saved once at `2026-09-09T08:22:45.371Z`. |
| Later owner read | Device UI displayed `Saved Check-in confirmed.` with the same Note and timestamp. |
| Firestore record | Exactly one matching controlled record; fields were exactly `createdAt`, `note`, and `ownerAccountId`. |

Visual and semantics evidence:

- `reject-private-later-read.png` — SHA-256 `b29c27cd1e9c69c4b66142416bd9ce76b4b943f94330b43f39698df4e1bb1568`
- `reject-private-later-read.xml` — SHA-256 `01a5f4aecdacb9054eef6eaa4d428a57c16b65b8d196d0d25baeca1b2060ea97`

For both accounts, the controlled read-back also observed:

- one Firebase Auth user using the `password` provider;
- one Auth Binding containing only `accountId`;
- one Account containing exactly `username`, `optionalProcessingConsent`, `checkInVisibility`, and `onboardingCompletedAt`; and
- one Check-in containing exactly `ownerAccountId`, `note`, and `createdAt`.

## Exact-head regression verification

| Command | Result |
| --- | --- |
| `pnpm --config.ignore-scripts=true run backend:verify` under Node.js 24.19.0 / pnpm 11.19.0 | Pass, 110/110 |
| `fvm flutter analyze` under Flutter 3.47.2 / Dart 3.13.2 | Pass, no issues |
| `fvm flutter test --reporter compact` | Pass, 69/69 |

## Post-execution cleanup

- The loopback Backend process was stopped after evidence capture.
- The private HTTPS Serve configuration was reset; its final status was `{}`.
- Public Funnel exposure was not enabled.
- The controlled cloud records were retained as reviewable synthetic evidence; no credentials or tokens were retained in the repository.

## Evidence boundary

This execution establishes the two approved Android product paths on LI's physical device, including real Firebase Auth, private HTTPS Backend calls, Firestore persistence, and later owner read. It does **not** establish TalkBack/accessibility execution, every R12 catalogue row, UAT, independent review, merge acceptance, Release acceptance, or overall `Done`. Those gates remain separate.
