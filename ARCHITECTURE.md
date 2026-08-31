# ENMORI Flutter Client Architecture

- **Status:** Approved
- **Authority:** S-PM-0901, 2026-09-01
- **Scope:** Flutter client only
- **Detailed design:** [`docs/superpowers/specs/2026-09-01-flutter-client-architecture-design.md`](docs/superpowers/specs/2026-09-01-flutter-client-architecture-design.md)

This is the canonical operating summary for Flutter client structure and dependency rules. It does not approve backend, schema, API, Firebase, UI, or algorithm decisions. If this summary and the approved detailed design appear to conflict, report the conflict and stop affected work rather than choosing silently.

## Organization

Use feature-first organization with layers inside each feature:

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
    └── <feature>/
        ├── <feature>_providers.dart
        ├── presentation/
        ├── domain/          # only when justified
        └── data/            # only when external/stateful data exists
```

- `presentation` contains Views, Riverpod ViewModels, and immutable UI state.
- `domain` contains platform-independent models, Repository interfaces, and optional use cases.
- `data` contains Repository implementations, Services/adapters, and future DTO mapping.
- Create directories only when real files require them.
- A Domain layer is selective: use it for stable contracts, reusable rules, privacy rules, cross-Repository coordination, or logic that would otherwise make a ViewModel complex.

`core` contains only an approved project-level foundation protocol or a capability actually shared by at least two features with stable meaning. Do not promote code based on predicted reuse. `Result<T>` and `AppFailure` are approved project-level protocols. Do not create a generic `utils/` directory.

## Dependency direction

Arrows mean compile-time dependency:

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

- Repository implementations depend on Services; Services do not depend on Repositories.
- ViewModels depend on Repository interfaces, not implementations.
- Domain does not depend on Flutter, Riverpod, external SDKs, or platform plugins.
- `app` is the composition root and wires concrete implementations.
- Features cannot import another feature's Data or Presentation.

## Riverpod and ViewModels

- Use Riverpod without code generation for dependency composition and reactive Presentation state.
- Non-Riverpod Domain/Data classes use constructor injection and never receive `Ref`.
- Riverpod ViewModels declare Repository dependencies in `build()` with `ref.watch(repositoryProvider)`.
- ViewModel commands use dependencies declared during `build()`; they do not perform unrelated ad hoc Provider reads.
- Do not add a second DI container such as `get_it` in the architecture slice.
- Use one ViewModel per View or cohesive interaction flow.
- Use `Notifier`/`AsyncNotifier` with immutable UI state.
- Widget-local animation, focus, expansion, and isolated input state use `StatefulWidget`/`setState`.
- Repository/session sources own cross-page authoritative client data; ViewModels expose only page-specific derived state.

## Result and error boundary

```text
Repository/Domain: Future<Result<T>>
                         ↓ ViewModel maps
Presentation:       AsyncValue<UiState> or explicit immutable UI state
```

- Repository/Domain never returns `AsyncValue` or imports Riverpod.
- Views never receive `AsyncValue<Result<T>>`.
- `AppFailure` expresses stable application failure semantics without vendor exception types.
- Vendor exceptions cannot escape Data.
- Error normalization may occur in a Service or Repository; no additional normalization layer is mandatory.
- Fallback occurs only when an approved business rule permits it.
- Logs exclude credentials, tokens, complete AI payloads, precise location, and private/non-consenting user data.

## Auth Session and routing

- `AuthRepository` is the source of truth for session state as observed by the client.
- The trusted external authentication source and Backend remain the actual authentication/authorization authority.
- UI, Provider, Router, and Repository cannot grant identity, role, or authorization.
- The Auth Session Provider is application-owned, not page-scoped, and maintains one observation subscription.
- Route changes must neither dispose session observation nor create duplicate subscriptions.
- A successful sign-in command does not establish a session; navigation changes only after authenticated session observation.

Router-facing auth state folds initialization:

```text
Riverpod loading ─┐
                  ├→ resolving
Session initial ──┘
Session authenticated   → authenticated
Session unauthenticated → unauthenticated
```

- `resolving` shows one waiting surface and performs no auth redirect.
- Redirects are idempotent and loop-free.
- Admin route visibility is a navigation convenience, not an authorization boundary.
- Deep-link restoration remains deferred.

## Models, persistence, and platform boundaries

- Use small handwritten immutable Dart models in the first architecture slice.
- Do not pass `Map<String, dynamic>` from Data into Domain or Presentation.
- DTOs remain separate from Domain models.
- Do not implement custom offline-first storage, sync queues, conflict resolution, or persistent caching in this slice.
- Domain and Repository interfaces are platform-independent.
- Android/iOS APIs and plugins are wrapped by Data/Platform Services.
- Do not scatter `Platform.isAndroid` or `Platform.isIOS` through Domain or Presentation.

## Architecture validation slice

The first slice validates:

```text
bootstrap
→ application-lifetime Auth Session Provider
→ router-facing auth state
→ go_router
→ Auth ViewModel
→ AuthRepository interface
→ FakeAuthRepository
→ observed session state back to Provider/Router
```

It does not deliver production authentication and does not add Firebase configuration or a real Auth adapter.

Required evidence includes:

- pure Domain/Repository contract tests;
- Fake Repository contract tests;
- ViewModel Result/state tests;
- Provider lifetime and single-subscription tests;
- Router resolving/authenticated/unauthenticated and no-loop tests;
- Widget tests for waiting, unauthenticated, and authenticated surfaces;
- at least one FakeAuthRepository vertical integration test covering the complete loop; and
- Android and iOS build/evidence compatibility.

Named owners and reviewers belong in `TESTING.md`, the Scrum team policy, or the active Sprint plan, not this architecture file.

## Approved slice dependencies

Approved in principle:

- `flutter_riverpod`;
- `go_router`; and
- Flutter SDK `integration_test` support.

The implementation plan must verify versions compatible with Flutter 3.47.2, update `pubspec.yaml`, and commit `pubspec.lock`.

The slice does not add `get_it`, Provider, BLoC, Freezed, `json_serializable`, Mockito, Mocktail, or code generation. These are current-slice limits, not permanent prohibitions.

## Deferred decisions

This architecture does not decide:

- Firebase configuration, real Auth adapter, or token lifecycle;
- backend topology, Cloud Functions, or deployment;
- Firestore schema, DTO fields, migrations, or API contracts;
- recommendation formulas or factor registry;
- final Figma/UI baseline;
- offline synchronization/caching;
- logging/crash-reporting vendor and retention;
- final error copy or business fallback; or
- Account Action Request approval/execution.
