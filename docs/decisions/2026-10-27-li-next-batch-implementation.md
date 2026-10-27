# LI — Next feature batch implementation

Date: 2026-10-27 (Asia/Singapore). Confirmed by LI.

LI requested “根据清单实现下一批新功能。” The first implementation batch
contains authenticated avatar visibility and priorities 1–3 in the
[confirmed list](../planning/2026-10-27-li-next-increments.md).

After reviewing the [minimal avatar contract](../planning/2026-10-27-avatar-contract-proposal.md),
LI explicitly confirmed “按这套最小方案实现”. That contract is approved for
this implementation. It supersedes only the corresponding owner-only avatar
presentation and wire/storage limitations, preserving the original contract
and [visibility decision](2026-10-27-li-avatar-visibility.md). No deployment or
real-photo publication is implied.

Implementation details within the approved list: activity shortcuts compare
start dates in device-local time. Today includes the current civil day; weekend
is Saturday and Sunday of the current week (including today on Sunday); seven
days includes today and the following six dates. The default retains source
order; earliest/latest sorting is optional and applies to loaded events only.

Prompt cards fill only an empty Note with editable writing prompts. They never
set Mood, Activity, location, visibility, or save a record. Search performs
sequential existing own-history reads over a user-selected inclusive date range,
using the captured device IANA zone and opaque per-day cursors. It matches Note,
Activity and place label, shows progress and partial results, supports Stop and
retry, and never calls partial results complete. New reads establish authority
on return; session/access changes invalidate results and in-flight responses.

These are implementation choices, not new business requirements or changes to
source ranking, visibility, model inputs, dependencies or infrastructure.
