# ENMORI Flutter Client Architecture Design

- **Status:** Pending PM review of this complete written specification
- **Decision scope:** Flutter client only
- **Decision owner:** LI HOURUI, ENMORI PM
- **Prepared:** 2026-09-01
- **Pinned baseline:** Flutter 3.47.2 / Dart 3.13.2

The individual design sections were approved during the architecture review. This document is not yet a reusable project authority: implementation and updates to the canonical project decision trail wait for PM approval of this exact written specification.

## 1. Purpose and scope

This design establishes a scalable, testable Flutter client architecture for a five-person team. It defines source organization, dependency direction, presentation state, client-side session observation, routing, error boundaries, platform boundaries, and the minimum architecture validation slice.

It does not decide:

- Firebase project configuration or the real authentication adapter;
- backend topology, Cloud Functions design, or deployment;
- Firestore schema, DTO fields, migrations, or API contracts;
- recommendation formulas or the implemented and approved factor registry;
- final Figma/UI approval baseline;
- custom offline synchronization or persistent caching;
- logging/crash-reporting vendors;
- final error copy or business fallback behavior; or
- Account Action Request approval and execution behavior.

These areas require separate approved decisions. This client design must not be used to infer them.

## 2. Architecture drivers

The client must support:

- parallel feature work by five developers without turning global layer directories into merge hotspots;
- Android and iOS from one Flutter codebase while keeping platform APIs isolated;
- testable privacy, session, navigation, and asynchronous UI behavior;
- replacement of Fake adapters with approved external integrations without changing Presentation or Domain contracts;
- the confirmed boundary that Flutter never accesses Qwen directly and never becomes the authority for authentication, authorization, privacy filtering, recommendation candidates, scores, ordering, or persisted business state; and
- incremental complexity: optional layers and shared abstractions are introduced only when justified.

Flutter's current architecture guidance recommends separation of UI and Data, repository abstractions, Views/ViewModels, unidirectional data flow, and isolated component tests. It also describes state-management library choice and an additional Domain layer as context-dependent. ENMORI adopts those principles with a feature-first physical structure rather than copying the official case-study layout verbatim.

## 3. Approved architectural style

Use **feature-first organization with layers inside each feature**.

Every implemented feature may contain:

- `presentation`: Flutter Views, Riverpod ViewModels, and immutable UI state;
- `domain`: platform-independent models, Repository interfaces, and optional use cases; and
- `data`: Repository implementations, external Services/adapters, and future DTO mapping.

Create directories only when real files require them. Do not pre-generate empty structures for every planned ENMORI feature.

The Domain layer is selective, not ceremonial. Create it when a feature needs a stable Repository contract, reusable business rule, privacy rule, cross-Repository coordination, or logic that would otherwise make a ViewModel complex. Simple static or presentation-only features do not need empty Domain/Data layers.

## 4. Project structure

The initial structure is:

```text
lib/
├── main.dart
├── app/
│   ├── app.dart
│   ├── bootstrap.dart
│   └── router/
├── core/
│   ├── result/
│   └── logging/
└── features/
    └── auth/
        ├── auth_providers.dart
        ├── presentation/
        │   ├── views/
        │   ├── view_models/
        │   └── state/
        ├── domain/
        │   ├── models/
        │   └── repositories/
        └── data/
            ├── repositories/
            └── services/
```

`core` admits only:

1. a capability already approved as a project-level foundation protocol; or
2. a capability actually shared by at least two features whose meaning has become stable.

Nothing moves to `core` because it might be reusable later. `Result<T>` and `AppFailure` qualify because this specification approves them as the project-wide Repository result protocol. Other feature code remains local until the rule above is satisfied. Do not create a generic `utils/` dumping ground.

## 5. Dependency direction and feature boundaries

Arrows in this section mean **compile-time dependency**:

```text
View
  ↓
ViewModel
  ↓
Repository interface (Domain)
  ↑ implemented by
Repository implementation (Data)
  ↓
Service / external adapter (Data)
  ↓
External SDK or API
```

Object construction flows separately:

```text
Service
  → Repository implementation
  → Repository interface binding
  → ViewModel
  → View
```

Rules:

- Views know their ViewModel/UI state and do not call Repositories or Services.
- ViewModels depend on Repository interfaces, never Repository implementations.
- Repository implementations depend on Services/adapters; Services do not depend on Repositories.
- Domain does not depend on Flutter, Riverpod, Firebase, HTTP clients, or platform plugins.
- Data may depend on its feature's Domain contracts and approved external packages.
- Presentation may depend on Flutter, Riverpod, and its feature's Domain.
- `app` is the composition root and may see concrete implementations to wire the graph.
- One feature cannot import another feature's Data or Presentation. Stable cross-feature behavior uses an explicit Domain contract or a separately justified coordinating use case.

## 6. Dependency injection and Riverpod

Use Riverpod as the composition mechanism and reactive Presentation runtime. Do not use Riverpod as a hidden service locator inside business classes.

- Service, Repository, and ViewModel classes receive dependencies through constructors.
- Providers construct and bind those classes at feature/app composition boundaries.
- Tests replace Providers through overrides.
- Do not add `get_it` or another dependency container in this architecture slice.
- Do not use Riverpod code generation in this architecture slice.
- Local widget concerns such as animation controllers, focus, temporary expansion, and isolated input state use `StatefulWidget`/`setState`.

## 7. Presentation model and state ownership

Use one ViewModel for one View or cohesive multi-widget interaction flow. A ViewModel is implemented with Riverpod `Notifier` or `AsyncNotifier`, exposes immutable UI state, and provides commands named for user intent.

- Views contain layout, animation, simple visibility checks, and event forwarding only.
- ViewModels transform Domain data into UI state and map Repository results into Presentation state.
- A feature must not create one large Controller for unrelated screens.
- Do not create a Provider for every field. Use one coherent immutable UI state when several fields change together.
- Cross-page authoritative client data lives in a Repository/session source and is observed by ViewModels; it is not independently copied as a second source of truth in each ViewModel.
- Submission commands expose running/success/failure state and prevent unintended duplicate execution.
- Final user-facing error and empty-state copy remains a UI/requirements decision, not an architecture default.

## 8. `Result<T>` and `AsyncValue<T>` boundary

The boundary is:

```text
Repository/Domain boundary          Riverpod Presentation boundary
──────────────────────────          ──────────────────────────────
Future<Result<T>>       → ViewModel → AsyncValue<UiState>
```

Rules:

- Repository and Domain operations use `Result<T>` and `AppFailure`.
- Riverpod ViewModels use `AsyncValue<T>` or an explicit immutable UI state.
- Repository interfaces never return `AsyncValue` and Domain never imports Riverpod.
- Views never receive `AsyncValue<Result<T>>`. The ViewModel unwraps `Result`, then maps it to the selected Presentation state.
- A screen with multiple independent operations may use explicit operation-status fields in one immutable UI state; do not build nested `AsyncValue<Result<...>>` graphs.
- `AppFailure` expresses stable application-level failure meaning without retaining vendor exception types.

## 9. Data-layer error normalization

External exceptions must not escape the Data layer, but the exact normalization location is optional:

```text
Option 1: SDK exception → Service normalization → Repository → Result
Option 2: SDK exception → Repository mapping               → Result
```

- Use Service-level normalization when an external SDK/API has complex, reusable vendor-specific errors.
- Let the Repository map directly when an adapter is small or normalization would only add a forwarding error type.
- Fake/in-memory Services do not need artificial exception wrappers for structural symmetry.
- Do not mandate a `DataSourceFailure` layer.
- Repository callers observe only project `Result<T>` / `AppFailure` semantics.
- A failure must not trigger silent fallback unless an approved business rule explicitly permits that fallback.

Logs may record operation categories and non-identifying diagnostics. They must not record credentials, tokens, complete AI payloads, precise location, or private/non-consenting user data. Vendor selection and full retention policy remain undecided.

## 10. Client-side Auth Session authority

The authority chain is:

```text
Trusted external authentication source / Backend
                 ↓ observed through an approved adapter
AuthRepository (client-side session source of truth)
                 ↓
application-lifetime Auth Session Provider
                 ↓
Router-facing auth state + interested ViewModels
```

`AuthRepository` is the single source of truth for the session **as observed by the client**. Actual authentication and authorization authority always belongs to the trusted external authentication source and Backend. Neither Repository, Provider, Router, nor UI can grant identity, roles, or authorization.

Rules:

