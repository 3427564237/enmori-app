# ENMORI integrated social interface — local visual proposal

Human LI selected the card/bottom-navigation/profile direction on 14 October
2026. [Scope decision](../../decisions/2026-10-14-li-social-ui-preview-direction.md)
authorizes this preview only. Nothing here is an approved production route,
field projection, public feed, interaction contract or ready-to-install APK.

Open [index.html](index.html) in a browser. It is self-contained and works
offline. The five bottom buttons and outside page picker switch Home, Friends,
Check-in, AI and Me. Detail buttons show explanatory preview sheets, Escape
closes them, and the AI input displays a fixed sample reply. Text input exists
only in the page's memory. It does not contact a backend, access credentials,
save data or produce a real model response. Category labels are static layout
examples, not functioning filters. Every person/activity is synthetic.

[overview.png](overview.png) is a programmatically drawn three-screen concept
overview, **not a rendered browser or phone screenshot**. The clickable HTML
has additional content and responsive behaviour; PNG inspection cannot prove
browser rendering or actual Android layout. No browser/computer-use automation
or new dependency was used. Source checks verified five matching page targets,
unique IDs, no remote request/storage calls and Node script syntax. The PNG was
visually inspected and corrected for illustration/content clipping. Browser/
device interaction and accessibility execution remain untested.

## What changes visually

- Home uses activity/Event and people-related card hierarchy, rather than a
  vertical command list. Proposed social rows use only illustrative data;
  applicable producer/privacy/projection contracts still govern actual content.
- A five-position bottom bar gives the existing feature concepts stable entry
  points. The exact grouping and changed navigation still require selection.
- Own Profile gives avatar/name/interests hierarchy, relationship entry and
  own-record entry. Private Notes are not public feed cards.
- AI has a dedicated conversation layout with Persona access and visibly
  scripted preview replies. Real reader/store/model readiness is unchanged.

Preserve the existing export's warm white `#FAFAF8`, near-black text and indigo
`#4F46E5` direction. Skill-generated purple/green palette and academic fonts
were unsuitable for this retained baseline and were not applied. Use system
fonts and original CSS/geometric art, without external assets or dependencies.

## Reference and change boundary

The references are conceptual: [LinkedIn's official Feed overview](https://www.linkedin.com/help/linkedin/answer/a523360)
and [TikTok's official content/feed explanation](https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content).
This proposal borrows content hierarchy and familiar social navigation; it
does not reproduce their ranking algorithms, public-post permissions, branding,
video creation or professional-network business features. Product fit is a
design judgment, not an externally sourced ENMORI requirement.

Retain Q04 and all applicable later decisions. Material baseline departures,
navigation and page contracts must be reviewed before implementation. A useful
first implementation candidate would combine shared navigation/polish, Home
and own Profile in one focused packet, after concrete selection. Existing owner
Backend/gate work can continue independently. The current offline APK, #97,
GitHub states and other checkouts are unchanged. These files remain local;
no design PR or external publication has been made.
