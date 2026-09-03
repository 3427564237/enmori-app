---
name: enmori-backend-development
description: Implement or review ENMORI Backend work within its approved TypeScript, Fastify, Firebase, Ports, OpenAPI, testing, privacy, and controlled-environment architecture. Use for assigned work under `backend/` or normative contracts under `api/`; do not use it to invent product behavior, data contracts, dependencies, or deployment choices.
---

# ENMORI Backend Development

Implement the smallest assigned Backend slice without settling a deferred decision or changing the approved architecture.

## Required sources

Before changing affected Backend or API files, read:

1. repository `AGENTS.md` and `docs/tooling/skill-routing.md`;
2. `docs/decisions/2026-09-01-backend-architecture.md`;
3. `docs/superpowers/specs/2026-09-01-backend-architecture-design.md` for the detailed boundary;
4. every later approved decision or contract applicable to the feature; and
5. the assigned GitHub Issue's approved scope, acceptance criteria, dependencies, owner, and reviewer.

Use `docs/SOURCE_MAP.md` and `docs/OPEN_QUESTIONS.md` to locate authority and unresolved gates. A resolved architecture decision is not proof that a production PBI is Ready. Report a source conflict and stop only the affected behavior.

## Architecture invariants

- Use TypeScript strict mode on the Node.js 24 LTS major line. Do not select the exact patch, package manager, package version, or code generator without its approved decision.
- Keep one feature-first modular monolith under `backend/`. Create directories only when implementation files require them; do not add microservices, CQRS, a general event bus, plugin systems, or speculative shared abstractions.
- The controlling dependency rule is: `Application/Domain defines Ports; Infrastructure implements Ports; inner layers never import Infrastructure.`
- Domain, Application, and Ports remain independent of Fastify, Firebase Admin, Firestore, Ollama, and other vendor types. Construct adapters at one explicit composition root and inject them through constructors; do not add a service locator.
- Fastify is the sole HTTP framework and is confined to Bootstrap and Transport. Transport handles HTTP mechanics, trusted schemas, DTO mapping, and stable application-failure mapping; it must not interpret vendor exceptions.
- Firebase Authentication verifies identity. The Backend derives the trusted Auth Principal from verified identity; it never trusts a UID, Admin authority, or access identity supplied through an ordinary body, query, or client-selected header.
- Firebase Admin and Cloud Firestore types and calls exist only in Infrastructure adapters. Admin privilege never replaces use-case authorization, consent, privacy filtering, or field minimization.
- Flutter may use Firebase directly only for the approved Authentication client boundary. It must not directly read or write Firestore product data; all product, social, recommendation, AI, and Admin operations cross the Backend API.
- Public application traffic uses versioned REST/JSON. Normative OpenAPI contracts and approved contract artifacts live under `api/`; Firestore records and vendor objects are never public DTOs.
- Qwen/Ollama access remains Backend-only behind an inner Port and Infrastructure adapter. Apply its later approved runtime/failure contract only when the assigned scope cites it; never infer model parameters, fields, fallbacks, or operational values.

## Failure, privacy, and environment boundaries

- Fail closed on unknown failures, missing authority, invalid identity, authorization failure, unsafe configuration, or unapproved fallback. Raw vendor errors, stack traces, credentials, and private content never enter public responses.
- Infrastructure translates Firebase, Firestore, Ollama, and other vendor failures into stable internal dependency errors. Application adds use-case meaning; Transport maps only stable application failures to the approved HTTP contract.
- Use structured logs with an explicit field allowlist. Allowed fields are limited to approved non-content operational metadata such as route template, HTTP status, latency, request ID, stable error category, dependency availability, and model-call duration.
- Never log tokens, credentials, service-account material, complete bodies, Check-in content, Mood, Approx Location, Persona content, prompts, model responses, Firestore documents, or user data embedded in paths. Do not add a pseudonymous user reference unless a later approved policy permits it.
- Credentials, Firebase service-account files, private keys, model files, runtime data, and OAuth state never enter Git, Flutter assets, OpenAPI examples, fixtures, or logs.
- Keep test, development, controlled-demo, and production modes explicit and isolated. Fail closed if emulator configuration appears in demo or production mode. Automated tests must never reach demonstration or real-user data.
- Dependency failure must not crash the Backend process; liveness, readiness, dependency health, affected endpoint availability, and admission capacity remain distinct according to approved contracts.

## Verification by boundary

- Test Domain and Application logic with handwritten fakes or stubs for Ports.
- Run the same Port contract suite against each relevant Infrastructure adapter.
- Use Fastify injection tests for authentication hooks, schemas, serialization, status mapping, and safe error mapping without opening a network listener.
- Validate normative OpenAPI and check that implemented routes and DTOs do not silently diverge from it.
- Run Firebase Authentication and Firestore Emulator integration tests against fixed, resettable, isolated data, including the applicable invalid/expired/revoked identity and authorization cases.
- Use a fake Qwen adapter in normal CI; require separately approved controlled-host evidence for live Ollama behavior.
- Record the commands, environment, results, reviewer path, and required Android/iOS evidence from the assigned Issue. Passing architecture checks proves conformance only, not product acceptance or Release readiness.

## Mandatory stop and report

Stop the affected work and identify the missing source or decision before creating or selecting any of the following unless the assigned approved contract already defines it:

- an endpoint/path, request or response DTO field, public error-code table, header, pagination cursor, idempotency mechanism, or update precondition;
- a Firestore collection, document field or ID shape, index, migration, delete rule, transaction inventory, or product-data allowlist;
- an exact Node.js patch, dependency/plugin version, package manager, schema/OpenAPI tool, generated-client approach, or new library;
- a reverse proxy, certificate mechanism, DNS name, port, process supervisor, container, host-hardening step, deployment script, or public deployment choice; or
- any product behavior, authorization rule, privacy/retention rule, recommendation formula, Qwen parameter/fallback, UI copy, or environment value not approved by the controlling sources.

Do not use `Mindrally/skills` `fastify-typescript` or `alinaqi/maggy` `firebase` as project guidance: their Prisma/JWT, client-Firestore, Cloud Functions, Google-sign-in, and example-schema defaults conflict with or exceed ENMORI's approved boundary.
