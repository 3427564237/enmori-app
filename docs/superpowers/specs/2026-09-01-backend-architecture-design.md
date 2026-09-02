# ENMORI Backend Architecture Design

- **Status:** Approved by PM on 2026-09-01
- **Decision scope:** Q-30 production Backend/Auth/Data/API, controlled-demo deployment, testing, and operational boundaries
- **Decision owner:** LI HOURUI, ENMORI PM
- **Decision source:** S-PM-0901-BACKEND
- **Prepared:** 2026-09-01
- **Related decision:** [`docs/decisions/2026-09-01-backend-architecture.md`](../../decisions/2026-09-01-backend-architecture.md)

The PM approved each design section and then approved the complete Q-30 baseline after two controlling clarifications: the dependency direction is defined by inner-layer Ports, and dependency failure may degrade readiness or affected endpoints without crashing the Backend process. This specification preserves the architecture rationale, boundaries, and verification expectations. It is a design record, not an implementation plan or proof of implementation.

## 1. Purpose and scope

This design resolves Q-30 sufficiently to establish the trusted production boundary for later feature refinement. It defines:

- the Flutter, Firebase, Backend, Firestore, and Qwen trust boundary;
- the Backend technology and internal dependency shape;
- the public API style and contract principles;
- the controlled Week 9 deployment shape;
- identity, authorization, and data-access authority;
- architecture-level testing and operational safeguards; and
- repository ownership of Backend code and API contracts.

It intentionally stops before feature endpoint design, Firestore schema design, field-level privacy contracts, recommendation algorithms, Qwen operational values, final UI behavior, or deployment-product selection.

## 2. Architecture drivers

The Backend must support the approved Week 9 vertical flow while preserving these confirmed constraints:

- Flutter is not the authority for authorization, privacy filtering, recommendation eligibility, scoring, ordering, or persisted business state.
- Qwen is Backend-only and cannot receive direct Flutter access, Firestore credentials, or mutation authority.
- Recommendation candidate selection, scoring, ranking, and permission decisions are deterministic and complete before Qwen is asked for any approved explanation.
- Sensitive and non-consenting data is filtered and minimized before it reaches downstream recommendation or AI processing.
- The architecture remains small enough for a five-person, four-Sprint delivery effort and a controlled Week 9 demonstration.
- Component failures remain isolatable and testable without requiring a microservice estate.

## 3. System and trust boundary

The approved system shape is:

```text
Flutter mobile app
├── Firebase Auth client SDK ───────────────→ Firebase Authentication
└── versioned HTTPS REST/JSON + ID token ──→ HTTPS edge
                                                 ↓
                                          Fastify Backend
                                          ├── verify Firebase identity
                                          ├── authorize and privacy-filter
                                          ├── deterministic business rules
                                          ├── Firebase Admin/Firestore adapter ─→ Cloud Firestore
                                          └── Qwen adapter ──────────────────────→ localhost Ollama
                                                                                     ↓
                                                                                Qwen3.5-9B
```

Flutter may use Firebase Authentication directly for email/password sign-in and Firebase ID-token lifecycle. Every product-data, social, recommendation, AI, and Admin operation crosses the Backend API. Flutter does not directly access product documents in Firestore.

The Backend is the sole trusted business authorization, privacy, and product-data entry point. Firebase Admin access gives the Backend technical capability; it does not itself grant business permission. Every use case still enforces the approved identity, authorization, consent, visibility, purpose, and field-minimization rules.

## 4. Technology and runtime baseline

The approved baseline is:

- TypeScript with strict compiler settings;
- the Node.js 24 LTS major line, with exact patch pinned during implementation planning;
- one modular-monolith Backend API;
- Firebase Admin modular SDK for identity and Firestore infrastructure access;
- Fastify as the sole HTTP framework;
- an internal Qwen Adapter owned by the Backend; and
- Ollama as a separate local process on the controlled demonstration host.

This approval does not select the package manager, exact dependency versions, OpenAPI/schema tooling, process supervisor, container runtime, or host platform product. Those choices require compatibility checks and, where architectural, explicit approval.

