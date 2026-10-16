# Skill update — 2026-10-12

Authorization: LI requested updating the Skills identified as updateable in the 2026-10-12 read-only audit. This shared change updates seven existing third-party repository Skills. Two Figma candidates were excluded after licence verification. Personal Skills (including Humanizer) are outside this repository distribution. No new Skill or plugin installation, product implementation, credential setup, external write, or readiness claim is authorized by this tooling record.

## Source review trail (Figma candidates reverted)

| Skill | Retained old source revision | New source revision |
| --- | --- | --- |
| `domain-modeling` | `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76` | `49dd158d1076134a641b33efb035946536778336` |
| `grilling` | `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76` | `49dd158d1076134a641b33efb035946536778336` |
| `ui-ux-pro-max` | `8bd29e775453ebcae52b6e6514fbf134df0c5770` | `67803eac81607188194aea9842a723b89326d90d` |
| `dart-flutter-patterns` | `ce64e417fd420a0df98ed0aa00809eea5e74e127` | `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29` |
| `systematic-debugging` | `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | `bb92a77741419a4ab5f06e711a283343f1ada0c3` |
| `brainstorming` | `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | `bb92a77741419a4ab5f06e711a283343f1ada0c3` |
| `writing-plans` | `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | `bb92a77741419a4ab5f06e711a283343f1ada0c3` |
| `figma` | `dad3072ab3236e7315749a20a0abe48b53f831e2` | Candidate `49f948faa9258a0c61caceaf225e179651397431` rejected; old revision retained due to licence change |
| `figma-implement-design` | `0ed635aad23fb73b98f75e0f99f407ffcaeba4ea` | Candidate `49f948faa9258a0c61caceaf225e179651397431` rejected; old revision retained due to licence change |

## Compatibility changes

- Retained repository-local script paths, Flutter 3.47.2 applicability and freshness matching, explicit-only policies, project architecture/authorization boundaries, privacy handling, Figma evidence and credential boundaries, and optional delegation.
- Domain Modeling now contains the upstream GLOSSARY template. Existing glossary names/locations remain authoritative; no project glossary or ADR was renamed.
- Brainstorming uses the new upstream conversation and builder-check workflow, subject to existing project authority and routing; unavailable Superpowers namespaces are replaced with the installed, explicit-only local Writing Plans workflow.
- Writing Plans incorporates upstream interface-oriented steps and review focus. Unspecified expected behavior remains a requirement question; it cannot be inferred or implemented. Existing approved execution authority takes precedence over repeated approval prompts.
- Both Figma updates were reverted in repository and personal directories: the new LICENSE.txt subjects the Materials to Figma Developer Terms, whereas the previous provenance lock records Apache-2.0. Updating Skills alone did not resolve that licence/distribution change. The old approved sources and local credential boundaries remain intact. Evidence: [current Figma licence](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/figma/LICENSE.txt) and [Developer Terms](https://www.figma.com/legal/developer-terms/).

## Validation

- Initial local validation passed on all candidates. Team distribution verification on 2026-10-16 validates all 18 repository Skills.
- UI/UX data validation passed (12 domains, 22 stacks, ui-reasoning.csv); 137 self-contained tests passed.
- Four upstream-repository maintenance modules cannot run within the distributed Skill: `test_catalog_refresh`, `test_catalog_summary_line_endings`, `test_relevance_evaluator`, `test_skill_script_paths`. Their root-level scripts and upstream parallel installations are not vendored.
- Python, Bash and Node syntax checks passed. Local resource links were checked, excluding illustrative links inside fenced glossary examples.
- PyYAML 6.0.3 was used only from a checksum-verified temporary validation directory; no project/system dependency was installed.

## Team synchronization — 2026-10-16

LI authorized sharing the reviewed project Skills with teammates. The update is based on the current remote main; existing Scrum Planning and unrelated project work remain as recorded on main. No personal configuration or workstation paths are distributed.

After this change is merged, teammates can update their normal checkout with `git pull --ff-only` and start a fresh Codex session if the Skill list has not refreshed. Use the Skill path under this checkout's `.agents/skills/`, as required by [the routing rules](skill-routing.md). No separate global installation or plugin update is required.

The source revision trail above and the root lock apply to the seven Skills only. The existing 18-Skill inventory, explicit-only invocation policies, approved Flutter baseline, and Figma licence pins remain in force. No product source, application dependencies, MCP configuration, or authentication state is changed. Application suites are not claimed for this tooling-only update.
