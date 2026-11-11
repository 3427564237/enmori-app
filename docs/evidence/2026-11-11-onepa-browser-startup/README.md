# onePA pre-navigation diagnostic — 11 November 2026

## Outcome

A single read-only diagnostic in the existing Azure application container timed
out after **31.210 seconds before calling page navigation**. Its stage marker was
still in the browser-launch/context/page-creation section. There was no navigation
HTTP status or observed anonymous search response. This establishes a failure to
complete the Azure browser setup path in this attempt; it does not establish a
onePA URL, response parser, HTTP 403 or challenge failure.

The launch itself had a 15-second timeout, while the observed failure took about
31 seconds. Context or page creation is therefore a plausible failing step, but
those steps were not individually instrumented. The precise step and underlying
resource/platform cause remain unproven. The active package inspected through the
app shell was `fade6c78ac2edf1f8c54cf9f4ee9fd0bd333243f`.

## Method and boundaries

The diagnostic used the existing `az webapp exec --target app` guard, the package's
bundled Node executable, existing `xvfb-run`, and the same browser directory and
ordinary headed Chromium mode as the approved Azure startup script. It used a new
anonymous context, the active package's public-resource restrictions and the
existing image/media/font exclusions. It attempted no pagination, credentials,
saved profile, challenge solving or access-control workaround.

The diagnostic awaited browser close in `finally` and closed the app shell. No
second attempt was made before the parent's deployment stop. No application
service, configuration, deployment script, account or product data was changed.
The diagnostic process exit code describes clean guard closure, **not** successful
onePA acquisition. Sanitized metadata is in [diagnostic.json](diagnostic.json).

An independent plain HTTP request from the operator workstation returned HTTP 200
for the public search URL and contained `__NEXT_DATA__`. Its HTML also matched a
broad challenge-marker search. Neither observation establishes successful browser
rendering, anonymous catalogue acquisition, or availability from Azure. The
[official search page](https://www.onepa.gov.sg/events/search) remains the inspected
URL; no alternative endpoint was substituted.

The prior 90-second source diagnostic in
`docs/evidence/2026-11-11-demo-v60/onepa-long-deadline.json` reports failure at
91.733 seconds, but has no phase-specific evidence. The new probe narrows one
current failure to the pre-navigation browser setup path; it cannot retrospectively
prove that both attempts failed at the exact same step.

No implementation fix or onePA-restored claim follows from these observations.
The existing fail-closed source-unavailable behavior remains appropriate pending
a separately observed successful acquisition.
