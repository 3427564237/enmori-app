# v19 Home automatic-weather device check — 2026-10-22

Scoped owner authorization: temporarily enable Home automatic weather, use foreground approximate location, verify persistence and withdrawal, and finish OFF. This closes the pending permission/persistence item in the [v19 integration checkpoint](https://github.com/3427564237/enmori-app/blob/292b28423e58fd7525464d78a6b824e221226999/docs/evidence/sprint3/2026-10-22-li-group-v19.md) only; it is not whole-App acceptance.

Same installed vivo V2405A package `com.enmori.app.group`, versionCode 19 / `1.0.0-group20261022` (verified again). APK/source binding remains the existing integration record: SHA256 `f5fb967e9565cb145bfebd2f0d92f87ce2240d2df7e25699f9182e6cb903e876`, build source `7c9d2b6`, product source `1c82b62` matching UI `e00ece3`. Used the existing active `enmori-group.service` / controlled Firebase environment; no service restart, rebuild, installation, sign-out or data reset.

| Actual device action and independent owner Settings readback | Result |
| --- | --- |
| Baseline | revision 2; Home auto false; Check-in location/weather true/true |
| Enable in Settings, Save, leave and reopen Settings | switch ON; revision 3; Home auto true |
| Visit Home | real weather displayed, with Open-Meteo and CC BY 4.0 attribution; no repeated in-app permission dialog |
| Profile → Home within the automatic interval | weather display and update time unchanged; revision 3 still true |
| Disable in Settings, Save, leave and reopen Settings | switch OFF; revision 4; Home auto false |
| Return Home after withdrawal | cached conditions and automatic-update copy removed; manual Get local weather restored; no pending indicator |

Final independent readback: revision **4**, `homeWeatherAuto=false`, both Check-in defaults **true**. A private hash comparison confirms field privacy, Check-in visibility, optional-processing consent and both defaults were unchanged. No new Check-in or AI message was submitted. No precise location, credentials or personal screen content is included in this record.

No confirmed defect or product-code change. The shipped implementation requests low-accuracy foreground location and rounds to 0.1° before the weather request; coordinates were not captured for verification. This short pass demonstrates cached display continuity, not an instrumented count of location/network calls or a full 15-minute refresh cycle. Withdrawal occurred after successful completion, so late in-flight result fencing remains supported by the existing targeted controller check (`Home automatic preference survives navigation, caches, revokes late GPS and resets on logout`), not a new hardware race reproduction. No tests rerun. Product remains frozen; PR #169 remains Draft; no main merge.