## 5. Internal architecture

### 5.1 Controlling dependency rule

The controlling rule is:

> `Application/Domain defines Ports; Infrastructure implements Ports; inner layers never import Infrastructure.`

Compile-time dependencies point inward. Object construction occurs at one explicit composition root.

```text
HTTP request
    ↓
Transport
    ↓
Application use case ─────→ Domain policy/rule
    ↓ depends on
Port defined by Application/Domain
    ↑ implemented by
Infrastructure adapter
    ↓
Firebase Admin / Firestore / Ollama
```

Infrastructure is allowed to import and implement inner Ports. Application and Domain never import Infrastructure implementations or vendor types. The diagram is not permission for Transport to catch or interpret Firebase, Firestore, or Ollama exceptions.

### 5.2 Feature-first modular monolith

Each implemented feature may contain:

- `transport`: route registration, authentication context intake, request/schema validation, DTO mapping, and HTTP response mapping;
- `application`: use cases, orchestration, authorization ordering, and transaction-boundary intent;
- `domain`: deterministic rules, privacy policies, recommendation rules, and domain types where they carry stable business meaning;
- `ports`: repository, identity-verification, clock, identifier, and Qwen contracts defined for inner-layer needs; and
- `infrastructure`: Firebase Admin, Firestore, Ollama, and other vendor adapters.

A small `shared` area may contain only stable cross-module identity, error, correlation, logging, or metrics abstractions. Predicted reuse is insufficient reason to move code into `shared`.

Features do not import another feature's Infrastructure. Cross-feature coordination occurs through an Application-facing contract or explicitly shared Port. MVP scope excludes microservices, CQRS, a general event bus, and a plugin system.

### 5.3 Framework isolation and composition

Fastify is confined to bootstrap and Transport. Application, Domain, and Ports remain framework-independent. Feature routes and hooks are registered through Fastify plugins, while one explicit composition root constructs adapters and injects them through constructors. A service locator is not used.

Static trusted schemas drive request validation and response serialization. Client-supplied dynamic schemas are prohibited. Fastify's injection mechanism provides Transport-level integration tests without opening a real network listener.

## 6. API style and contract principles

Public application traffic uses versioned HTTPS REST/JSON. The API version is independent from internal package or deployment versions. GraphQL, Firebase callable functions, and SSE are not selected for the MVP. AI returns a complete non-streaming JSON response so output validation or an approved deterministic fallback finishes before the client receives the response.

OpenAPI is the normative Flutter–Backend contract. Feature refinement adds paths and DTOs only after the corresponding behavior and data decisions are approved. Firestore documents, snapshots, paths, Firebase Admin objects, Fastify objects, and Ollama response types are never public DTOs.

Contract principles are:

- protected requests carry a Firebase ID token; the Backend derives a trusted Auth Principal;
- user identity and Admin authority are not accepted from ordinary body, query, or client-selected identity fields;
- every request and response has an explicit schema;
- undeclared request fields are rejected or discarded according to a later approved schema policy, never blindly persisted;
- optional fields prefer omission over ambiguous `null`;
- IDs are opaque strings;
- timestamps are timezone-aware UTC ISO 8601 values;
- cursor pagination is the default for collections;
- non-idempotent creates require an idempotency mechanism;
- conflicting updates require an approved version or precondition mechanism;
- recommendation result order is authoritative and Flutter does not reorder it; and
- AI requests identify an approved purpose instead of carrying arbitrary client-selected database context.

Exact routes, DTO fields, pagination cursors, idempotency headers, update preconditions, size limits, and error codes remain deferred.

## 7. Error boundary

Error translation follows the approved dependency direction:

```text
Firebase / Firestore / Ollama vendor exception
    ↓ caught and normalized by Infrastructure adapter
stable internal dependency error
    ↓ interpreted in the use-case context by Application
AppFailure
    ↓ mapped by Transport
HTTP status + stable error identifier + safe message + request ID
```

