# JIN #139 R1 — Windows APK parent-path correction

Response to [SHI Changes Requested 5558564124](https://github.com/3427564237/enmori-app/pull/139#pullrequestreview-5558564124),
bound to `c777fbfc2f24e68dd43efcb5f3ba0ed352871f14`. This is a scoped tooling
compatibility correction; SHI's corrected-path execution and formal re-review
remain pending. It does not complete the reusable remote entry.

Source-only correction: `752e22213f1a70027c44e02a13f1fc2a63191e33` / tree
`200a0984ddb604def6ce29432f0c0a16063c7787`. The later receipt commit changes no
tested Python input. The [machine receipt](2026-10-17-jin-reusable-entry-r1-aapt-path.json)
binds inputs, Git blobs, commands, runtime versions, logs and cleanup.
The updated procedure SHA256 is
`16c7b422ae38975a54ed4fde3a8676aa7df7e882767d0323ba2714f532aad944`;
do not reuse the earlier procedure digest for this correction.

## Cause and narrow change

SHI's actual SDK36 `aapt` rejected the original APK's absolute Chinese-parent
path with exit1 / Illegal byte sequence; the same bytes worked using a relative
filename in their containing directory. The old handoff always supplied the
absolute path, so changing the caller's directory alone could not help.

The helper still selects and hashes the absolute APK. Only the `aapt` child now
uses `cwd=apk.parent` and `./` plus the delivered ASCII basename. The tool path
stays absolute; argument-list invocation does not use a shell. Python's process
directory and all subsequent ADB commands remain unchanged. The `./` prefix
also protects option-like names. No copying, renaming, rebuild, encoding or ACL
change is part of the handoff. Existing sanitized command failures stop before
ADB; package/activity, installed hash, private file and nonce checks remain.

The original POSIX fixture runner now accepts/asserts the child `cwd` keyword;
its blank-list wrapper forwards it. No product/API/dependency/Skill file changes.
Instructions retain absolute operator inputs and explicitly mark the old SGT
window expired.

## Actual author validation

| Execution | Result | Actual boundary |
| --- | --- | --- |
| New Windows path cases before correction | 4 Pass / 4 Fail, exit1 | Three simulated encoding-boundary failures and one native invocation-shape assertion; not four native SDK failures |
| New Windows path cases after correction | 8/8 Pass, exit0 | Six synthetic boundary cases plus two actual SDK36 `aapt` cases |
| Existing Ubuntu Python3.12.3, exact source copy | 24 Pass / 2 Windows-only skip, exit0 | Six overlapping new path cases and 18 affected original handoff cases |
| Three changed Python syntax parses, whitespace, input/Git-blob checks | Pass | Original product/API/dependency/Skills remain unchanged |

Both passing runs treat ResourceWarning as an error. Tests use real transfer
validation and the subprocess wrapper. The native cases read a hard link to the
existing frozen APK in an owned Chinese/emoji/spaced directory and read an
invalid APK to verify failure before ADB. They use bundled Python3.12.14 and the
existing SDK36.0.0. Private-file reads and every device reply are synthetic:
there is no actual private handoff, ADB invocation, install, app interaction,
network or model call. Six cases overlap between platforms; do not add counts.

The original APK remains 94,273,899 bytes, SHA256
`776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`, from #135
product `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e` / tree
`df800e43374ec89b71799b6722d5364163eb68cc`. Original bytes and SDK executable
hashes match before/after; no rebuild or signature change. Source copies,
owned links and fixture directories were removed, with zero new fixture residue.

## Preserved observations and failures

JIN's direct pre-fix native checks, including Chinese/emoji/spaced parents,
succeeded for both absolute and relative invocation. This workstation reports
ACP65001. The environment difference is a plausible explanation, not proof of
SHI's exact code page. These successes do not erase SHI's actual counterexample
or claim local reproduction of its SDK error. The native RED test failed its
argument-shape assertion after SDK success; the three other RED failures model
the reported boundary. All RED/Green logs and these observations remain under
`build/jin-reusable-entry-r1-20261017/` with hashes in the JSON; local paths are
not download links.

The first sandbox hard-link setup failed with WinError5 before reaching `aapt`.
The owned directory was removed. The same bounded fixture under normal user
permissions completed; the original failure remains separately recorded.

SHI's earlier 61 Pass / 5 POSIX skip belongs to `c777fbf`. Their broader initial
Windows run (84 cases, 10 failures / 5 errors / 5 skips), Store-Python launch
failures and actual aapt counterexample remain in the linked review. Earlier
JIN preparation and original APK/model/Windows histories are preserved in the
[previous receipt](2026-10-17-jin-reusable-entry-preparation.md). None of those
old results is promoted to a new run on this source. Unchanged private-file,
checker, full Backend/SDK/Flutter suites were not repeated for this correction.

## Remaining gates

Request SHI re-review only R1's changed invocation, related fixture/tests and
instructions, on the updated exact PR head. LI retains the separate evidence
path. Author-side internal assistance is not formal independent review.

The 17 October 22:27–22:57 SGT window ended and was not extended. The concrete
listener/access decision, route implementation/connection checks, original
runtime/lease/current configuration, usable SHI connection and a new explicit
window remain separate dependencies. Current remote startup, actual phone
business flows and consecutive real9B remain Not Run. No Tailscale/network,
runtime/provider/model activation, merge, closure, board or overall acceptance.
