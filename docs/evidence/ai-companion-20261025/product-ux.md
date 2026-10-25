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

## Later decision — C entry approved

The preceding delivery paragraph records the pre-selection state. LI subsequently selected **C：连续主入口＋历史／新话题（推荐）** in Integration's human reply `01a171b5-67bd-7ff0-9cfc-023225279b93`, answering the question explicitly limited to entry form. Product independently read that original human reply and the formal decision at Integration commit `2bb638b47e682217007cf02cd505550d88d627cf`, canonical path `docs/decisions/2026-10-25-li-ai-entry-c.md`.

Only P1 is resolved: continuous daily access with existing conversation containers, History/current-conversation search/New topic, whole-conversation deletion, retention, single-draft handling and current session/unknown-result guards. New source UI/data purposes, proactive identity/storage/delivery/retention changes, cloud/provider/budget, location processing and new persistence remain unapproved where no specific contract exists. Prototype controls do not authorize them. App may implement the confirmed entry increment through existing boundaries under Integration coordination.

The initial comparison/prototype is retained, not rewritten as if C had been selected at creation. This documentation-only follow-up stays on the original worker branch/baseline; the Integration-owned decision is read by exact commit, not copied into this worker's ownership. No browser, Flutter, model or device checks were rerun for this status annotation.

## Source findings and cross-role review

- Q19 allows whole-conversation deletion, not individual-message deletion, and keeps existing source provenance Backend-only. P2 therefore needs a new minimal UI display/navigation contract.
- Q14 expires at 90 days after `lastPersistedMessageAt`; proactive writes could keep older content available longer. P7 explicitly remains undecided.
- Q17 disallows user location, including Approx Location, in Qwen; old GPS records/general consent do not grant this use. The prototype has no location attachment control.
- Existing `AiConversationSummary` has ID/time only; lookup is current authorized loaded messages, manual earlier pages, no cross-conversation title/index guarantee.
- App independently flagged UTF-16 `maxlength` vs the current 2400-rune contract and the first prototype's per-topic draft map. Both were corrected: scalar counting, one current draft, confirmation before cross-topic notification/reply, and the same unknown-operation fence.
- Integration/QA flagged exclusion through dependent automatic history; reference copy and handoff now explicitly exclude the record and its dependent automatic history references, while preserving original records and text the user actively types. The prototype does not prove the backend dependency closure. Later Context `8ce74a8` integration wording clarifies `invalid_selection` requires review/re-prepare, never silent success. App also clarified plain-text body plus trusted reference sidecar and the distinction between an admitted outgoing text and an editable unsent draft.
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

## Approved first-flow follow-up — early F0 handoff

On Integration's renewed assignment, this clean worker fast-forwarded from `c7adc9837850972018ddd91b3c5491256f09a230` to common baseline `26af8c95da4fa00b76f841952d742d9da8c07e5c`. Product independently read LI's original answer `01a171cc-8f2f-78d2-a909-d1472f097376` ("按推荐范围实现（推荐）"), the durable `docs/decisions/2026-10-25-li-ai-companion-first-flow.md`, and the approved portions of Context/Proactive plus QA's contract reconciliation.

The later decision supersedes only the specified earlier pending boundaries: F0 explicit saved-user-message follow-up with R-ANCHOR, F1a exact hand-selected own Check-ins for one local reply, minimal source cards/resolver/receipts/read-state, and the pinned D1 Android push implementation candidate. Earlier proposal paragraphs above remain historical. F1b, location, automatic Check-in/Going triggers, wider cloud personal processing and actual deploy/register/send/device actions are not added.

[Minimal F0 handoff](../../design/ai-companion-20261025/first-flow-handoff.md) is delivered first so App can implement without waiting for all prototype screens. It covers separate settings/create outcomes, original-intent readback on unknown outcomes, explicit time/IANA confirmation, default-off and bounded controls, typed source/anchor navigation, actual visibility before read acknowledgement, and bilingual copy. This documentation increment changes no production code and makes no new browser/native/runtime claim. The same visual prototype will be updated next within the approved F0/F1a scope.

## Approved F0 / F1a prototype and specification

This follow-up reuses the original green/paper layout and components. Current `index.html` presents selected C and the approved F0/F1a flow; the original A/B/C decision comparison and earlier Git revisions remain historical evidence. Updated deliverables are [F0 handoff](../../design/ai-companion-20261025/first-flow-handoff.md), [interaction specification](../../design/ai-companion-20261025/interaction-spec.md), and the same [HTML prototype](../../design/ai-companion-20261025/index.html).

