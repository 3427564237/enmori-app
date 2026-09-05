# RMVP-01A Auth Binding document-ID mapping — 2026-09-05

- **Source ID:** S-PM-0905-RMVP01A-AUTHBINDING-ID
- **Status:** Approved by LI HOURUI
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Physical Cloud Firestore document-ID mapping for the already approved RMVP-01A `auth_bindings/{firebaseUid}` record only
- **Builds on:** S-PM-0901-BACKEND, S-PM-0903-RMVP01A-CONTRACT, S-PM-0903-RMVP01A-START and S-PM-0905-RMVP01A-TOOLCHAIN
- **Delivery input:** SHI ZHENGQI's independent R9 review finding on Draft PR #10

## Decision

For RMVP-01A, the verified Firebase UID is mapped to the Auth Binding document ID as:

```text
uid_ + base64url_no_padding(utf8(exactVerifiedFirebaseUid))
```

The mapping is deterministic and uses the exact verified UID byte sequence. It does not lowercase, trim, Unicode-normalize or otherwise rewrite the identity. Node.js 24's built-in UTF-8 and `base64url` support is sufficient; no new dependency is approved.

The fixed `uid_` prefix and unpadded base64url alphabet ensure the resulting document ID contains no `/`, is neither `.` nor `..`, and cannot match Firestore's reserved `__.*__` form. Firebase Authentication constrains a UID to 1–128 characters; even a worst-case UTF-8 representation plus this prefix remains below Firestore's 1,500-byte document-ID limit.

Every Auth Binding lookup and create operation applies the same mapping inside Backend Infrastructure. The raw UID may exist transiently as the verified Auth Principal and adapter input, but this decision does not add it as a Firestore field. The approved Auth Binding document continues to contain only `accountId`.

If the verified input or derived identifier violates the stated constraints, Infrastructure fails closed through the existing `dependency_unavailable` boundary. Neither the raw UID, encoded document ID nor Firestore path may enter ordinary logs, public responses, OpenAPI examples or evidence.

## Bounded clarification and supersession

S-PM-0903-RMVP01A-CONTRACT remains controlling. Its physical-schema row `auth_bindings/{firebaseUid}` continues to mean one deterministic Auth Binding keyed by the verified Firebase identity. For this slice only, this decision supersedes a literal raw-UID-as-document-ID interpretation and defines the path placeholder as the encoded value above.

Nothing else in the R2 contract changes. In particular, the internal AccountId remains distinct from Firebase UID, and the approved onboarding transaction, record fields, owner authorization and public projections remain unchanged.

## Required R9 verification

R9 must add contract tests showing that the mapping:

1. is deterministic and collision-free for distinct exact UTF-8 inputs;
2. produces the exact `uid_` plus unpadded-base64url form;
3. safely handles valid UID inputs containing `/`, `.`, `..`, reserved-looking `__name__`, non-ASCII text and the 128-character boundary;
4. never exceeds 1,500 UTF-8 bytes or produces a Firestore-reserved document ID; and
5. is used consistently for create and later lookup without exposing the raw or encoded identity.

The revised R9 branch must still rebase on the accepted R4 baseline, run the combined R4+R9 suite on Node.js `24.19.0` with pnpm `11.19.0` and the frozen lockfile, and receive SHI's independent approval before R10 starts.

## Scope and evidence boundary

This decision approves no new endpoint, DTO, Firestore collection or field, index, migration, transaction, deployment behavior, product behavior, credential handling or physical-cleanup mechanism. It does not approve the current PR #10 implementation, mark R9 stable, start R10, or create Emulator, Android, UAT or Release evidence.

Official constraints consulted:

- [Firebase Authentication — Manage Users](https://firebase.google.com/docs/auth/admin/manage-users)
- [Cloud Firestore — Usage and limits](https://firebase.google.com/docs/firestore/quotas)