- The Auth Session Provider projects Repository session observations and cannot be mutated directly by UI code.
- A successful `signIn()` command response does not establish a session. Navigation changes only after the Repository's observed session emits authenticated.
- Logout, expiry, revocation, and account-state changes are likewise driven by observed session state.
- Admin UI visibility may use backend-verified session information, but every protected operation is re-authorized by the Backend.
- The exact session fields, token lifecycle, and external adapter remain deferred.

### Application lifecycle and subscription ownership

The Auth Session Provider is owned by the application composition root for the application's lifetime.

- It is not page-scoped and does not use page-driven `autoDispose` behavior.
- Navigation must not destroy and recreate session observation.
- One app-level Provider owns one Repository session subscription at a time.
- Rebuilding the Router or moving between routes must not add duplicate subscriptions.
- Tests must verify subscription count/lifetime across route changes and Provider disposal at application shutdown.

## 11. Router-facing auth state

The Router consumes a small derived state, not raw nested Riverpod/session states.

```text
Riverpod AsyncLoading ─┐
                      ├→ resolving
Session initializing ─┘
Session authenticated  → authenticated
Session unauthenticated→ unauthenticated
```

This fold prevents two competing initialization meanings and avoids login-screen flashes or duplicate redirect branches.

- While `resolving`, show one startup/waiting surface and perform no auth redirect.
- An unauthenticated user requesting a protected route goes to the login entry.
- An authenticated user requesting the login entry goes to the default authenticated entry.
- Redirect functions are idempotent and must not loop.
- The Router responds to observed session changes, not ViewModel command completion.
- Client-side Admin route visibility is a navigation convenience, never proof of authorization.
- Deep-link restoration policy remains deferred until navigation requirements are approved.

## 12. Models and generated code

Use small, immutable, handwritten Dart models for this architecture slice.

- Do not pass `Map<String, dynamic>` across Data into Domain or Presentation.
- Future Data DTOs remain separate from Domain models.
- Do not introduce Freezed, `json_serializable`, or model code generation in this slice because external contracts are not approved.
- This is a slice constraint, not a permanent ban. A later approved contract may justify those dependencies.

## 13. Offline and caching boundary

Do not design custom offline-first storage, synchronization queues, conflict resolution, or persistent client caching in this slice.

- Repositories retain an abstraction boundary that can support a future approved strategy.
- Temporary in-memory UI/session data is not described as offline support.
- Features cannot create independent caches that become competing sources of truth.
- Any future Firebase SDK persistence behavior must be evaluated with privacy, deletion propagation, permission revocation, and freshness requirements before being treated as project behavior.

## 14. Platform boundary

- Domain and Repository interfaces are platform-independent.
- Android/iOS plugins and platform APIs are wrapped by Data/Platform Services.
- Do not scatter `Platform.isAndroid` or `Platform.isIOS` through Domain or Presentation.
- The architecture and its vertical slice must be buildable and evidenced on both Android and iOS.
- Permanent architecture documents state the dual-platform evidence requirement, not individual team-member assignments. Named owners/reviewers belong in `TESTING.md`, the Scrum team policy, or the current Sprint plan.

## 15. Architecture validation slice

The first implementation slice validates architecture rather than delivering production authentication.

```text
App bootstrap
  → application-lifetime Auth Session Provider
  → router-facing auth state
  → go_router redirect
  → Auth ViewModel
  → AuthRepository interface
  → FakeAuthRepository
```

The slice may include minimal test surfaces needed to observe routing states. They are not the final visual login experience and must not be reported as completed authentication.

The slice excludes Firebase packages/configuration, real credentials, real API/schema contracts, full onboarding/profile/privacy behavior, Admin authorization, and custom offline storage.

## 16. Test architecture

Prefer handwritten Fakes and outcome/contract testing. Do not introduce Mockito or Mocktail in this slice. This is not a permanent ban; later third-party complexity may justify a separate dependency decision.

Required test levels:

- **Domain:** session models and Repository contracts run without Flutter/Riverpod.
- **Data:** Fake Repository follows the same session contract required of a future real implementation.
- **ViewModel:** commands, `Result` mapping, duplicate-submit protection, and recovery.
- **Provider:** overrides, application lifetime, one active session subscription, and correct disposal.
- **Router:** resolving/authenticated/unauthenticated behavior, idempotent redirects, and no loops.
- **Widget:** startup waiting, unauthenticated entry, and authenticated app shell.
- **Vertical integration:** at least one integration test using `FakeAuthRepository` must traverse bootstrap → Auth Session Provider → Router → ViewModel → Repository and back through observed session state.

