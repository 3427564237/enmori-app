# History, Footprint and message-local feedback

Authority: LI/PM direct confirmation, 21 October 2026, following real group v15 use.
Scope: presentation/navigation clarification within the approved core experience;
no new data purpose, location collection, provider integration or sharing authority.

## Confirmed behavior

- Check-in History presents historical records and their saved, authorized location
  and historical weather snapshot, where present. Missing legacy data stays empty.
- Footprint is a separate map experience: authorized Check-in location nodes joined
  in timestamp order, explicitly labelled Check-in point connections rather than an
  actual travel route. Selecting a node opens the exact record by stable Check-in ID.
- Both views reuse the same server-owned records. Existing self/friend authorization,
  location-field permission, map sharing and revocation rules remain unchanged.
- Saving a Check-in needs clear success, onward navigation and return behavior.
  Implementation-level readback/retry controls must not obscure the normal journey.
- Once a chat send passes local validation, show the user's outgoing bubble at once
  with an explicit local pending state. Show an assistant typing/ellipsis bubble at
  the conversation bottom while awaiting its reply. Sending/waiting/failure status
  belongs beside/below its message, visible while reading the latest conversation.
- Pending UI is not proof of persistence. Reconcile by existing request/message
  identity; do not duplicate bubbles, auto-resend unknown results, alter history,
  bypass consent, or change session/cancel/retry semantics.

## Supersession and retained sources

The 19 October core-priority plan already required a timeline, calendar, map and
record linking; it remains the functional source. This confirmation supersedes
any derived UI label/mockup/handoff treating Footprint as the history list or a
shared page with no separate map entry. In particular, the v15 implementation of
`check_in_history_page.dart` titled Footprint is recorded as a mismatch, not a rule.
The v15 top-of-page Sending/Waiting status is superseded for primary message
feedback placement. Existing HCI theme, bottom navigation, backend permissions,
weather coarse-grid rules and all unmentioned approved contracts remain unchanged.
Old source/evidence files are retained. No Sponsor/Supervisor rule is overridden.
