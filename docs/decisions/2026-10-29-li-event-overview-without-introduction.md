# Event introductions belong in detail, not overview

Date: 29 October 2026 (Asia/Singapore). Authority: LI HOURUI, PM.
Source: the human reports that many overview cards say no introduction although opening detail supplies it, and explicitly requests removal of overview introductions if they cannot be available before opening detail.

## Confirmed change

Remove description excerpts and missing-description messages from all event overview cards, including Home recommendations, Events, and saved activity plans. Keep cover, name, local time, venue, source and existing decision-relevant metadata/actions. Clicking the card still opens the in-app event detail, where actual description paragraphs, important conditions and official information/booking actions remain.

The bounded source list intentionally does not fetch every event's full detail. A missing list introduction therefore does not establish a missing provider description. Do not add per-card detail acquisition to compensate, or display a new introductory placeholder. Cached descriptions also remain hidden on overview cards so their layout does not depend on whether the detail was visited.

## Supersession

This explicitly supersedes only the card-introduction requirement in [28 October's approved integration decision](2026-10-28-li-event-profile-discovery.md) and the corresponding overview presentation in `api/event-profile-discovery-v3.md`. Preserve that earlier source as history. Detail description requirements, canonical activity identity, API optional description fields, provider acquisition, recommendation algorithms and participation semantics are unchanged. The default detail renderer must continue to show the actual description even when the app does not inject a custom renderer.
