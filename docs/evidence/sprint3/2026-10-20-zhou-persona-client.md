# ZHOU Persona client delivery evidence — 2026-10-20

Source: the transferred revised ZHOU package activates its scope under S-PM-1019-LI-LOCAL-UI-HANDOFF. Product authority remains S-PM-1019-LI-CORE-SINGLE-CHAT and S-PM-1019-LI-AI-MVP, with the existing Persona concurrency/privacy contract. Checkout baseline: `927f77527b32d349aa08020f7de0e88402edb9c7`; branch: `codex/zhou-ai-persona-experience-20261020`. Final combined commit and bundle are recorded by the package receipt. This note covers the Persona client only, not the other package owners' work or real-device acceptance.

## Delivered

- `PersonaFields`, the strict Backend mapper, editor and readback summaries retain the four legacy fields and enums. Optional `relationship`, `shortIntroduction`, `description`, `personality`, `communicationStyle`, custom `interests` text and `extraInstructions` round trip without trimming their content. Missing legacy fields default to empty; present wrong types/malformed Unicode fail closed. No invented per-field product length cap was added.
- The full editor inherits the shared theme, local Playfair typography, Material icons, field labels and buttons. Dirty exit, maximum five, unique current selection, optimistic revision conflicts, uncertain-create reconciliation, delete-current reset, confirmed write/readback and cancellation remain on the existing session/Repository paths. More options exposes the same Edit/Delete actions and existing confirmation. Save/recovery feedback scrolls into view; keyboard traversal remains usable with the longer form.
- Try Your Persona opens an independent snapshot of the current draft. It never calls CRUD, selection or conversation endpoints, never persists, never automatically retries, and does not alter the original draft on return. One-turn preview uses only `{draft, text}` and accepts exact `{message}`. Authentication, consent and observed session changes clear the preview, prevent stale dispatch and ignore late replies; permission defaults to false until explicitly composed.
- The new HTTPS adapter disables redirects, uses one original 60-second budget, checks eligibility around token/send/delivery, sanitizes remote error copy, checks exact success/error shape and status/code agreement, and retains no logs, tokens or preview content. The Backend owns its shared generation lane, including delayed model completion after disconnect/timeout; the client never releases that lane.

## Checks performed

On FVM Flutter 3.47.2 with the existing locked dependencies:

- `fvm flutter test --no-pub test/features/personas --reporter compact`: **105/105 passed** before the final More-options UI addition.
- After that addition, `fvm flutter test --no-pub test/features/personas/persona_pages_test.dart test/features/personas/persona_accessibility_test.dart`: **47/47 passed**, including the new More-options test. The combined current Persona set has 106 cases covered by these runs.
- `fvm dart analyze lib/features/personas test/features/personas`: no issues; `git diff --check` clean. No dependencies, global theme, router/bootstrap, controlled runtime or unrelated feature files were changed by this client slice.
- Strict tests cover every field through create/read/edit, legacy empty defaults, malformed fields, exact preview DTOs, error/status mismatch, consent changes while waiting for tokens, original deadline enforcement, late reply suppression, same-UID replacement, auth observation errors, manual preview recovery, and editor-draft preservation with no save/activation during preview.
- Widget checks include the existing 320×640/640×320 with 2×/3× text, keyboard/dialog semantics and dark-mode checks, plus preview at 375×812/812×375 with 2.5× text, light/dark themes and reduced motion. The longer form revealed focused-field scrolling and preview lazy-form disposal issues; both were reproduced and fixed, with their focused tests passing.
- UI/UX workflow: read the repository `ui-ux-pro-max` pro-rules and quick-reference sections 1–3; targeted `inline form validation --domain ux` returned Inline Validation, Focusable Error Summary (web-only) and Submit Feedback. Applied native field feedback, explicit labels/focus, visible async outcomes and theme inheritance; no replacement design system was generated.

## Minimal LI composition

Keep the existing Persona CRUD provider and page routes. Import `features/personas/persona_preview_providers.dart` and `features/personas/data/backend_persona_preview_repository.dart` in the composition root. Supply:

```dart
personaPreviewRepositoryProvider.overrideWithValue(
  BackendPersonaPreviewRepository(
    baseUri: backendBaseUri,
    tokenProvider: observedSessionTokenProvider,
    client: ownedHttpClient,
  ),
),
personaPreviewAccessProvider.overrideWith((ref) {
  final settings = ref.watch(observedAccountSettingsProvider);
  return settings.isReady && settings.consentAccepted;
}),
```

The identifiers above describe existing composition-owned sources, not new providers to add to a feature. Use the same current authenticated session and existing account settings observation; loading/error/saving/withdrawal must yield false. Do not use a one-time captured consent bool. The app owns the HTTP client. Editor navigation to preview is already internal and needs no new global route. Backend registration must use the real retained environment's approved Auth/consent authority and existing single-model transport; the package provides its explicit registration seam separately.

## Local acceptance still required

Real Ollama, retained emulator/backend, installed APK and real device checks: **Not Run on this Windows client slice**. LI should save/reopen all fields, create five and observe the sixth blocked, activate a different Persona and read back its unique current status, cancel and confirm deletion including deletion of current, test concurrent edit/reload and unsaved exit, preview an unsaved change and verify saved Personas/selection/history are unchanged, then withdraw consent or switch account during preview. Verify three relevant real model turns and new/history recovery using the combined chat package. These are acceptance instructions, not claimed results. Review path remains ZHOU → LI; this author has not self-approved or merged the package.
