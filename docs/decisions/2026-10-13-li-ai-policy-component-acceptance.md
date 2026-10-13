# LI acceptance — #93 unwired AI policy increment

- Source ID: S-PM-1013-LI-AI-POLICY-ACCEPTANCE.
- Authority: LI HOURUI / PM, 13 October 2026 SGT.
- Accepted source: #93 `110eda443fbe101608c6aa6df551e52b6a18da5a`, tree
  `9b7ac0fde80c676af88ed0b5f888b9a7c4a39383`, over accepted #92 `029437c`.
- Independent implementation reviewer: [JIN APPROVE 5500140319](https://github.com/3427564237/enmori-app/pull/93#pullrequestreview-5500140319).

Accept the two submitted **unwired** full-precision expiry and permanent local
write-terminal policies, their 30 tests and the focused candidate submission.
This is a bounded component increment. The separately confirmed
[remaining contract A](2026-10-13-li-remaining-isolated-ai-contract-a.md) selects
new contracts prospectively; it does not turn these helpers into a real adapter.

LI independently inspected both source helpers, their tests, current
four-F01 authority and the remaining packet. Runtime reference search found
only tests and the feature README; no Bootstrap, actual producer, public API,
Firestore/model, shared entry or ordinary configuration imports them.
LI verified **19/19** submission source blobs and **5/5** imported authority
blobs against exact versioned objects, plus clean exact base/head whitespace.

Actual LI validation on this exact source used the existing verified dependency
cache, Node **24.19.0**, TypeScript **7.0.2**. Direct strict compiler
`node node_modules/typescript/bin/tsc --project backend/tsconfig.json` passed.
`node --test 'backend/dist/test/**/*.test.js'` passed **542/542**, no failure,
cancel, skip or todo. The 30 new policy cases are included in 542. No package
installation, lockfile or version change. Temporary node_modules symlink was
removed without deleting its shared target.

LI raw full-suite transcript SHA256:
`45265f609c7dfd943a5795cd3c736b67cb73c5a900ddd818aa1e23013c97ef35`;
local retained receipt `/tmp/enmori-li-20261013/li-policy-full.txt`.
JIN's 542/4-probe results and owner/local-reviewer intermediate failures remain
attributed to their own runs; LI did not rerun those private probes or claim
independent source-transcript reconstruction.

No blocking finding in the submitted component scope. Full-precision math is
not a database precision guarantee; closed is not no_effect/user_saved; local
terminal is not remote rollback. Actual SDK concurrent fences, ACK-loss,
producer consistency, source cleanup and original-expiry+24h completion remain
unproved/Not Run. No new Emulator, device, live-model or ordinary-runtime result.

This resolves #93's LI component-acceptance wait. Related changed adapters still
follow their source/producer/capability prerequisites and new-code review.
Keep Draft/Open, no merge, task closure, board promotion or overall
M26/Sprint/UAT/Release completion. Unchanged #88/#92/#87/#91 need no repeat review.
