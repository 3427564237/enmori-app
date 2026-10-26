# LI: unified AI references and usable Event discovery/return

Status: confirmed product direction, 26 October 2026, Asia/Singapore.
Source: LI's direct feedback in this chat after v30 installation and AI runtime
recovery. This record does not claim Sponsor approval of a different ranking
rule or approve a new provider, data purpose, dependency or infrastructure.

## Confirmed behavior

- AI exposes one references entry. Its panel must offer automatic current-day
  Check-ins and manual selection across the existing recent-day window. Entering
  from an owned Check-in must not hide the automatic option or require killing
  the app to switch back. Simplify repeated and unclear "reference scope" UI.
- Manual selection retains the approved recent-seven-day, maximum-five bounds;
  automatic mode retains server-derived today/latest-five behavior. They remain
  explicit alternatives under the existing prepare/execute contract. Source
  conflict, inherited-history exclusion, consent, draft and unknown-operation
  protection remain; changing presentation cannot remove those safeguards.
- Activity lists/details must become usable again on foreground return and
  after returning from the external ticket website or a child route. Revalidate
  and reread the visible authorized view automatically, retain user-entered
  search/filter intent, and keep failures distinct from an empty catalogue.
  Retain background content clearing, five-minute freshness and authorization.
- Add useful Event search and improve the real available category/filter scope.
  Investigate source coverage and recommendation refresh after interest changes;
  do not present a repeated fixed batch as new personalized coverage.
- Event information and tickets must be clearly distinguished. The reported
  missing introduction and purchase-only URL must be checked against the actual
  provider response; do not fabricate descriptions, alternative URLs or scores.

## Scoped supersession

This replaces the manual/automatic picker separation and presentation-only
"reference scope" wording in the 25 October AI UI handoff. It also replaces
the earlier explicit-manual-Reload-only behavior after an Event foreground or
route return, including tests that required no reread on resume. The old source
and evidence remain intact. Newly admitted foreground reads do not reuse a
cleared snapshot or authorize background polling, automatic registration,
participation resend or purchase.

The Event and AI API contracts remain authoritative for source data and
request/operation safety. A provider-data limitation is not resolved merely by
this UI direction; a different acquisition contract must be named separately
before implementing affected acquisition behavior.

## LI assignment: all-interest recommendation coverage to JIN

LI subsequently directed: "多加一些组别，至少要覆盖到我们所有已有的兴趣标签，交给jin即可".
The proposal to add only Art and Dance is therefore not the selected final
scope. JIN owns the complete existing-interest coverage and real classification/
source expansion package; Integration continues the references, Event return
and search UI work independently.

The inspected active catalogue contains Books, Travel, Films, Fitness, Dance,
Food, Photography, Technology, Outdoors, Volunteering, Art, Gaming, Community
and Music. Cover each existing tag explicitly in the source/mapping/result
matrix. A lack of real matching events must remain an honest empty result;
neither invented events nor unrelated label aliases constitute coverage.
Any new provider/permission/dependency/infrastructure boundary still requires
its named, minimal contract under AGENTS.md. Do not block existing authorized
UI work while preparing those concrete differences.

See [the JIN handoff](../planning/2026-10-26-jin-all-interest-event-coverage.md).
