# One bounded F1 production-chain attempt — stopped before generation

25 October 2026, Asia/Singapore. Assigned production head:
`6bab96062e357b34fc2a7326678ee4b6bce515f2`. The fixed request uses one own synthetic
Check-in at `2026-10-23T06:00:00.000Z`, the Chinese Note about twenty minutes of
walking, Mood `放松`, Activity `散步`, and asks in Chinese to repeat that historical
record using its UTC time without assuming today's state. No real personal data.

Integration authorized at most one generation and, only if not resident, one
empty preload, with the unchanged production serializer/prompt/parameters,
actual `createIsolatedConversationComposition`, local shared model lane, HTTP
prepare/review/execute and canonical Store. No F0 cases, FCM, retries or tuning.
A fixed manifest and job-wide exclusive reservation were written first.

## Actual result

- Model residency GET found `qwen3.5:9b` absent.
- One production empty preload POST completed HTTP 200 with matching done/model.
- The production composition started; expiry/source startup checks completed.
- The runner threw a `TypeError` after the private loopback listener started,
  before the first HTTP prepare. It assigns to Fastify's getter-only
  `listeningOrigin` property. An offline strict-mode reproduction confirmed the
  exact error; this is a runner defect, not a model or serializer judgment.
- **0 generation reservations / 0 generation POSTs / 0 prepare / 0 execute**.
  The process exited 1 and stopped. No retry, source fix or reservation reset was
  executed. A separate local origin variable is a proposed repair only.
- The preload lane settled with `pending:false,outcomeUnknown:false`. The own
  synthetic Auth UID/documents were removed, matching runtime/checkpoint metadata
  restored, and the temporary listener closed. Existing services remained running;
  the project was not cleared. Both exclusive slots were explicitly returned.

**Production F1 serializer-to-real-model success and semantics: Not Run.**
There is no generated answer, HTTP acceptance or persisted assistant to assess.
The earlier five-case real-Emulator/fake-model proof and 487 fake tests retain
their separate scope and cannot fill this missing evidence.

## Immutable evidence

Private directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/context-f1-production-6bab960-once/`.
The committed runner matches the frozen copy in this directory. It is preserved
as the exact failed evidence source, not a ready reusable command. Running it
again is blocked by the retained job-wide reservation. A later execution needs
Integration's separate bounded authorization; neither that reservation nor the
original failure is to be erased.

| Artifact | SHA-256 |
| --- | --- |
| Fixed manifest | `ac82b3f8504b5f8bd63dc177d669a568a112c1938b0c95d4d080e00d0a1b869a` |
| All production TypeScript/compiled bindings | `afc5894df65466dc7003ff35ef5a28050320b882640a83b61ad009f3530912c8` |
| Frozen runner | `bf21a490cdf4e3590cefe3bbff3360cfe58a3d4825d900646cfa74a20900a015` |
| Empty preload raw response | `66250f90ae4be9f82ca596cc2fb57af168579da07cf2f3475367b4ca632ca0a9` |
| Stopped result | `38b8fb5b899af28b296523bf8f4051dd11a674791e6279a0c5b1dd7d7345a859` |
| Supplemental post-exit artifact index | `70532284f800e36de8634f24df8468f192cb451ba2adaea5bbd89030f82e8556` |

The original artifact index was computed before the runner wrote its final
stdout summary, so its `runner.log` hash is stale. That is its only mismatch.
The original index is preserved; the supplemental index binds the final stable
log, frozen runner and offline diagnostic files. No manifest, preload bytes,
result or production-source binding was modified. The first descriptor probe
was non-strict CommonJS; the separate strict probe reproduces the ESM error.
The initial manifest-preparation README enumeration error is also retained; it
occurred before the manifest/reservation existed and made zero network calls.

The private evidence capture was explicitly authorized for this all-synthetic
request. No Auth token, password or operation key was written to evidence or
application logs. Semantic review remains independent of protocol success.