Transport does not import vendor exception classes or inspect raw vendor failures. Infrastructure preserves only the safe diagnostic context allowed by the logging policy. Application decides whether a dependency problem, authorization denial, validation failure, conflict, unavailable capability, or other stable application meaning applies to the use case.

An unknown exception reaches a global fail-closed handler, which returns a generic safe error and correlation/request ID. Raw vendor messages and stack traces never enter the API. The exact error identifier catalogue and user-facing copy require later approval.

Fallback is not an error-mapping convenience. It occurs only when a separately approved business rule permits it; the Qwen-specific contract is subsequently approved by S-PM-0902-Q31.

## 8. Identity and authorization

Flutter uses Firebase Authentication email/password. The Firebase client SDK manages sign-in and ID-token refresh; ENMORI does not add a second password system, refresh-token service, or Backend session-cookie system for Week 9.

Protected calls use the Firebase ID token as a bearer credential. The Backend verifies the token with Firebase Admin and constructs a trusted Auth Principal. The verified UID and approved access claims are authoritative; body, query, and ordinary client headers are not.

Profile, interest, consent, and privacy data remain product data and do not belong in custom claims. A minimal custom access claim may represent Admin capability and is assigned out of band by an authorized owner. Flutter may use the verified claim to decide whether to display Admin navigation, but the Backend reauthorizes every Admin operation.

For the controlled Week 9 environment, protected requests check token revocation and disabled-user status despite the additional Firebase network operation. Revoking Admin access also revokes refresh tokens and requires reauthentication.

App Check, MFA, session cookies, claim naming, and a detailed role hierarchy remain deferred.

## 9. Firestore authority and data access

Cloud Firestore is the sole Week 9 product business datastore. Firebase Authentication stores identity credentials; product profiles and product state belong in Firestore.

Flutter does not directly read or write product data in Firestore. Product Firestore client rules default to denying direct application access, while the Backend uses Firebase Admin through Infrastructure adapters. Because Admin access bypasses client security rules, Application use cases must authorize and privacy-filter before calling a Port.

Application and Domain depend on repository Ports. Only Infrastructure sees Firestore document, snapshot, reference, query, transaction, batch, or path types. Firestore records are mapped into inner models or approved DTO inputs at the adapter boundary.

The Backend supplies server-authoritative timestamps. Multi-record invariants use transactions or atomic batches when required by the later approved data contract. Recommendation reads only approved, filtered data and stores only the approved deterministic result. Qwen has no Firestore credential and no direct write path.

No SQL database, vector database, Redis, or general cache is added for the Week 9 MVP. Development, automated testing, and controlled demonstration use isolated Firebase environments. Destructive tests never target demonstration data.

Collection names, document IDs and fields, indexes, transaction inventory, delete behavior, and environment names remain deferred.

## 10. Controlled deployment boundary

Week 9 uses a controlled demonstration environment, not a public long-term Internet service. Android and iOS demonstration devices reach the service through a controlled LAN, VPN, or later approved temporary controlled entrance.

The physical trust topology is:

```text
controlled device
    ↓ HTTPS
controlled HTTPS edge
    ↓ private Backend listener
Fastify Backend on one controlled Linux host
├── outbound trusted connection → Firebase Authentication / Cloud Firestore
└── local private connection ───→ Ollama → Qwen3.5-9B
```

The HTTPS edge is the only device-visible ingress. The Backend's raw HTTP listener is not directly exposed. Ollama binds to loopback or an equivalent private local interface and is not available directly to the device or LAN. The Backend is the only application process allowed to call Ollama.

Backend and Ollama are separately supervised processes. Credentials enter through controlled environment configuration or platform identity and never through Git, Flutter assets, OpenAPI examples, logs, or test fixtures. Flutter receives only the controlled HTTPS base URL.

The request path does not add Cloud Functions, a second application service, a queue, or a microservice. Reverse proxy, DNS, certificate, ports, supervisor, host hardening, containerization, and deployment commands remain deferred.

## 11. Testing boundary

The architecture requires these test levels:

