# Backend architecture — 2026-09-01

- **Status:** Approved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901-BACKEND
- **Scope:** Q-30 production Backend/Auth/Data/API, controlled-demo deployment, testing, and operational boundaries
- **Builds on:** [S-PM-0901](2026-09-01-flutter-client-architecture.md) and [S-PM-0901-SCOPE](2026-09-01-comp3851b-mvp-scope-priorities.md)
- **Detailed specification:** [`docs/superpowers/specs/2026-09-01-backend-architecture-design.md`](../superpowers/specs/2026-09-01-backend-architecture-design.md)

## Decision

ENMORI adopts a trusted TypeScript Backend API between the Flutter client and all product data, recommendation, AI, social, and Admin operations. Flutter uses Firebase Authentication directly for email/password sign-in and ID-token lifecycle, but does not directly access product data in Cloud Firestore. The Backend verifies Firebase identity, enforces authorization and privacy, accesses Firestore, and is the only application process permitted to call the local Qwen runtime through an internal adapter.

The Backend baseline is TypeScript strict mode on the Node.js 24 LTS major line, implemented as one feature-first modular monolith. Fastify is the sole HTTP framework and is confined to bootstrap and transport concerns. Public application traffic uses versioned HTTPS REST/JSON. OpenAPI is the normative Flutter–Backend contract. Week 9 AI responses are complete, non-streaming JSON responses so the Backend can validate or apply an approved fallback before responding.

The controlling dependency rule is:

> `Application/Domain defines Ports; Infrastructure implements Ports; inner layers never import Infrastructure.`

Transport handles HTTP mechanics and maps stable application failures to safe responses. Infrastructure adapters catch Firebase, Firestore, and Ollama vendor exceptions and translate them into stable internal dependency errors; Application adds use-case context and exposes `AppFailure`. Vendor types and raw vendor errors do not cross the Infrastructure boundary or enter the public API.

Cloud Firestore is the sole Week 9 product business datastore. Firebase Authentication remains the identity service. Backend Admin SDK privilege is technical access only and never replaces use-case authorization, consent, privacy filtering, or field minimization. Qwen receives only an already-authorized, filtered, purpose-specific payload and has neither Firestore credentials nor write authority. Recommendation eligibility, candidate selection, scoring, ordering, and permission decisions occur deterministically before any optional Qwen explanation.

Week 9 deployment is a controlled demonstration environment on one controlled Linux host. A controlled HTTPS edge is the only device-visible ingress. The raw Fastify listener is not directly exposed, and Ollama is bound to loopback or an equivalent private local interface. The Backend and Ollama are separately supervised processes.

The controlling dependency-health rule is:

> dependency failure does not crash the Backend process, while readiness and affected endpoint availability may degrade independently

Liveness, readiness, dependency health, and admission capacity are distinct signals. An Ollama failure must not stop non-AI features. The AI runtime, validation, and fallback contract is subsequently resolved by [S-PM-0902-Q31](2026-09-02-qwen-runtime-failure-contract.md).

The repository remains a single repository. Backend source belongs under `backend/`; the normative OpenAPI contract belongs under independent `api/`. Flutter does not import Backend source packages. Credentials, Firebase service-account material, Ollama model files, and runtime data do not enter Git.

## Approved supporting boundaries

- Firebase ID tokens protect authenticated routes; Backend verification creates the trusted Auth Principal.
- User ID, Admin authority, and access identity are never trusted from ordinary request body, query, or client-selected headers.
- A minimal custom access claim may expose Admin capability and is assigned out of band by an authorized owner. Profile, interests, and consent do not belong in custom claims.
- Week 9 protected requests check revocation and disabled-user state. Admin revocation also revokes refresh tokens and requires reauthentication.
- Request and response schemas are explicit. Undeclared request fields are not blindly persisted.
- Firestore documents are not API response models; vendor and storage types remain in Infrastructure.
- Server-authoritative timestamps, atomic writes, and transactions are used where the later approved data contract requires them.
- API timestamps use timezone-aware UTC ISO 8601 values; identifiers are opaque strings; optional values prefer omission over ambiguous `null`.
- Cursor pagination is the default for collections. Non-idempotent creates require an idempotency mechanism, and conflicting updates require an approved version or precondition mechanism. Exact fields and headers remain deferred.
- Stable application error identifiers, safe messages, HTTP status, and a correlation/request ID form the public error boundary. Exact error codes remain deferred.
- Domain and Application logic use unit tests with fakes; Infrastructure adapters receive Port contract tests; Transport receives Fastify injection tests; OpenAPI consistency is checked in CI.
- Firebase Auth and Firestore integration tests use isolated Emulator Suite data. Tests must fail closed if emulator configuration is present in a demo or production mode and must never target demonstration data.
- Normal CI uses a fake Qwen adapter. Live Ollama contracts and model-failure tests remain part of Q-31.
- Structured logs use a field allowlist. Tokens, credentials, complete bodies, Check-in content, mood, approximate location, Persona content, prompts, Qwen responses, and Firestore document content are prohibited from logs.
- Unknown failures fail closed. Stack traces and raw vendor failures never reach the client.
- Request-size, concurrency, timeout, rate-limit, and graceful-shutdown mechanisms are required; exact values remain deferred.
- No third-party logging or monitoring vendor is selected for Week 9. Logger and metrics boundaries remain replaceable.

## Explicitly not approved

This decision does not approve or infer:

- endpoint names, request/response DTO fields, complete OpenAPI paths, or exact error-code tables;
- Firestore collection names, document fields, IDs, indexes, migrations, delete semantics, or transaction inventory;
- recommendation formulas, weights, normalization, decay, tie-breakers, or product field allowlists;
- Qwen runtime parameters, concurrency values, timeout values, structured-output schema, retention, unsafe-output handling, or fallback response;
- exact Node.js patch version, Fastify/plugin versions, package manager, code generator, or generated-client approach;
- reverse proxy, certificate mechanism, domain, port numbers, process supervisor, container choice, host hardening, or deployment scripts;
- App Check, MFA, session cookies, detailed role hierarchy, or custom-claim naming;
- log platform, retention period, audit policy, or pseudonymous user-reference policy;
- final UI baseline or user-facing error and fallback copy; or
- public, long-term Internet deployment.

These items remain subject to their existing open questions or later Q-30 child decisions. Approval of this architecture does not make a product PBI Ready when its behavior, data contract, privacy allowlist, algorithm, lifecycle, UI, test, ownership, or platform-evidence gates remain unresolved.

## Later incremental field decision

The PM subsequently approved deterministic v1 recommendation and non-Persona AI semantic field boundaries in [`2026-09-01-recommendation-ai-field-allowlists.md`](2026-09-01-recommendation-ai-field-allowlists.md) (S-PM-0901-Q17). This does not change the Q-30 architecture; at that decision point it partially resolves the field-contract gate while Persona-to-Qwen remains Blocked.

The PM subsequently closed that Persona projection remainder and resolved Q-19 in [`2026-09-01-persona-conversation-lifecycle.md`](2026-09-01-persona-conversation-lifecycle.md) (S-PM-0901-Q19). This supplies the structured projection and lifecycle semantics without changing the Q-30 architecture.

## Authority and change control

This is a current PM architecture decision. It is not a Sponsor/Supervisor decision, does not retroactively change the COMP3851A implementation or deployment record, and is not evidence that the Backend has been implemented, configured, deployed, or tested. Later decisions supersede it only within their stated scope and must preserve this decision trail.