The vertical integration test must prove that:

1. `AsyncLoading` and session `initializing` both produce router `resolving`;
2. successful command completion does not navigate before authenticated session observation;
3. authenticated observation changes the visible route;
4. unauthenticated observation removes protected content;
5. page navigation neither destroys session observation nor creates duplicate subscriptions; and
6. Provider override replaces the external boundary without SDK access.

Test names and evidence must not imply that client Router behavior proves backend authorization. Platform-specific behavior added later requires separate Android/iOS evidence.

## 17. Approved dependencies for the slice

Only these architecture additions are approved in principle:

```text
Runtime:
- flutter_riverpod
- go_router

Testing:
- flutter_test
- integration_test
```

The implementation plan must select versions compatible with Flutter 3.47.2, verify them against primary package/Flutter documentation, update `pubspec.yaml`, and commit `pubspec.lock`.

Do not add `get_it`, Provider, BLoC, Freezed, `json_serializable`, Mockito, Mocktail, or code-generation tooling in this slice. These are current-slice limits, not permanent project prohibitions.

Every later dependency requires a task-specific justification and approval when it changes architecture, external integration, generated code, or project-wide conventions.

## 18. Alternatives considered

### Global layer-first directories

Rejected for the current team because a many-feature application would scatter one feature across global `ui`, `domain`, and `data` trees and increase cross-team merge hotspots. The logical dependency layers are retained inside each feature.

### SDK-only `ChangeNotifier` architecture

Not selected because ENMORI has several asynchronous shared states and needs consistent dependency overrides. Flutter's `ChangeNotifier` remains valid for other projects, but Riverpod is the approved reactive composition tool here.

### BLoC/Cubit

Not selected for the first client architecture because its event/state file ceremony is not justified for this team's initial slice. This is not a claim that BLoC is technically unsuitable.

### Universal mandatory Domain layer

Rejected because empty layers and pass-through use cases increase cognitive load without improving boundaries. Domain remains available where real rules or contracts justify it.

### Structure-only scaffolding

Rejected because empty folders and interfaces do not demonstrate session lifetime, dependency replacement, state mapping, or routing behavior. The Fake-auth vertical slice provides executable evidence without selecting a real authentication backend.

## 19. Acceptance criteria for architecture implementation

The later implementation is acceptable only when:

1. code follows the feature-first dependency rules without cross-feature Data/Presentation imports;
2. Domain compiles without Flutter, Riverpod, or external SDK imports;
3. Riverpod is used for composition while business classes retain constructor injection;
4. no View receives `AsyncValue<Result<T>>`;
5. external exception types do not escape Data;
6. Router consumes the folded router-facing auth state;
7. Auth Session Provider has application-level lifetime and exactly one active observation subscription;
8. the Fake-auth vertical integration test covers the complete approved loop;
9. analyzer, unit, Provider, Router, Widget, and integration tests pass;
10. Android and iOS build/evidence requirements are satisfied without embedding named owners in architecture;
11. no unapproved packages, Firebase configuration, API/schema decisions, or product behavior are introduced;
12. `pubspec.lock` is updated and committed; and
13. documentation distinguishes architecture validation from production authentication delivery.

## 20. Governance and next gate

After PM approval of this complete document:

1. persist a dated PM architecture decision under `docs/decisions/`;
2. update `docs/SOURCE_MAP.md`, `docs/PROJECT_CONTEXT.md`, and affected deferred/open-decision wording together;
3. create or update the canonical `ARCHITECTURE.md` without adding unapproved decisions;
4. use `writing-plans` to produce the implementation plan; and
5. do not implement until that plan is reviewed under the normal project workflow.

## References

- [Flutter: Guide to app architecture](https://docs.flutter.dev/app-architecture/guide)
- [Flutter: Architecture recommendations](https://docs.flutter.dev/app-architecture/recommendations)
- [Flutter: Common architecture concepts](https://docs.flutter.dev/app-architecture/concepts)
- [Flutter: Architecture case study](https://docs.flutter.dev/app-architecture/case-study)