- pure Domain and Application unit tests using fakes or stubs for Ports;
- Infrastructure adapter contract tests against the Port behavior expected by inner layers;
- Fastify injection tests for authentication hooks, schemas, status mapping, response serialization, and error mapping;
- CI validation that the OpenAPI contract is valid and implemented routes do not silently diverge;
- Firebase Authentication and Firestore Emulator Suite integration tests with fixed, resettable data; and
- Android and iOS end-to-end evidence against an isolated demonstration Firebase environment and the controlled D1 Backend.

Emulator tests cover valid, missing, malformed, expired, and revoked identity; regular and Admin authorization; transactions and atomic batches; privacy and visibility; delete propagation where later approved; and concurrency behavior where a later contract defines it.

Environment mode is explicit. Startup or test safeguards fail closed when emulator variables appear in demo or production mode. Automated tests never connect to demonstration or real user data.

Normal CI uses a fake Qwen adapter. Live Ollama contract tests, unavailable-model behavior, invalid structured output, timeout, concurrency, and model-failure evidence are subsequently defined by S-PM-0902-Q31. Feature owners write the applicable tests; JIN retains the previously defined integration/UAT strategy and evidence responsibility. This allocation does not assign a new PBI owner.

## 12. Operations, observability, and secrets

The Backend generates or accepts according to a later header contract one correlation/request ID and includes it in safe error responses. Structured logging uses an explicit field allowlist.

Logs must not contain:

- Firebase ID tokens, service-account credentials, secrets, or private keys;
- complete request or response bodies;
- Check-in Note, Mood, or Approx Location;
- Persona content;
- prompts or Qwen responses;
- Firestore document content or user data embedded in paths; or
- stack traces returned to clients.

Allowed non-content operational fields may include route template, HTTP status, latency, request ID, stable error category, dependency availability, and model-call duration. Log retention, logging platform, audit policy, and whether any pseudonymous user reference may be logged remain Q-14 decisions.

Health signals are separate:

- `liveness`: whether the Backend process is running;
- `readiness`: whether the Backend can accept its defined core request set; and
- `dependency health`: Firebase and Ollama status for controlled operations checks.

The controlling availability rule is:

> dependency failure does not crash the Backend process, while readiness and affected endpoint availability may degrade independently

For example, Ollama unavailability does not stop non-AI features. The affected AI endpoint follows the later Q-31 fallback contract. A Firebase failure may make data-dependent endpoints unavailable and may reduce readiness according to a later health contract, while the process remains live for diagnosis and recovery.

Request-body limits, concurrency controls, timeouts, and rate limiting are required mechanisms, but their values remain deferred. Graceful shutdown stops accepting new work and completes or cancels in-flight work according to later operational values.

Week 9 does not add a third-party logging or monitoring vendor. Logger and metrics Ports remain replaceable.

## 13. Repository and contract ownership

ENMORI remains a single repository:

```text
ENMORI/
├── lib/          # Flutter client
├── backend/      # Backend source, dependencies, tests, and build boundary
└── api/          # normative OpenAPI contract and approved contract artifacts
```

The exact subdirectories are created only when implementation files require them. Flutter and Backend maintain separate dependency, build, and test boundaries. A JavaScript monorepo workspace is not required.

Backend owns maintenance of the normative API schema. Flutter consumes generated or handwritten client DTO mappings without importing Backend source. The generation/manual choice is deferred. CI may select Flutter, Backend, and Contract checks by affected directory, but the CI platform and workflow implementation are not approved here.

Firebase configuration, credentials, Ollama model files, and runtime data do not enter the repository.

## 14. Consequences and alternatives

### Approved consequences

- One Backend authorization boundary is easier to audit than mixed Flutter/Firestore business access.
- A modular monolith keeps deployment and cross-feature transactions simpler than microservices while retaining feature ownership boundaries.
- OpenAPI separates the mobile and Backend codebases without forcing a shared-language package.
- Complete AI responses permit validation before release to the client, at the cost of no token-streaming UX in the MVP.
- Revocation checking favors controlled-demo authorization correctness over the lowest possible Firebase call count.
- One controlled Linux host reduces Week 9 topology risk but is not a public-production availability design.

