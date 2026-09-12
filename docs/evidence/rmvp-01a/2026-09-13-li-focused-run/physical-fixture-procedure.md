# LI physical controlled-environment fixture procedure

Operator and environment custodian for this run: LI HOURUI. Prepared 2026-09-13 SGT as the operational handoff requested by PR #23. Uses the existing controlled Firebase Auth/Firestore environment and approved Backend at main `8b3f3fecb373c3dceb5b813e3b464070ee24297d`; this is not an Emulator reset, production deletion feature, new service or change to the product contract.

## Before each branch

1. Verify the controlled project from LI's private existing configuration and application-default credentials without printing either. Verify Firebase Auth and Firestore read access and the private HTTPS edge. The raw Backend remains on loopback port 3000.
2. Generate a fresh synthetic email/password and canonical Username for this branch. Keep the temporary manifest outside Git, readable only by LI. Record only the branch label in shared evidence.
3. Query Firebase Auth for that exact email and the exact `username_reservations` document for that Username. Both must be absent; otherwise generate another fixture. Never reuse or remove a pre-existing identity or reservation.
4. Check `adb get-state` and `adb devices -l` immediately before each ADB action. Clear local data only for `com.enmori.app` and open the verified configured APK. The resulting Create account state is the local reset observation. No cloud-wide reset is performed: verified-absent fresh fixtures isolate each branch.
5. Execute JIN's approved CORE-01.A, CORE-02.A and CORE-05.A screen scripts from PR #23. LI captures actual observations; JIN retains evidence ownership and SHI remains the independent reviewer.

## After each branch

1. Record the created Firebase UID privately by looking up only the exact generated email. Derive its `auth_bindings` document as `uid_` plus unpadded base64url of the exact UID UTF-8 bytes. Read the binding and account privately, verifying that its Username matches the manifest.
2. Read only Check-ins whose `ownerAccountId` matches that account. Verify the expected synthetic Note, record shape, branch consent/visibility and later-read screen. Publish only booleans, counts, synthetic Note labels and sanitized screen captures; do not publish UID, account IDs, email/password, tokens, endpoint or private configuration.
3. For cleanup, target only this manifest's newly created Firebase user and its verified exact binding, account, Username reservation, owned Check-ins and idempotency records scoped to that UID/account. Before any deletion, verify every relationship and that the username/email were absent at preflight. Abort on an unexpected relationship or pre-existing record; never scan-and-delete a collection or use a prefix as ownership proof.
4. Remove only those test records using Firebase Admin with LI's existing credentials, then remove the exact synthetic Auth identity. Re-read the exact deleted references and Auth identity to verify absence. Record sanitized deletion counts and absence results. This fixture cleanup is not evidence of product deletion propagation or TTL cleanup.
5. Clear only `com.enmori.app` local data and return the app to Create account. Keep the controlled Backend available for the agreed review window. Never include private manifest/configuration in Git.

## Result boundary

A written procedure is not an executed result. Each branch records actual before/after checks and Pass/Fail/Blocked/Not Run independently. This procedure resolves the named LI environment-operating handoff; it does not approve JIN's evidence, waive any missing X-01 branch or establish UAT/Release/Done.
