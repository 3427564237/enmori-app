# Restore the existing companion entries in the group APK

Date: 29 October 2026, Asia/Singapore. Authority: LI HOURUI, PM.
Source: LI identifies the v44 packaging omission of the companion first-flow switch, explicitly distinguishes it from local-model selection, and notes that scheduling/push are not configured.

Restore `ENMORI_AI_COMPANION_FIRST_FLOW=true` in the existing private group build configuration. Group release builds must reject absent/false companion selection so routine activity/UI updates cannot silently remove the approved Check-in reference/today context, later-contact management and Check-in-to-companion routes. Other build modes retain their defaults; the local Qwen choice is unchanged.

This repairs the existing approved entry integration from the [25 October core decision](2026-10-25-li-core-experience-repair.md). It does not enable user consent, create appointments, upload a device registration, send notifications or extend the prior 30-minute worker window. Keep notification auto-init off without an explicit installation binding/user opt-in. Source/UI/build/phone/scheduler/push evidence remain separate.

The current private runtime contains a fixed first-flow owner but no worker. The real-entry parser currently rejects all push configuration and only accepts a nonrenewable worker of at most 30 minutes. Those restrictions and the earlier no-real-push authorization are recorded, not silently bypassed by enabling the client switch. Actual recurring service operation and real notification delivery need an explicit updated operational scope and subsequent implementation/verification.
