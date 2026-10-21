# Content feedback increment — PR #169

Baseline: `c40f4dd841e263dcafd2def84397dda41fbb28f7`. LI integration `901602ef96db12a8a4a8ebba1698a311e1e3a8a6` contains that cherry-pick; the affected production files matched before this increment. Existing approval: S-PM-1021-LI-PRODUCT-UI-DEFAULTS; scope follows the main chat's v17 feedback.

These are actual Flutter production widgets at 375 × 812, rendered with representative **synthetic content**. Home now uses `ConnectedRecommendationCard`, the real participation controller and Backend repository/parser with an isolated HTTP peer, including committed Going state. They are not live-provider, device or APK evidence. Before images use the baseline; after images use this commit. The static after captures also enable reduced motion.

| Surface | Before | After | Reason |
| --- | --- | --- | --- |
| Home, confirmed Going | [Before](before-home-phone.png) | [After](after-home-phone.png) | Keep Interested/Going and the selected state in the card; cancel, ignore/restore and refresh move to More event options. No extra Home entry. |
| Events browse | [Before](before-events-phone.png) | [After](after-events-phone.png) | Reduce the shared category banner height; keep title, dates, available location and details intact. Event detail uses the same compact participation controls. |
| Check-in, pending default GPS | [Before](before-check-in-phone.png) | [After](after-check-in-phone.png) | Save reflects its existing busy guard. Inline waiting text and Cancel location offer a clear path to saving without GPS; cancellation does not save automatically. |
| AI, pending outgoing message | [Before](before-chat-pending-phone.png) | [After](after-chat-pending-phone.png) | Combine dots, waiting status and Cancel. AI Safety & permissions is available in the drawer after history; its wording and all exceptional recovery actions remain. |

Unknown Event writes keep changes disabled and expose Check current plans (GET only); no automatic resend. Menu actions retain the session and participation version captured at render. Normal loaded cards have no technical Read participation button. Check-in cancellation is epoch-guarded; permission failure permits location-free save and an unconfirmed save retains its original retry identity. No weather/API/backend changes.

During reduced-motion capture, the baseline's zero-duration AnimatedSize asserted on label relayout. MotionSize now renders the final child size directly when animations are disabled; ordinary motion timing is unchanged.

Validation: 24 selected widget checks passed across the changed flows, including local reruns of two corrected test finders; 12 cover stale menu/button actions across session/version replacement. Check-in cancellation/failure and unchanged-key retry were rechecked after the cancellation epoch guard. One four-page capture check passed; final Flutter analyze and git diff --check pass. Initial compile/lint mistakes were corrected before final validation. No full suite, Backend suite, emulator, APK, device, service or deployment work.

Pending with main chat: install the next combined APK; confirm thumb reach/menu discovery, keyboard/scroll behaviour and the actual GPS permission/cancellation timing. This increment has no new physical-device acceptance. The reported weather timeout remains with main chat; no historical data or weather contract was changed.