- F0 starts on a saved synthetic user message, displays civil time/IANA/offset/instant, requires explicit confirmation, and separates settings save from intent creation. Unknown create/cancel uses the original status path. Follow-up unknown prevents duplicate scheduling without being mislabelled as chat Send unknown. No model call occurs at create.
- App identified the missing arbitrary-IANA civil-to-UTC resolver. Product supplied gap/fold/unknown copy and actions to App/Integration: preserve input, hold on unresolved mapping, use only trusted resolver candidates, clear prior resolution after edits, and never use device-local conversion for another IANA. Integration owns the platform TimePort; the prototype resolves only its fixed Singapore fixture.
- F1a hand-selects at most 5 eligible own Check-ins in the inclusive 7-day fixture window; a sixth and an older item are disabled. Review/exclusion precedes explicit Send. A dependency-conflict scene requires explicit dependent-pair exclusion and recheck, preserving draft and original history. Success clears request-local selection; unknown retains it.
- Saved-message source sidecars are read-only and separate from the next request's picker. No automatic source attachment results from viewing them. Message visibility produces pending read status; only the simulation's explicit read-sync outcome clears unread. No numeric unread total is inferred from a partial transcript.
- Contact off/paused, timezone unresolved, provider disabled/unknown, expired follow-up, source changed/unavailable/unknown, and message Send unknown remain distinct. Events, automatic Check-in/Going contact, location and cloud personal replies have no enabled controls in the current flow. Lock-screen choices remain generic/hidden.

### Browser verification of this increment

Cached Playwright CLI / Chromium, loopback server and direct `file:` opening only; reduced-motion emulation enabled. No dependency install, Flutter/Gradle/APK or real service, model, registration, push or phone operation.

The first focused run passed 8 of 10 scenario groups. Two failures were preserved: after entering draft text, clicking follow-up or references did not navigate. Reproduction showed the newly broad `change` handler rerendered on textarea blur and removed the imminent click target. The fix limits that handler to its actual settings/confirmation controls. Both failed groups then passed in a focused rerun. Final focused checks also verified separate follow-up/chat unknown barriers, clearing discarded per-topic selection conflicts, and direct-file F0 navigation.

Observed scenario coverage: saved user → time/zone confirmation → settings unknown → original intent readback → cancel unknown; quiet/past/zone validation and renewed confirmation; F1a count/window/review/exclude/explicit Send; dependent-history conflict; unknown source no cached body; saved sidecar vs request selection; visible-before-read-sync and reply association; off/pause/disabled/unknown/expired; deleted/revoked content; single-draft notification and chat unknown guards; local-only UI and 2400/2401 Unicode scalars.

Layout measurement covered Home, F0 form and reference review at 320×568, 375×812, 390×844, 844×390 and 1440×1000. No page or screen horizontal overflow; rendered phone buttons measured at least 48 CSS px. At 390px English large text, the composer was visible and its center hit the textarea. Visual inspection then shortened a wrapping English placeholder and refreshed its screenshot. Native dp/system text, soft keyboard and TalkBack are not established by these HTML checks.

All 11 delivered screenshots were opened for visual inspection: desktop, Home, proactive detail, reference review, settings, English large text, F0 source/time, F0 final confirmation, unknown appointment, Check-in picker, dependency conflict. The final confirmation and unknown-state captures were refreshed after their copy/state refinements. Console readback reported 0 errors/warnings. Observed network resources were only the prototype HTML/CSS/JS and repository font through loopback or local files; no remote service request was observed.

Raw scripts/results remain owner-local under `/home/miku/.local/state/enmori-ai-companion-20261025/product-ux-browser/`: `approved-flow-first-results.txt`, `approved-flow-repair-results.txt`, `approved-layout-results.txt`, `approved-final-results.txt`, corresponding `*-raw.txt`, `approved-console.txt` and `approved-requests-full.txt`. The first failures are retained, not overwritten by the passing rerun.

This is Product's synthetic browser evidence, not independent QA or proof of real source authorization, bounded prepared-operation closure, backend persistence/read watermark, platform civil-time parsing, scheduler/delivery, model semantics or native readiness. Exact-commit independent QA is requested separately. The role changed only its design directory and this evidence file. No push, PR, deployment, real account write or device action was performed.
