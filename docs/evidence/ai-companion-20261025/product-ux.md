# Product / UX — 25 October 2026

Scope: A/B/C product comparison, source audit, synthetic interactive phone prototype and design handoff. No production behavior or data change.

## Authority and environment

- Read LI's original attached request at the Integration attachment path and the confirmed round decision, repository AGENTS/routing/architecture/handoff, 19/24 October AI decisions and v26 evidence.
- Actual workspace `/home/miku/.codex/worktrees/00ce/ENMORI`; initial clean detached HEAD `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`; branch `souma/ai-companion-product-ux-20261025`. No second worktree created. Initial `list_artifacts` was empty; cwd/head were independently verified.
- Actual development model verified from this chat's `turn_context`: `gpt-6-astra`, `effort=max`, turn `01a171a5-61f3-74b3-8c1f-e660fd13dd09`. Integration's local roster independently matches. This does not select the ENMORI app model.
- Only repository design directory and this role evidence are delivered. Used repository `ui-ux-pro-max`, later repository `systematic-debugging`, and Playwright workflow for browser verification. No brainstorming/planning approval flow added.

## Deliveries

First decision packet: `22e8bea4bf71fc2404d357b64a695985202a9633`, [product-choices.md](../../design/ai-companion-20261025/product-choices.md). Integration independently read it. A mistaken chat placeholder was immediately corrected to that exact SHA; it was never a real commit.

[Clickable prototype and opening instructions](../../design/ai-companion-20261025/README.md) and [interaction specification](../../design/ai-companion-20261025/interaction-spec.md) are included with this evidence commit.
The prototype is proposed, synthetic and session-memory only. Local URL during review: `http://127.0.0.1:8764/docs/design/ai-companion-20261025/index.html`.

C is the recommended candidate, **not LI-selected**. It first preserves existing Conversation containers, current-conversation search, history, whole-conversation deletion and the current retention contract. UI reference projection, proactive identity/delivery, cloud processing, position data and retention-anchor changes remain separately pending.

## Source findings and cross-role review

- Q19 allows whole-conversation deletion, not individual-message deletion, and keeps existing source provenance Backend-only. P2 therefore needs a new minimal UI display/navigation contract.
- Q14 expires at 90 days after `lastPersistedMessageAt`; proactive writes could keep older content available longer. P7 explicitly remains undecided.
- Q17 disallows user location, including Approx Location, in Qwen; old GPS records/general consent do not grant this use. The prototype has no location attachment control.
- Existing `AiConversationSummary` has ID/time only; lookup is current authorized loaded messages, manual earlier pages, no cross-conversation title/index guarantee.
- App independently flagged UTF-16 `maxlength` vs the current 2400-rune contract and the first prototype's per-topic draft map. Both were corrected: scalar counting, one current draft, confirmation before cross-topic notification/reply, and the same unknown-operation fence.
- Integration/QA flagged exclusion through dependent automatic history; reference copy and handoff now explicitly exclude the record and its dependent automatic history references, while preserving original records and text the user actively types. The prototype does not prove the backend dependency closure.
- Proactive supplied proposed off/category/limit/quiet/zone/lock-screen options and R-ANCHOR / R-SPLIT / R-EXTEND terminology. Values remain clearly proposed. QA confirmed the first packet's authority boundaries and supplied additional Q17/retention counterexamples.

## Browser observations

Used cached Playwright CLI in named session `enmori-product-ux`, a loopback-only Python static server, and Chromium. No package/dependency install, Flutter/Gradle/APK, live model, Firebase, notification or phone action.

Observed passing synthetic paths: proactive reason/source/reply; reference exclusion/attachment; history search/failed-page draft retention; new-topic boundaries; deletion isolation/no resurrection; explicit cloud/local failure; changed-source send block; deleted/revoked/late/cancelled message unavailability; contact/pause/unknown zone; explicit follow-up confirmation; first-use choice; A/B/C retained capabilities. Later focused checks cover source-read unknown, 2400/2401 emoji scalars, notification single-draft handling, notification unknown-result guard and direct `file:` opening.

Layout checks at 320×568, 375×812, 390×844, 844×390 and 1440×1000 found no page horizontal overflow; sampled active app buttons met 48 CSS px height. Reduced-motion emulation was enabled. English large-text mode was inspected and its composer hit-tested visible after repair. These are HTML measurements, not native dp/system-text/TalkBack acceptance.

Preserved failures and repairs:

1. Initial browser favicon request returned 404; an explicit empty data favicon removed it. Final console check had zero errors/warnings.
2. Initial synthetic delete used one shared boolean and hid both history rows. Reproduced by click and snapshot, changed to per-conversation deletion, verified remaining history and stale notification no-resurrection.
3. Initial composer reference/location buttons were 40px high. DOM readback identified the override; increased to 48px and remeasured.
4. First English large-text screenshot clipped the composer despite no page overflow. DOM readback showed `max-height:42%` shrank the child to 79px within its 188px parent. Removed that percentage cap, re-captured and verified the input hit target. A no-overflow measurement alone was not treated as visual acceptance.

Raw browser output/snapshots remain owner-local under `~/.local/state/enmori-ai-companion-20261025/product-ux-browser/`. Selected final screenshots are committed in the design directory. No private content is used.

## Unverified layers

Independent QA of the exact prototype delivery remains a separate record. This is not production Flutter, backend/source-contract acceptance, actual model quality or latency/cost evidence, real notification delivery, APK/physical-device acceptance, upgrade/migration verification, UAT, Release or Done. Small-plan semantic failure remains unresolved. Nothing was pushed, deployed, merged to main or written to a real account.
