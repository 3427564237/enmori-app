# Home hierarchy and Interest placement

Authority: [LI's five approved refinements](../../decisions/2026-11-15-li-home-layout-refinement.md). Base: v72 source/evidence head `2c7cf70e`. Branch: `souma/home-layout-20261115`.

## Delivered presentation

- Home's lightweight greeting, Today/date, primary Check-in action and optional weather share one introduction surface. The full Profile editor/visibility header is no longer repeated on Home. The greeting keeps one line across loading and successful profile reads; full identity remains on Profile.
- Weather is below the action inside that surface. Loading, failure, refresh and clear cannot move the primary action. Existing consent, source/licence links, normalization notice and observation timestamp remain. Compact treatment applies only to Home; saved Check-in weather keeps its prior presentation.
- Profile's Interest heading owns its existing Edit interests action. Returning from editing rereads the same Interest controller. The remaining History/Footprint shortcuts share the available width; an absent shortcut group no longer leaves an empty heading.
- Today's summary uses compact entry previews and a header History action. It still reads at most three owner/day records, opens full records and refreshes after return. The date and IANA zone remain in the heading tooltip/semantics; query rules are unchanged. Sparse pages with a cursor still say that history may contain more records.
- The existing area selector sits inside the event-recommendation section, explicitly labelled Activity recommendation area. Choosing, cancelling, restoring automatic selection, catalogue failures and retry retain their existing behavior.

## Rendered production widgets

These PNGs are Flutter raster captures of the actual changed production widgets with **synthetic repositories**, not design mockups, actual account data or physical-device screenshots. The Home composition includes the real greeting, weather controller/view, day summary, area selector, recommendation card and participation controls; Profile uses its production page. Fixture callbacks permit local interaction checks without account or network writes. Existing full-router tests separately exercise the destination/readback routes.

Locally available Roboto, Material Icons, Playfair Display and a CJK fallback are loaded for deterministic inspection. The CJK fallback is test-only and does not change the app's font assets or runtime theme. Physical-device/system fonts may differ.

| View | English | Chinese |
| --- | --- | --- |
| Home, 375 × 812 | [Home](previews/home-en-phone.png) | [首页](previews/home-zh-phone.png) |
| Activity area and card | [Events](previews/home-events-en-phone.png) | [活动](previews/home-events-zh-phone.png) |
| Profile, 375 × 812 | [Profile](previews/profile-en-phone.png) | [我的资料](previews/profile-zh-phone.png) |
| Home, 320 × 640 | [Narrow](previews/home-en-narrow.png) | [窄屏](previews/home-zh-narrow.png) |
| Home, 320 × 640, 2x text | [Large text](previews/home-en-large-text.png) | [大字](previews/home-zh-large-text.png) |
| Activity area, 812 × 375, 2x text | [Landscape](previews/home-events-en-landscape.png) | [横屏](previews/home-events-zh-landscape.png) |

Additional inspected states: [loading](previews/home-loading.png), [weather refresh failure](previews/home-weather-failed.png), and [weather off / empty day](previews/home-weather-off-empty-day.png). All display content in these captures is synthetic. The failed-refresh capture intentionally preserves the previous weather and its timestamp while displaying the failure, as the existing controller specifies.

## Checks and fixes during review

- A new scroll-away/return regression first reproduced an extra profile read after the introduction was regrouped. Retaining the existing Home-section keep-alive boundary fixed it; the test now checks profile/settings read counts and primary-action bounds.
- Default-font 320-wide, 2x router coverage exposed a 13-pixel overflow in the summary's action row. Wrapping the actions fixed the reproduced case. Captured-font and default-test-font cases are both checked.
- A sparse day page initially repeated its history hint. The summary now shows only one applicable hint.
- Interest editing remains in the Interest section, retains a minimum 48-high target and triggers a fresh read on return. Removing it from shortcuts no longer leaves an unused grid column or empty group.
- Area selection is checked through the actual clickable button, including cancellation without location/profile/settings writes. The test scroll helper settles lazy sections between gestures instead of measuring an offstage cached layout container.
- Existing Home-scroll/navigation, Interest/Profile/Admin routes, weather consent/refresh/clear, day lifecycle/owner fences and date-zone routing regressions are included in the full Flutter run. New viewport checks cover English and Chinese, 375/320 portrait, 812 landscape, normal/2x text and reduced motion.

The machine-readable [verification receipt](verification.json) records final command outcomes and raster hashes. Test runs overlap; their counts must not be added.

## Acceptance boundary

No account settings, interests, records or real service data were changed for verification. There is no new backend or deployment work. Widget evidence does not establish network readiness, physical-phone behavior, a screen-reader audit, iOS acceptance or full UAT. No device was connected at the beginning of this work; any signed Android candidate and final device check are recorded separately.
