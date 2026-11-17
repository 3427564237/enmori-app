# v85 backend package deployment review

17 November 2026, Asia/Singapore. **Prepared for LI confirmation; no upload, selector change, stop/start, configuration/ledger write or deployment has been performed.**

## Exact artifact and scope

- Source: `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`.
- Candidate: `/home/miku/Downloads/ENMORI-backend-v85-candidate.zip`.
- SHA-256: `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`.
- Expected baseline selector: `2026111704554378.zip`; source `9b305490ea199585852f369bc9d0b712e854de8a`; SHA-256 `6005380c4e663bfaebfee898dc1fae56c66c0910b9b4485f0da7ea000070d230`.
- Same existing Azure service `enmori-backend-20261029`, resource group `enmori-student-cloud`; no alternate host, slot, scale-out, dependency, API, configuration or data-model change.
- Keep the exact v84 release APK. Candidate backend version 85 is a separate package identity.

Only `controlled-source-projection.js`, its source map and `deployment-manifest.json` differ among 8,570 package entries. The fresh strict compile was compared with the verified current baseline archive. For 313 unchanged source maps, only local build-location paths differed; their original bytes were retained after structural comparison. The changed source map comes from the fresh compile. No test fixture, private log, account response, credential or environment configuration is added to the package. See [package receipt](package-receipt.json).

## Operations to perform only after confirmation

1. Recheck the selector, actual mounted manifest, current service state and candidate hash. If baseline source/package drifted, stop and present the new diff; do not overwrite another deployment. Preserve current private configuration fingerprints, grant identity, financial ledger and unresolved operations without printing their contents.
2. Upload only this archive under one unique candidate name, then verify its SHA-256 and entry inventory without switching the active selector. An unknown upload acknowledgement requires read-back of that same candidate, not an invented second candidate.
3. Enter the agreed maintenance window on the existing single instance. Use the already-approved stop/drain and matching service-owner procedure. Prove the old writer stopped/drained; preserve all unknown costs and in-flight outcomes. Do not force ownership, delete an owner record, release holds, start a second service or re-arm on an unproven fence. A mismatched/unknown state stops the operation for a concrete review.
4. Switch the selector to the verified candidate and start the same service with the existing configuration. No monetary grant refresh, new paid grant, model send, automatic top-up or expiry edit is part of this approval. Existing financial expiry remains fail-closed; ordinary routes are verified separately. Any necessary lease handoff uses the existing matching, stopped/drained protocol, never a reset of financial authority.
5. Verify the actual mounted manifest SHA-256 `b3a07766fb2cfbbc011683f0d1fd2b909ab609ab48b82aa8225912ba75bc4246`, source commit and version, rather than relying on a successful control-plane action. Check current single owner and readiness without claiming a healthy AI allowance. There is no fixed restart-time promise; previous operations took minutes, and ordinary availability may be interrupted during the maintenance window.
6. Perform bounded authenticated verification with the existing dedicated test account: onboarding/profile, Browse and both exact-detail routes. For a controlled same stable ID, verify a successful read, cross the existing five-minute boundary without forcing a catalogue refresh, then repeat the exact read. Record list/detail/source statuses separately; source failure is not a successful empty result. Verify failure feedback, explicit retry and restoration on the v84 Android emulator. Do not touch the user's phone or create/delete real account data.
7. Keep the separate onePA failure open unless repeated same-ID failure/recovery and relevant stage evidence establish resolution. A cold successful request or a different Ticketmaster ID is insufficient. No model generation is included in verification. Report the actual remaining limitations before any freeze decision.

The positive detail boundary may remain unverified if the external source is unavailable. Do not extend timeouts, TTL or retries to manufacture a pass. A required deployment prerequisite that would change owner/configuration or diagnostic scope beyond the existing procedure must be brought back as a concrete decision.

## Rollback

If the candidate introduces a regression, stop/drain the same service and restore the **exact baseline selector/archive** above using the same one-owner verification. Recheck the mounted baseline identity and ordinary routes. Preserve current configuration, grant, ledgers, unknown reservations and account data; package rollback does not restore expired AI authority or erase costs. Do not create a new owner, reset a fence or automatically replay unknown work. Keep both package receipts and observed failure evidence.

## Separate diagnostic proposal, not part of this package

Existing downloaded logs contain no correlated phase record for the relevant onePA requests or initial startup incident. Further production capture therefore requires a separately reviewable implementation, storage and cleanup design; approval to deploy this package must not be read as that approval.

The narrow candidate design remains one explicitly enabled window, at most 30 minutes/200 records, with trusted request correlation, route templates, duration, finite stage/outcome categories and safe HTTP/application status only. For onePA, distinguish catalogue admission, static acquisition, browser launch/navigation/readiness, parsing and projection generation/expiry. For startup, distinguish client token/dispatch/body/parse and server identity/account/account-support initialization. No URL, ID, token, body, query, raw exception, account document or private content is required. An actual client recurrence needs its own approved diagnostic build/collection scope; the current release APK does not supply those phase records.

Before enabling such capture, resolve the existing AI-only allowlist/sink constraints and prove the approved Q14 rule: records become inaccessible at server `loggedAt + 30 days`, followed by physical cleanup within 24 hours. If compliant storage/cleanup is not demonstrated, keep diagnosis local. No uncontrolled console sink or bypass of a provider refusal is proposed.
