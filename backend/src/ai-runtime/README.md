# S2-05 internal AI runtime

Issue [#31](https://github.com/3427564237/enmori-app/issues/31) implements the
bounded component authorized by S-PM-0913-SPRINT2 and Q31-B/C. It is not connected
to Bootstrap, a public route, Firestore or a model host.

## Composition and lifecycle

Construct one `BoundedAiRuntime<Input>` per controlled host with a `RuntimeClock`
and `GenerationTransport<Input>`. `MonotonicRuntimeClock` supplies elapsed time;
tests inject `FakeClock`. The existing UTC `Clock` remains unchanged.

The trusted Application caller supplies a verified user key and `RuntimeWork`:

1. `prepare` constructs already-authorized input under the original deadline.
2. The transport performs one generation, returning raw UTF-8 bytes.
3. The exact Q31 parser returns an immutable **structural candidate**.
4. `checkCandidate` is an injected asynchronous checkpoint for the remaining
   processing pipeline. It receives the same overall deadline and cancellation
   signal. The per-user slot remains occupied until this checkpoint completes
   or the request becomes terminal. The test checkpoint is an explicit fake.
5. The component settles `outcome` exactly once. Success remains a structural
   candidate; it does not authorize persistence or client delivery.

`acceptedAt` and `deadline` on the internal handle are monotonic milliseconds,
not UTC timestamps or wire fields. `remainingMs()` never restarts a budget.
Capacity rejection occurs before acceptance. There is no retry, fallback,
request persistence or retained generation history.

One lane is reserved during preparation and generation. At most two requests
wait in FIFO acceptance order, each with its original 5s queue deadline. The
generation deadline is `min(start + 45s, acceptedAt + 60s)`. After generation
settles, the lane can serve another user while the original request completes
its checkpoint within the same 60s deadline.

Cancellation of preparation or queued/checkpoint work is immediately terminal.
Cancellation/timeout of an active generation releases the application user slot
and requests cancellation, but quarantines the generation lane until the
transport confirms actual termination. Existing queued requests retain their
deadlines; no new request is admitted during quarantine. Shutdown permanently
discards queued work, cancels all non-terminal work and rejects new admissions.

**Transport contract:** a settled `generate` promise confirms the underlying
invocation has actually stopped. An adapter that rejects its promise merely
because a local HTTP request was aborted violates this Port. If termination
cannot be confirmed, the promise must remain pending and the lane quarantined.
Input construction/checkpoint collaborators must observe cancellation and
dispose request-only data. This component neither claims to stop an uncooperative
model process nor makes that process's resources safe by clearing a timer.

## Parsing and interpretation

`parseOutput` uses fatal UTF-8 decoding and the exact two-string-property Q31
grammar. It detects decoded duplicate keys before object materialization.
Nested objects/arrays are invalid at the grammar boundary, so nested duplicate
keys cannot be accepted either. Only JSON whitespace may surround the root.
No fences/prose extraction, coercion, partial result or JSON repair occurs.

Messages are checked for well-formed Unicode, prohibited C0/C1 and bidi controls,
trimmed emptiness and the 2400/800 Unicode-code-point limits. LF permits plain
text bullets. Deterministic rejection covers markup, embedded object syntax,
code fences, link/URL syntax and recognizable executable tool-call syntax.
The versioned tests are the concrete syntactic corpus; lexical checks are not
a universal natural-language tool-instruction, factual-grounding or safety
classifier. `invalid_output` never returns the rejected content.

## Explicit integration obligations

No model input/output token limit, loaded model/digest identity, complete
semantic policy, data authorization/revalidation, Conversation/Persona lifecycle,
fallback, persistence or pre-delivery acceptance is implemented here. The
injected checkpoint can demonstrate budget/cancellation/failure propagation;
its fake success is not evidence for those later gates. It must not persist or
deliver a candidate as a side effect.

A later product integration must keep the authoritative application terminal
boundary across its complete processing/persistence/delivery flow and implement
all Q17/Q19/Q31 gates. Do not expose this module's success as an accepted
assistant message or call it complete Q31-E acceptance. Model installation and
live-host verification require their separately approved scope.

## Verification

Run the existing strict build and Backend test command:

```powershell
pnpm backend:verify
```

The owner cases live in `backend/test/ai-runtime/`. They use synthetic inputs,
fake time and a transport whose completion can be delayed independently from
an abort signal; no live model, Firebase or Android environment is needed.
