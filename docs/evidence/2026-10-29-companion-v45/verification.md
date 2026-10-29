# v45 companion build repair

Source: `2fed011`. [Confirmed repair](../../decisions/2026-10-29-li-companion-build-repair.md).

The v44 private define file lacked `ENMORI_AI_COMPANION_FIRST_FLOW`. Dart's
compile-time default is false; that removes Check-in reference/today-context,
follow-up entry routes and Check-in-to-companion callbacks independently of the
local model. The private file now explicitly enables it, with an owner-only
backup. No private define values, account IDs or credentials are copied here.

Android group release configuration now fails early when this flag is absent
or false. An actual Gradle configuration check with missing defines failed with
the expected requirement message before signing. Ordinary/test build defaults
remain unchanged. 27 focused tests passed, covering companion routing, today's
sources, session fences, no-description overview cards and full official details.

Live read-only service status still reports firstFlow configured true,
workerConfigured false, pushConfigured false. No scheduler, device registration,
user consent, appointment or push was enabled by this repair. The proposed
operational completion is [separately reviewable](../../planning/2026-10-29-proactive-runtime-activation.md).

The signed v45 build passed in 61.7 seconds, with the same package/signing certificate as v44. The receipt records companion selection true and no installation binding. ADB was empty; no physical installation or delivery is claimed. LI subsequently approved continuous operation and real push in a separate decision; the next delivery candidate will include the explicit installation binding.
