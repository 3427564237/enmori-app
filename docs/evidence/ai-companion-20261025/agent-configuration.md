# Verified development-agent configuration

Date: 25 October 2026, Asia/Singapore. Common source baseline:
`b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.

All seven configurations were independently read from the current local Codex
rollout `turn_context` records. These are actual recorded model/effort values,
not merely text inside a task prompt or a successful create request. Integration's
current turn is `01a1719f-b31e-7112-976a-99f180029e39` and records
`gpt-6-astra` / `max`. Each worker was created with explicit `model` and
`thinking: "max"` arguments, and all six matching values were observed.
No configuration is unconfirmed and no downgrade was made at this checkpoint.

| Chat title | Thread ID | Worktree | Observed model / effort |
| --- | --- | --- | --- |
| ENMORI AI Companion｜Product / UX | `01a171a5-56ba-7a72-aa6a-61533992773b` | `/home/miku/.codex/worktrees/00ce/ENMORI` | `gpt-6-astra` / `max` |
| ENMORI AI Companion｜AI Runtime / Models | `01a171a5-707c-77a2-8ddc-fbda24e4c089` | `/home/miku/.codex/worktrees/45f3/ENMORI` | `gpt-6-astra` / `max` |
| ENMORI AI Companion｜Context / Backend | `01a171a5-7307-7211-b98c-7225891ed085` | `/home/miku/.codex/worktrees/bc19/ENMORI` | `gpt-6.1-sol` / `max` |
| ENMORI AI Companion｜Proactive / Delivery | `01a171a5-7c5f-7c01-b2a9-220586a26f84` | `/home/miku/.codex/worktrees/f74f/ENMORI` | `gpt-6.1-sol` / `max` |
| ENMORI AI Companion｜App / UI | `01a171a5-7eca-7221-8a26-c7fc5fe1beb9` | `/home/miku/.codex/worktrees/fe1e/ENMORI` | `gpt-6.1-sol` / `max` |
| ENMORI AI Companion｜QA / Evaluation | `01a171a5-81c3-7ba0-a07b-f57440ea5e6d` | `/home/miku/.codex/worktrees/30e0/ENMORI` | `gpt-6-astra` / `max` |

Integration worktree:
`/home/miku/.codex/worktrees/ai-companion-integration-20261025/ENMORI`.
The exact turn IDs, local evidence paths, requested/observed configuration,
branch names and initial HEADs are in the owner-local launch
`/home/miku/.local/state/enmori-ai-companion-20261025/roster.json`.
All worker initial HEADs matched the common source baseline and each created its
assigned role branch. All six were observed active through `wait_threads`;
startup commentary confirms that each began its own source/design audit.

The fixed baseline's calendar gateway has the same SHA-256 as the active
`7a3c4fa` checkout:
`37e0b75ede529b4825c11874084dde696c234c9898db904cdeaba4d47c480068`.
All six original uncommitted reference inputs still matched their preservation
manifest after startup. No runtime deployment, model call, APK build or device
write was performed for this configuration/launch check.

This establishes startup and source preservation only. Product A/B/C selection,
cloud data/budget, proactive delivery and module acceptance are not established
by configuration or by the creation of a work chat.

