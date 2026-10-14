# LI controlled host deployment and recovery — 14 October 2026

Authority: [human deployment and real-content request](../../decisions/2026-10-14-li-real-runtime-deployment-and-content-direction.md).
This is actual host setup and non-sensitive operator verification, not a complete
real AI product journey, peer code review or Release acceptance.

## Installed and observed

- Official Ollama0.40.4 Linux AMD64 distribution installed user-locally, official
  release-asset SHA256 verified before extraction. Existing NVIDIA driver retained;
  no root password or system driver/dependency upgrade was used. Binary/model files
  are outside Git. `enmori-ollama.service` is enabled as a systemd user service.
- API/model downloads report Qwen3.5-9B,9.0B,Q4_K_M. The actual loaded native
  manifest matches the API identity and a SHA256-verified child manifest carried
  by the registry parent. The parent contains multiple runner manifests; equating
  its file digest with the selected child was an initial incorrect operator
  assertion, retained privately and corrected by explicit child verification.
- Current configured service is loopback-only, cloud features disabled, one loaded
  model/one parallel generation, context8192. Its raw endpoint is not exposed
  through the existing private HTTPS edge. Detailed endpoint/model identity and
  hardware/host configuration remain in the private operator receipt.
- Official upstream tokenizer revision and loaded GGUF metadata were compared.
  All248320 vocabulary IDs and247587 merges now match the model-local derived
  tokenizer;33 atomic special controls are declared. The initial upstream-only
  length assertion failed because the GGUF also carries seven extra controls and
  243 UNUSED padding IDs. The correction retains padding as base vocabulary and
  declares only control/user-defined entries as atomic tokens, without changing
  the actual model. Tokenizers0.23.3 is isolated in a host-local Python environment;
  no Backend/pub/pnpm dependency changed.
- The local count helper reads complete raw prompt text from stdin, outputs only
  count/ceiling status, and does not persist or log the text. Full JIN framing/gate
  integration remains his assigned Infrastructure work.

## Actual model verification and limits

Initial cold operator generation exceeded the45-second verification socket
window. The timeout and runtime cancellation/load failure are retained. No
application deadline was extended and no response/content was saved.

Separate startup preload completed in35.537 seconds with zero user content and
zero generated tokens. A subsequent explicit synthetic operator smoke completed
in38.236 seconds: complete pre-count120 equals actual prompt_eval_count120,
output18 tokens, context8192/output512 limits, and the unchanged Backend raw
structured-output parser passed. Raw model response was passed via stdin to that
parser and discarded; it was neither saved nor printed. This tests one synthetic
English input, not all Unicode/tokenizer framing, adverse output or timing cases.

This is proof of actual9B generation and matching observed input counts, not a
fake reply. It does not exercise actual Application semantic gates, all60/5/45
budget/cancel/quarantine races, nonempty Note authority, network/controller/store
composition or the Q31-E adversarial corpus. Cold readiness remains an observed
constraint; JIN must join actual adapter/token measurement/semantic/readiness
behavior on this host before claiming the real app journey ready.

Private artifacts are under `/home/miku/.local/share/enmori/runtime/evidence`;
runtime identity/configuration is mode0600 at
`/home/miku/.config/enmori/qwen-runtime-private.json`. Model/host/digest/tokenizer
details are not copied into this public evidence file or Issue comments.

## Existing Firebase and Backend recovered

Human LI explicitly selected reuse of the existing controlled Firebase project.
The existing private configuration matches the previously approved target; the
CLI default project was not substituted. ADC read and Auth Admin configuration
read passed. The six named approved synthetic records were present, with zero
writes. This does not mean those Event records are real-provider content or prove
real Friend population/consent or a signed-in product journey.

The existing private Backend initially returned502 because its supervisor's
Python launcher pointed to a deleted managed worktree. PR40 exact
`cdd0b9dad5705e4ac9887efe2cd86d3c07b7f4b4` was reverified as peer-approved/merged.
Its unchanged Backend/API/locked-package source was exported to a persistent
user-local deployment directory, installed from the frozen offline lock with
scripts ignored and strictly compiled. A mode0600 backup preserves the original
launcher. Only its directory and exact existing Node24.19.0 executable location
changed. No product source, Auth project, data or private HTTPS topology changed.

The supervisor is now active. Loopback listener and existing private HTTPS
unauthenticated request return401, replacing the502. Firebase checks still pass;
no fixtures were reset or rewritten. The restored source is the existing reviewed
baseline, not JIN/ZHOU's unreviewed new AI source or a new real-Friend deployment.

## Event access and next joins

Human has no Ticketmaster developer account/key and requested assisted setup.
The [official registration](https://developer-account.ticketmaster.com/user/register)
and a mode0600 local key/terms-confirmation template have been prepared. Human
mail verification/terms acceptance/key provisioning remain pending. No key,
credential-bearing URL, authenticated provider call, scrape or importer exists
in Git or this report. After explicit saved-key confirmation, the selected first
probe is Singapore size3 plus at most one corresponding Detail, with sanitized
field/coverage results and no bulk persistence. Actual recommendation field
compatibility/mapping/attribution/freshness/removal still follows the source-bound
proposal and evidence path; missing end times will not be fabricated.

Friend/real-account preparation reuses the existing Auth/Backend environment;
actual voluntary-user/permission-filtered Friend API composition and app wiring
remain owner implementation and evidence work. Offline examples retain labels.
Host deployment does not silently switch the current offline APK to real content.

#105 LI evidence verification remains scoped to d17432d/3ebb88a (706/103). Later
#105 and#107 heads have moved; those new inputs retain their own reviewers and
must not inherit that test result. No merges, Issue/Project changes, whole AI,
all42/38-state, Sprint, UAT, Release or Done claim is made.
