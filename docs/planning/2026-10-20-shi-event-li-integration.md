# LI integration note — Event partial increment

Base: bundle927f775 / feature51ecb5c. Branch:
`codex/shi-events-participation-20261019`. SHI author -> ZHOU independent review.
This is a partial source contribution, not a new accepted runtime/APK.

1. Reuse `lib/features/event_participation/presentation/event_card.dart` from
   Home and Events with an existing backend-parsed EventDetail. `onSelect`
   receives that exact stable eventId, not a global selected activity. Supply
   optional reason/count only from an authorized projection; omit unavailable
   values. Never pass an unfiltered total or claim opening is registration.
2. After the participation contract/adapter exists, place
   `ExternalRegistrationAction` in the stable-ID detail page. Supply the existing
   approved ExternalActivityOpener, `confirmGoing(eventId)` and
   `readGoing(eventId)` callbacks from the real Repository. The writer must enforce
   current identity and approved version precondition, and refresh shared owner
   read state on success; the reader must re-fetch server state and refresh the
   repository's precondition before deriving the bool. Do not supply an in-memory
   default in the connected app or call the old source-action button as well.
3. Keep the parent detail keyed by Event ID. Local flow survives browser background
   but cannot outlive widget/session identity; do not dispose the new action merely
   because the old browse snapshot clears on background. Keep the source projection
   expiry/disclosure rules; the parent must revalidate future source reads. The
   new callbacks do not grant authority if the source expires or an account changes.
4. No root router/bootstrap/theme/provider adapter was modified. Existing source
   copy/open path remains read-only unless this new builder is explicitly wired.
   The profile participation section and participant-ID callback are not delivered
   yet; they require the concentrated physical contract decision, not a fake UI.
5. Backend `maySeeParticipation` is a pure policy, not a complete authorization
   pipeline. Trusted eligible owner/current relationship/block/privacy facts must
   be read consistently in the eventual adapter; all list rows and counts require
   filtering before response. Never treat the UI count as Backend permission.

Checks: focused Flutter16/16 with no-test-assets/NoSplash; Backend policy5/5;
scoped analysis/format/whitespace pass. Standard shader-asset test failed and is
retained, not fixed. Exact source SHA is supplied with the output bundle receipt.
No new runtime, persistence, participant pagination or device acceptance is claimed.
