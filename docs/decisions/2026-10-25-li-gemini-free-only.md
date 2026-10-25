# LI decision: free-only Gemini research

Date: 2026-10-25. Authority: LI, ENMORI PM, direct reply in Integration
`01a1719f-a6aa-75e0-9ad4-f3724777fa95` to the account-upgrade question.

The reply is: “先用免费档，我有谷歌pro，目前里面也有一些额度，不要付费”.

This supersedes only the paid execution choice and USD 1 spending permission in
[the earlier first-flow decision](2026-10-25-li-ai-companion-first-flow.md).
Preserve that historical approval; do not use it to upgrade, charge, prepay,
recharge or execute a paid fallback after this instruction. Current permitted
new research spending is **zero**. Implementation of F0, F1a and the reviewed
D1 candidate continues under its existing approval.

Help configure the existing project for an actually verified free tier. The
reported Google Pro subscription and available credits are operator statements,
not proof that Gemini Developer API usage is covered. Verify the applicable
product, project, model eligibility and quota before execution. A free-tier or
quota failure must stop rather than upgrade, change billing or retry on paid.
Do not mark the earlier paid runner's billing guard true to bypass its contract.

Research remains synthetic-only, with no real user records, Persona, location or
history, and no application adoption. The earlier fixed corpus / at-most-64
generation and count ceilings remain upper bounds; free quota may require a
smaller bounded run. The model must be explicitly identified; an unavailable
candidate is reported, not silently replaced. No provider tools, uploads,
grounding, broad IAM grants or new project are authorized by this change.

At this decision, the sole completed cloud configuration change was importing
the existing `enmori-rmvp-controlled` project into AI Studio's project list.
Google Cloud paid upgrade, prepayment, API key creation and evaluation calls
had not been performed. The paid-upgrade confirmation is to be left unaccepted.

## Implementation selection within the free-only authorization

Use the already existing Default Gemini Project `gen-lang-client-0930184174`
only for this synthetic research. AI Studio currently labels that project Free;
the imported ENMORI project now displays Tier 1 / no credit. The cause of that
display change is not established. Do not use ENMORI for a zero-cost probe, alter
its billing state, or connect the research project to the application.

Before execution, establish that billing is disabled on the selected project
and that its server credential belongs to it and is restricted to the Gemini
API. Keep credential bytes outside the repository and tool output. An unverified
condition blocks only the cloud run, not implementation work.

Keep the already selected Gemini 3.8 Flash model. Prepare an explicitly named
eight-case subset of the approved 32 synthetic cases, one pass only, with ceilings
of eight generation and eight count requests and zero new spending. Respect the
project's observed 5 RPM limit; the displayed 20 RPD is a limit, not proof of
remaining quota. Stop on quota, billing, authorization or ambiguous outcomes;
do not retry, switch models, or activate a paid fallback. This smaller run cannot
be reported as the earlier 32-by-two evaluation.

[Google's plan documentation](https://ai.google.dev/gemini-api/docs/google-ai-plans)
states that Pro benefits in AI Studio apply to its web interface; direct API
usage and Google One AI credits are managed separately. No subscription credit
is assumed to cover these API requests.
