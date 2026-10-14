# JIN controlled prompt/tokenizer handoff

Product `f8b4ae12004c7cfc0ad504113bdf5454e0f20cc1`, tree
`0274af62aa46aad156b51eb4ea05bc96d14a6674`, extends the published
[six-operation source/evidence](2026-10-14-jin-six-operation-coordinator.md).
Four added source/test/helper files; no dependency, HTTP/schema, shared UI or
ordinary-runtime change. SHI reviews JIN source; LI owns actual Linux-host
execution and evidence disposition. Publication adds evidence only.

`ControlledConversationPrompt` supplies full Backend/schema instructions, the
current message, authorized Note-only projections and optional structured Persona
as one complete raw input. It implements the tools-absent text branch and disabled
thinking generation prefix of the [official Qwen9B template](https://huggingface.co/Qwen/Qwen3.5-9B/blob/main/chat_template.jinja).
The loaded host template/model must be verified against this explicit framing;
the upstream main URL alone is not a frozen host-identity proof. No second template
may be applied after measurement. JSON data angle brackets are escaped without
changing decoded text, so input cannot introduce special role/tool controls.

All framing is passed to `ControlledTokenizerProcess`, which verifies pinned
existing Python/helper files and invokes the existing host-local Python with
`-I`, shell disabled and request text on stdin only. The helper independently
checks the tokenizer JSON digest and installed tokenizers0.23.3, refuses configured
padding/truncation and counts with no added special tokens. No downloader, network
request, model install, content argv/env/file, token IDs, prompt log or cache is
introduced. The host already owns this separately installed library; no project
dependency is added. Failure cannot fall back to estimated/character counts.

The original budget and host lease are rechecked across all awaits. Request-local
text holders are cleared synchronously on abort; only necessary already-issued
pipe bytes may remain until the owned child closes. Token counts outside1–4096
reject the whole input. The transport then rechecks identity, actual returned
prompt token count and512-output bound. Neither instructions nor token counting
constitute semantic policy validation. The independent Q31-C/E candidate gate is
still mandatory, with ambiguity rejected and no model self-validation.

## Actual verification at the compiler checkpoint

- Pinned strict TypeScript compile: Pass at final source.
- Full Backend798/798, exit0, fail/cancel/skip/todo0 at final source.
- Eight compiler/control tests are included: complete framing, exact round-trip
  data, injected control strings,4096/4097, unknown counts, projection rejection,
  cancellation, host revocation and subprocess configuration rejection. Their
  earlier focused8/8 predates holder-lifetime hardening; final798 includes it.
- Python helper syntax: parsed successfully with the existing local Python.
  No matching host tokenizer execution is claimed from that syntax check.
- Exact four-file source/hash and local log bindings are in the
  [manifest](2026-10-14-jin-controlled-prompt-manifest.json).
- No new full SDK/Flutter/device/model execution was run for these added, unwired
  compiler/helper files. The earlier790/18/540 and120 results keep their exact
  source attribution. The then-pending full joined SDK/Dart path is superseded
  by the [later source-bound129-case invocation](2026-10-14-jin-joined-conversation-gate.md);
  device and real-model results remain Not Run.

## LI controlled-host binding

Use private host values only, never copy their details into an Issue or Git:

1. `ControlledTokenizerProcess` takes absolute existing Python/helper/tokenizer
   paths, their SHA256 identities, the observed selected model manifest digest,
   tokenizers0.23.3 and the current host identity/immutability callback.
2. Pass it to `ControlledConversationPrompt`; pass that compiler plus the matching
   `ControlledOllamaBinding` to `ControlledOllamaTransport<ConversationInput>`.
3. On the exact reviewed source, verify the formal9B template/full-count equality,
   Unicode/control-boundary and4096/4097 cases, loaded readiness and60/5/45 behavior.
   Only then join an explicitly established semantic policy to the actual
   Application factory. Missing semantic evidence must not be replaced by the
   synthetic gates used by the current local SDK fixture.

The new host deployment authorization is received. No repeat install request or
remote Ollama exposure is needed. This handoff is executable compiler/adapter
source with local tests, not completed real-model application acceptance. Model
timeout/quarantine, semantic adversarial cases, nonempty Note authority, actual
joined real-model/store/device evidence and peer disposition remain distinct.
Keep Draft/Open; no merge, Issue/Project or ordinary/cloud/runtime transition.
