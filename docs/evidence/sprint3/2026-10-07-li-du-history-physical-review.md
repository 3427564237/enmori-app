# LI independent review — DU history physical contract #59

7 October 2026, Asia/Singapore. Owner DU; independent reviewer LI. LI's prior PM instruction to complete current PM work/reviews and the confirmed [H1–H7 / option A](../../decisions/2026-10-07-li-next-read-option-a.md) authorize this scoped review and focused publication, not physical implementation approval.

## Exact artifact and conclusion

- PR #59 head `4d981ad66bac75269baf05fdc6776c4ed4caf228`, base/main `ba94368b655c1d8885093ff1cf2a38c65400b8c2`; one new planning Markdown document, 193 lines. No executable/API/index/dependency/runtime files changed.
- [Formal exact-head LI Changes Requested review](https://github.com/3427564237/enmori-app/pull/59#pullrequestreview-5440738701); two inline findings, R1/P1 and R2/P2. H1–H7 product direction is retained; physical contract is not approved or implementation Ready.
- #48 remains Closed/completed and preparation-only Done. #59 remains Draft/Open. The earlier #56 preparation acceptance is not reopened.

## Focused findings and required next packet

**R1 — UTC-string query-boundary representation.** The current authoritative writer at `backend/src/shared/application/authoritative-values.ts` calls `Date.toISOString()`. A persisted `2026-10-07T00:00:00.000Z` or `.500Z` compares lexically less than a zero-fraction boundary `2026-10-07T00:00:00Z`, despite both instants being at or after it. Uniform persisted values alone do not fix mismatched derived boundaries. Specify one audited representation for values/bounds/cursor, prove midnight and next-day exclusion, and resolve extreme-year and midnight/skipped-day cases. The candidate library permits explicit millisecond serialization; see [official implementation](https://github.com/js-temporal/temporal-polyfill/blob/main/lib/instant.ts) and [Temporal civil-day documentation](https://tc39.es/proposal-temporal/docs/plaindate.html#date.toZonedDateTime). No package installation or product execution was performed.

**R2 — current authority and cursor validation stages.** Proposal section 3 needs fresh UID binding/account reads in the page transaction. Its section 6 blanket assertion that all rejected cursors access no repository cannot hold for checking a cursor against that current bound account. State local decoding/crypto/expiry checks, current-authority reads/error precedence, and zero Check-in query/read on owner/query mismatch separately. Retain current-source reauthorization and bounded transaction reads.

**Pending physical inputs.** Dependency/index and encrypted-cursor/lifetime choices still need scoped PM confirmation. Identify the smallest available-runtime key source/injection path and provisioning/rotation owner; an unspecified “approved secret manager” is not an established integration. Supply one corrected exact-head packet without adding infrastructure or obtaining secrets. DU owns it; LI reviews the corrections and then presents only the remaining exact competent decisions. No repeated H1–H7 or kickoff approval is requested.

**Timestamp audit gate retained.** The baseline parser accepts absent/variable fractions while the writer uses canonical Date serialization. Source inspection proves the inspected writer, not all existing persisted records. Before an actual audit, identify authorized environment/dataset, read-only field minimization and complete-versus-representative coverage; report counts only, no Notes/identifiers/paths/raw documents. No real-user/demo data audit, migration, normalization or new timestamp field is authorized or executed by this review. Keep the affected query gated if compatibility is unproved.

## Verification and honest result boundary

- Eight cited baseline code/manifest paths exist; comparison against the controlling H1–H7 and actual writer/parser/gateway/runtime was completed.
- Six metadata lines 3–8 intentionally use two-space Markdown hard breaks. Default `git diff --check` flags them; no default whitespace-pass claim. No other trailing whitespace was found.
- Local Node built-in string/date counterexamples confirmed the lexical midnight mismatch and expanded next-year boundary. These are review experiments, not product/Backend/Emulator/Android tests.
- All new physical implementation/product checks remain **Not Run**. No data/environment write, dependency install, credentials, provider request or merge occurred.

Formal review was published and its exact commit/body/state read back. Parent #44 focused update/readback starts **Not Run**. Existing unchanged preparation/component verification remains attributed to its executed scope.