### Considered but not selected

- **Direct Flutter product access to Firestore:** rejected because it creates split business-authorization and privacy enforcement boundaries.
- **Cloud Functions as the primary Week 9 request service:** historical formal evidence exists, but the approved baseline instead uses one controlled Backend co-located with the local Qwen adapter.
- **Dart Backend:** not selected because Firebase Admin support is not the primary supported path and the historical backend baseline is TypeScript/Node.js.
- **Microservices, CQRS, event bus, and queue-first design:** not justified by MVP size or deployment needs.
- **GraphQL, callable functions, and SSE:** not selected; versioned REST/JSON and complete AI responses provide the approved contract shape.
- **Public long-term Internet deployment:** outside the Week 9 controlled demonstration boundary.

## 15. Deferred decisions and readiness impact

Q-30 is resolved at the architecture boundary. It does not make the affected production PBIs Ready by itself. The following remain unresolved:

- Q-17 purpose-specific field allowlists and exact API/data payload fields; S-PM-0901-Q17 subsequently approves deterministic v1 and non-Persona AI semantic fields, while the exact Persona projection and concrete API/storage fields remain unresolved;
- Q-03 deterministic recommendation formulas, weights, normalization, decay, and tie handling; S-PM-0901-Q03 subsequently resolves deterministic v1 with fixed integer formulas and total ordering, while later formula versions remain change-controlled;
- Q-19 Persona deletion and historical AI-conversation semantics; S-PM-0901-Q19 subsequently resolves the lifecycle, deletion, provenance, and structured projection requirements while concrete API/storage and retention durations remain separate;
- Q-14 retention, deletion, logging, and audit periods;
- Q-16 empty-state and deterministic fallback behavior and copy;
- Qwen runtime implementation evidence under the subsequently approved S-PM-0902-Q31 contract;
- Q-04 immutable UI visual-acceptance baseline; and
- feature-specific endpoint, DTO, Firestore schema, index, transaction, and test details derived only after the controlling behavior is approved.

Admin Recommendation Configuration remains Should / Not Ready and is not allowed to block a separately approved deterministic v1 recommendation implementation.

Before implementation, a separate implementation plan must pin compatible dependency versions and package tooling, decompose the work into reviewable tasks, cite the approved feature contracts, and retain Sprint ownership/reviewer/testing/platform-evidence gates. This specification does not authorize production implementation.

## 16. Acceptance checks for later implementation

An implementation may claim conformance to Q-30 only when evidence shows that:

1. Flutter directly uses Firebase only for Authentication and accesses all product data through the versioned Backend API.
2. Application/Domain define Ports, Infrastructure implements them, and inner layers import no Infrastructure or vendor types.
3. Fastify remains confined to bootstrap/Transport and object construction occurs at an explicit composition root.
4. Firebase, Firestore, and Ollama exceptions are normalized in Infrastructure; Transport maps only stable application failures.
5. OpenAPI matches implemented request and response contracts and no Firestore document is returned as an API DTO.
6. Verified Firebase identity, not client body/query identity, drives authorization; every Admin operation is reauthorized by the Backend.
7. Firestore direct product access from Flutter is denied and Backend technical privilege is paired with use-case authorization and privacy checks.
8. Qwen receives only approved minimized context and cannot select candidates, score, reorder, access Firestore, or persist product data.
9. Only the controlled HTTPS edge is device-visible; Backend and Ollama raw listeners are private.
10. Dependency failure does not crash the Backend process, while readiness and affected endpoint availability can degrade independently.
11. Logs and API errors contain no prohibited sensitive or vendor content and include the safe correlation boundary.
12. Emulator, Port, Transport, OpenAPI, Android, and iOS evidence is isolated from demonstration and real user data.

Passing these checks proves architecture conformance only. Product acceptance still requires the applicable business, privacy, algorithm, UI, UAT, owner, reviewer, and Release Definition of Done evidence.
