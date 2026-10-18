# JIN reusable-entry preparation — 17 October 2026

**Prepared tooling; operational entry acceptance remains pending.** Authority:
[S-PM-1017-LI-REUSABLE-TEST-ENTRY](../../decisions/2026-10-17-li-reusable-test-entry.md).
This receipt covers new Windows-safe private-file handling and bounded
connection/status checks, not a working remote route or phone-business result.

Source-only commit `47c6d77403bd01aad3cd4fb945ec3a5287e47b6d`, tree
`23f607aa628d16ac82b364bf8dc09db03997f591`, follows approved #137
`3a03f09c811f3b9c9debd2da24e1b503f0b8607d`. Two explicit merges preserve LI's
decision heads `d25b0b4edac7893f810a2a2e949388f43c02e697` and
`1a0731420c3009e11b0360d5620eca20745a6720`; these are authority records, not
new JIN product contributions. The [machine receipt](2026-10-17-jin-reusable-entry-preparation.json)
binds every tested input to raw/LF SHA256 and its Git blob. The later evidence
commit does not change these source inputs.

## Changed behavior and preserved identity

- `private_handoff_file.py` reads the same private file with POSIX owner/0600/
  no-follow checks, or Windows handle-based current-user ownership/DACL,
  identity/size and reparse checks. Windows allows only current-user/System/
  Administrators allow ACEs; broad/null/unsupported ACLs fail closed. Existing
  handoff imports this reader; the nine fields, APK/nonce checks, stdin delivery
  and owned ADB cleanup behavior are unchanged. No dependency was added.
- `check_reusable_phone_entry.py` requires explicit SGT bounds. `host-check`
  observes two fresh, quiet original status snapshots; it cannot prove prior
  lease settlement or start/replace/clean a runtime. Disabled Event configuration
  does not become a universal Account/AI gate; pending Event work prevents a
  shared quiet checkpoint.
- `connection-check` binds SHI's exact original APK, uses only handoff certificate
  trust, checks the existing unauthenticated Settings rejection, performs one
  synthetic Auth sign-in, then an existing Settings GET. It has no proxy/
  redirect/retry or model call. It rechecks window/configuration boundaries,
  closes owned responses/sockets, and compares procedure digests before/after.
  The result is workstation connection evidence only, not host admission,
  Android or model readiness.
- [Linux/Windows instructions](../../../tool/reusable_phone_entry.md) separate
  owner startup, the current window, private configuration, local checks,
  handoff and owned stop semantics. They explicitly retain the unimplemented
  transport extension and operational acceptance gate.

The candidate remains #135 product `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`
/ tree `df800e43374ec89b71799b6722d5364163eb68cc`. SHI already received,
installed and read back the original code1 APK; hash
`776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`.
No APK rebuild/re-sign/install or product-source change occurred. LI v7 remains
separate. lib, backend/src, API, platforms, assets and listed dependencies match
that frozen product. Repository Skills/lock/routing still match approved main
`d59cb128`; Backend and systematic-debugging were loaded from this checkout.

## Actual focused author executions

| Run | Result | Boundary |
| --- | --- | --- |
| Native Windows private-file suite | 23 Pass, 5 POSIX-only skip, exit0 | Real owned temporary ACL/junction files plus pure policy; no SHI config/device |
| Existing Ubuntu Python3.12.3, exact source copy | 34 Pass, 12 Windows-only skip, exit0 | 11 overlapping policy, 5 POSIX file, 18 affected original handoff tests; temporary copy removed |
| Native Windows entry checks | 38/38 Pass, no skip, exit0 | Synthetic flows and actual owned loopback HTTP/TLS fixtures; no ResourceWarning in final run |
| Source checks | Pass | 5 Python AST parses; staged whitespace; tested bytes/Git blobs; unchanged product/Skill inputs |

Counts overlap and are not added. These are JIN author-side executions,
including internal-agent assistance, not formal SHI or LI review results.
No unchanged full Backend, SDK or Flutter suite was rerun or borrowed.

Commands and exact log hashes are in the JSON. Native checker Python is the
existing 3.12.14; actual TLS tests use existing Git OpenSSL3.5.5 to create and
remove temporary synthetic certificates. This is not a new service certificate
or installation. Test listeners/handlers were joined and temporary files
removed. Private Windows test directories and the POSIX copied directory were
confirmed removed, including cleanup of the initial sandbox-denied attempts.

Raw evidence remains under `build/jin-reusable-entry-20261017/` and
`build/jin-private-handoff-20261017/`; these author-local paths are not downloads.

## Failures retained

1. Initial Windows private-file tests encountered sandbox Temp create/cleanup
   denial before real ACL assertions (22 errors). Same bounded native fixtures
   subsequently ran with the normal user token; 11 failed temporary directories
   were separately confirmed absent. The original log/cleanup receipt remain.
2. Checker01 could not create its sandbox Temp fixtures: two selected tests,
   four setup/cleanup errors. Checker02 then demonstrated two actual new-tool
   failures: a slow handoff reload dispatched after the window; pending Event
   work was incorrectly quiet. Post-read window and pending checks repaired them.
3. Internal synthetic observations also demonstrated a final reload reporting
   Pass after expiry and status becoming stale while read. The fixed code
   rechecks both after I/O. Their pre-fix boolean/source receipt is retained.
4. Checker03 demonstrated slow-drip response survival beyond a per-operation
   timeout and an end-only procedure hash accepting changed source. The request
   watchdog and before/after digest repaired these cases.
5. Checker04 was 36/37: one fixture combined actual filesystem mtime with a fake
   clock and was corrected. It also revealed an unclosed-response warning;
   explicit response cleanup was added. Checker05's one cleanup test overlaps
   final38. Final06 is 38/38 with no resource warning.
6. A sandbox OpenSSL metadata query failed with `NtCreateDirectoryObject
   0xC0000022`; ordinary-permission metadata succeeded. It was metadata, not an
   application test or a replacement result.

These are failures in new tooling/fixtures/environment, not reopened #135/#136/
#137 findings. All original APKs, ZIP, logs and earlier model/Windows failures
remain untouched.

## Live dependencies and operational acceptance

LI's [current inventory](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235064823)
establishes only old HTTPS Serve443→3000; SSH and raw TCP dual forwarding are
not available. JIN has submitted [one precise proposed extension](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235109065):
two foreground native TCP Serve mappings to current Backend TLS/Auth9099,
plus Windows loopback byte relays, retaining original443/APK/TLS. The new
listener scope and actual grants/ACL reachability require LI's disposition;
tailnet-only is not proof of authorized-only access. No extension is implemented
or enabled by this source commit.

LI has offered **17 October 2026, 22:27–22:57 SGT**, replacing the unconfirmed
next-morning proposal. This is a host window, not evidence that current config,
original lease, route or service is ready. SHI has acknowledged participation;
its current Tailscale `NoState`/starting observation is a separate local
connection prerequisite, not an assigned root cause or an APK/device failure.
No automatic extension or out-of-window start is scheduled.

Remaining: the concrete listener/access decision; implementation/validation of
that route; original current config/TLS/lease readiness; SHI usable tailnet
connection; SHI new-tool review and LI evidence check; then SHI actually follows
the version-bound steps and independently starts an assigned flow within a
valid window. JIN retains entry faults and canonical/provenance/owned cleanup.
Script Pass/TCP-open/CONSUMED does not accept that criterion.

Actual remote connection, current runtime startup, private phone handoff,
business phone flows, real consecutive9B, provider calls and applicable other
platform work remain Not Run for this receipt. No merge, closure, Project or
whole-app/Sprint/UAT/Release/Done transition is requested.
