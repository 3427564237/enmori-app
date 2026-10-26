# LI reference and Event usability candidate v31

26 October 2026, Asia/Singapore. Implements the confirmed
[LI direction and scoped supersession](../decisions/2026-10-26-li-reference-and-event-usability.md).
Source is [Draft PR #189](https://github.com/3427564237/enmori-app/pull/189),
based on the integration branch containing SHI #187. This is a development
candidate; the new LI change has no independent approval or physical acceptance.

## Result and remaining gap

- AI has one Check-in references entry and one panel offering today/manual/off.
  An owned Check-in seed no longer traps the user in manual mode. Manual choices
  can span the existing recent seven days, maximum five records. Today still
  uses the server's current day and latest five. The draft stays intact.
- Normal automatic previews show source cards without the repeated technical
  review block. Earlier-reply references are disclosed progressively; required
  conflict review remains visible. Sending still prepares/rechecks the current
  explicit selection and preserves unknown-operation recovery.
- Visible Event list/detail/recommendation routes reread on foreground or child
  return. Background clearing, the five-minute limit, auth/generation fences and
  external-registration Yes/No/unknown-result handling remain. Hidden/disposed
  routes do not read. Home's router no longer duplicates the section's return read.
- Event search matches real names, locations and source categories. Explicit
  search/filter actions follow the existing opaque cursors through the bounded
  available selection, stopping on invalidation or error. Search text is local;
  it does not introduce a provider-query endpoint. Same-session search/filter
  intent survives foreground returns and is cleared on session replacement.

**Actual event introductions remain incomplete.** A source-list call and three
full detail samples returned no `info`, `description` or `pleaseNote`; most
supplied URLs opened seat selection. The UI now explains this accurately. It
does not invent an introduction, derive a second URL or scrape webpage text.
An official information page was independently found for one sample, but the
current API/presentation contract does not supply it as an alternative detail
link. This candidate must not be described as having delivered those introductions.

JIN's [all-interest package](../planning/2026-10-26-jin-all-interest-event-coverage.md)
is published and read back in [Issue #84](https://github.com/3427564237/enmori-app/issues/84),
still assigned to `chuxi12483468`. It accounts for all 14 active interest tags,
real source/classifier/matching evidence, complete available candidates and
honest empty/error behavior. Art/Dance alone is superseded. The handoff also
records the introduction/link coverage gap; no start, ETA or completion is claimed.

## Source and checks

| Evidence | Result |
| --- | --- |
| Code/build head | `dee7b9fd5f2ae167cb32756b0585c60db46b90a7` |
| Code/build tree | `f3fe82a443728956919025fdb1df9f87a0e47c52` |
| Toolchain | Flutter 3.47.2 / Dart 3.13.2 |
| Format | 20 affected Dart files, zero changes needed |
| Full analyze | No issues found |
| Focused regressions | 158 passed across 17 AI/Event/core/router test files |
| Reference layout | 375dp at 2x text; 812x375 dark at 2x; 390dp normal; no layout exceptions |
| Signed APK build | Pass; `assembleRelease` 146.3 seconds |
| Frozen inputs | All tracked contents, private client/signing configurations and source head unchanged during build |
| Independent review | Pending for this new change; SHI #187's approval does not cover it |
| v31 installation | Pass on 26 Oct at 11:29 SGT; exact APK hash and original first-install time retained; no data clear |
| Device launch smoke | Pass at 11:30 SGT; foreground package/process present after three seconds; no matching fatal crash in the observed crash buffer |
| Interaction / UAT | Pending LI; references, real AI replies, search and website-return flows not exercised |

These are focused source/widget/build results, not a full-repository green
suite, deployed Backend proof, device acceptance, Release or Done. Existing
Kotlin plugin compatibility warnings remain; no plugin or dependency was changed.
The existing shared Flutter/Gradle lock serialized formatting, checks and build.

Regression history is retained privately. Before implementation, the seeded
manual panel lacked the today control, the corrected exact-v30 detail-return
case observed one read instead of two, and the search field was absent. A new
search regression also demonstrated an invalidated initial request paging a
replacement session; the generation is now captured before awaiting that read.
The first broad run additionally caught duplicate Home return requests. Existing
manual-reload-only expectations were updated under the recorded supersession.
Lazy-list/inner-TextField scroll finders, valid lifecycle sequences and explicit
synthetic auth fixtures were corrected separately from product fixes. The final
158-case run has no failures.

## Artifact

| Field | Value |
| --- | --- |
| Local file | `build/group-delivery-v31/ENMORI-group-v31-release.apk` |
| Package | `com.enmori.app.group` |
| Version | code `31`, name `1.0.0-group20261026` |
| Size | 66,939,034 bytes |
| SHA-256 | `d6c0a7c9a1e59c4a2663e9ea2ef40595f8436217bd40f9c8840b28d80902c590` |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Upgrade verification | Same package/certificate/nine permissions as retained verified v30; higher version |
| Manifest | Not debuggable; messaging auto-init and analytics collection disabled |

`candidate.json` and `SHA256SUMS` accompany the APK. At build time the device
was absent. After LI reconnected it, the first installation attempt returned
`INSTALL_FAILED_ABORTED: User rejected permissions`; the installed app remained
v30. LI confirmed device-side readiness, then `adb install -r` succeeded. The
installed v31 SHA-256 exactly matches the artifact above and first-install time
remains `2026-10-21 12:13:08`. No data clear was performed. A launch/process smoke
check passed; login and business data were not inspected. The short crash-buffer
observation is not full stability or interaction acceptance. v30 remains retained
locally. This change does not deploy/restart the Backend, change credentials or
call a model.
Private execution logs and synthetic preview images are under the owner-only
local `enmori-reference-details-20261026` state directory and are not committed.

## LI physical acceptance

After upgrading, enter AI from a specific owned Check-in, open the one reference
panel, switch to today, then switch to manual and choose records from two days.
Return with Done and send a new short message in each mode; check the draft and
the chosen references. Open Events, search for a real event beyond the first
batch, open it and return from its supplied ticket website. Detail and list
should automatically reread and retain search intent. A real source failure
must show a retry/error state. Registration must still wait for an explicit
Yes/No answer. Missing provider introductions are an acknowledged remaining gap.

See [the machine-readable evidence](../evidence/2026-10-26-reference-event-v31.json).
