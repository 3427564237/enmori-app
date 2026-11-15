# LI — Home hierarchy and contextual Interest editing

Date: 15 November 2026 (Asia/Singapore). Authority: LI / PM in the current UI review chat.

Following the read-only layout review, LI clarified that “Interest” means the interest-preference/editing entry, then approved: “那就先按你说的这几个修改，完成后给我看实际界面效果，并检查有没有新的布局和交互问题。”

## Approved scope

Implement the five recommended first-pass changes on the v72 client baseline: consolidate Home's welcome/today information, integrate optional Home weather into that area, put Interest editing beside its Profile content, compact today's existing Check-in summary, and place the activity-area selector with event recommendations with clear purpose. Show rendered production Flutter widgets and check affected layouts and interactions. Keep existing dependencies, theme, navigation destinations and data contracts.

The Home introduction uses a lightweight greeting instead of the full Profile editor/visibility header. The primary Check-in action stays before asynchronously sized weather/day/recommendation content. Weather is visually grouped with the introduction, beneath that action. Interest editing uses its existing guarded route and fresh readback; the Profile Interest heading owns the edit action. The activity-area selector retains its existing selection and automatic restoration behavior.

## Preserved sources and supersession

- The [21 October UI decision](2026-10-21-li-product-ui-redesign-and-defaults.md) still governs ENMORI branding and the five bottom destinations; this decision changes only the listed placement and density choices.
- The [22 October Home-weather decision](2026-10-22-li-ux-priority.md) and [Q13](2026-09-02-production-weather-contract.md) retain optional consent, foreground lookup, approximate location, refresh, attribution, licence and modification notices. Required notices remain next to displayed weather; no consent or provider change is approved.
- The [12 November usability repair](2026-11-12-li-usability-repairs.md) retains the stable primary action, lifecycle guards and truthful loading/error behavior. Replacing the compact Home Profile header is a presentation supersession only; Profile retains the full controls.
- Today's maximum three entries, owner/date/IANA-zone read and refresh/navigation guards remain. Compact labels and date/zone information presentation do not change the queried day or data.
- Q12 Interest identity, matching, visibility, persistence and optional onboarding remain unchanged. No new profile fields, recommendation rule, backend, service, dependency, release acceptance or main merge is implied.

## Evidence boundary

Produce actual Flutter raster previews with explicitly synthetic data and relevant widget/regression evidence. Distinguish these from connected services, installed APK and physical-phone observations; a device is not connected at start. Do not alter account settings or records to manufacture evidence.

## Same-day physical-device follow-up

After reviewing the v73 candidate, LI explicitly requested: “把 v73 安装到手机上，保留现有数据，再检查一下真机上的布局和交互有没有问题。” LI then confirmed that the original phone was connected and USB debugging allowed. This authorizes a retained-data update of that phone to the already delivered v73 artifact and bounded physical layout/interaction checks. The resulting observations are recorded in the [v73 physical-device verification](../evidence/2026-11-15-home-layout/phone-v73-verification.md); they do not replace the earlier source/widget evidence or establish full UAT.
