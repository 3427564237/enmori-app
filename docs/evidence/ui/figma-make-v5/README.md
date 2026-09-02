# Figma Make Version 5 source-export evidence

- **Evidence status:** Partially captured; verification remains Pending
- **Recorded:** 2026-09-02
- **Source supplied by:** LI HOURUI, ENMORI PM
- **Evidence recorder:** Codex workspace agent
- **Original supplied filename:** `修改登陆界面.zip`
- **Retained archive:** `figma-make-UFmjpkfucM4TctMuRQfsOC-export.zip`
- **Archive size:** 375,842 bytes
- **Archive SHA-256:** `9ffee1e2c6879f438c96737c9a61dbbc55493cf5e94f55a1eeadeb9462e63f00`
- **Archive entries:** 66 regular files; 680,818 uncompressed bytes
- **Integrity test:** Passed with `unzip -t`
- **Safety inspection:** No path traversal, symbolic links, environment files, credentials, tokens, keys, or secret configuration detected by the recorded pre-extraction inspection

## Identity corroborated by the export

The exported `README.md` identifies the original project as Figma file key `UFmjpkfucM4TctMuRQfsOC`. This corroborates the file identity frozen by Q04-A.

The archive itself does not contain a Figma version-history record, an immutable Version 5 identifier, the frozen version title, or the displayed history timestamp. The repository therefore does not claim that the archive alone proves historical-Version-5 provenance. The original PM-supplied archive is retained unchanged so that provenance can be completed and audited against the required version-history evidence.

## Contents and use boundary

- `source/` is the unchanged extracted source tree.
- `.gitattributes` disables Git's trailing-space warning only for this immutable extracted evidence tree so the source continues to match the retained archive byte-for-byte; project-authored files receive no such exception.
- `FILE_INVENTORY.txt` is the canonical locale-independent file-path inventory.
- [`Q04-C_ROUTE_STATE_MATRIX.md`](Q04-C_ROUTE_STATE_MATRIX.md) is the analysis-only complete 42-route inventory, material non-route-state inventory, initial shared-pattern register, and route/state-to-matrix mapping. It preserves the original pre-Q04-D population for audit traceability; the approved Q04-D overlay governs subsequent route dispositions and retained-candidate handling.
- [`../../../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md`](../../../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md) is the approved Q04-D content-acceptance and conservative production-surface disposition record. Its historical filename retains the review trail.
- The React/TypeScript/CSS files and included image are design evidence only.
- Nothing in this directory is Flutter production code, an approved dependency choice, an executable project baseline, or authority for product behaviour.
- Dependencies were not installed and the exported application was not executed as part of evidence intake.

## Remaining Q04-A evidence

The following remain Pending before the evidence package is verified and the affected screens/states can become Visual Implementation Ready:

- captured Figma version-history evidence for Version 5;
- evidence connecting this exact archive to the approved Version 5 historical state rather than merely the same Figma file or a later head;
- audited screen/state captures and applicable viewport/device dimensions;
- verification of external fonts, remote assets, and runtime dependencies needed to reproduce the reference appearance; and
- verification of the preserved Q04-C evidence against the approved Q04-D overlay, plus resolution of the eight retained deviation candidates and remaining non-Q04 product/privacy questions.

See [`../../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md`](../../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md).
