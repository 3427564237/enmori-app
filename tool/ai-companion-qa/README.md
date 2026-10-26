# Independent QA tools

`compare_scope.py` compares two already collected owner-local hash manifests.
It never captures data, opens a service, loads credentials, edits records or
prints record identities. It has no third-party dependencies. The schema below
is a QA file format only, not an application API or storage proposal.

```json
{
  "version": 1,
  "captureStatus": "complete",
  "scopeFingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "capturedAt": "2026-10-25T06:00:00Z",
  "documents": [
    {
      "idHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "contentHash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    }
  ]
}
```

The authorized capture operator defines the exact enumerated account/binding,
recursive account subcollections, Check-in and participation scope, records its
description privately and hashes it consistently into `scopeFingerprint`.
Canonical identity and content hashing must be identical before/after, include
all fields in the declared scope and preserve value types. Do not mark a partial
read or a swallowed error complete. Hashing does not make these files public;
keep actual manifests private outside Git.

`capturedAt` must be an actual UTC capture timestamp, with the after capture later
than before. Both manifests must contain the same nonempty protected scope.
This tool cannot independently prove capture completeness or authenticity, so
QA must also review the collector, scope, commands and capture evidence.

```bash
python3 tool/ai-companion-qa/compare_scope.py /private/before.json /private/after.json
python3 -m unittest discover -s tool/ai-companion-qa -p 'test_*.py' -v
```

Exit 0 / `MATCH` means the declared hashes match, **not** installation, full-data
preservation, UAT or product acceptance. Exit 1 / `DIFFERENT` reports aggregate
added/removed/changed counts. Exit 2 / `INCOMPARABLE` retains missing, invalid,
duplicate, incomplete or differently scoped evidence as unknown, never Pass.
Equal record counts cannot hide replacement or content changes.

If an authorized acceptance run deliberately adds a synthetic record, pass
`--expected-additions /private/additions.json`. That file maps exact identity
hashes to exact content hashes. An unexpected or missing addition still fails.
The tool cannot authorize an addition. Existing-record changes and removals
always remain differences; do not rewrite the before snapshot to conceal them.

Use fresh snapshots for the current run. The v26 historical 88/89 counts are not
a fixture or the expected size of a future run. The new-round matrix and layer
rules are in `docs/evidence/ai-companion-20261025/qa-matrix.md`.
