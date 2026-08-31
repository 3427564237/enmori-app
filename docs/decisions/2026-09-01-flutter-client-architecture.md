# Flutter client architecture — 2026-09-01

- **Status:** Approved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901
- **Scope:** Flutter client architecture only
- **Detailed specification:** [`docs/superpowers/specs/2026-09-01-flutter-client-architecture-design.md`](../superpowers/specs/2026-09-01-flutter-client-architecture-design.md)
- **Canonical summary:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md)

ENMORI adopts feature-first Flutter organization with Presentation, selective Domain, and Data layers inside each feature. Riverpod without code generation is the client composition and Presentation-state mechanism; business classes retain constructor injection. `go_router` provides declarative navigation. Repository interfaces isolate Presentation/Domain from Data implementations and external Services.

The project-wide Repository result protocol is handwritten Dart `Result<T>` / `AppFailure`. Repository/Domain boundaries do not expose Riverpod `AsyncValue`; ViewModels unwrap Repository results and expose `AsyncValue<UiState>` or explicit immutable UI state. Data-layer normalization may occur in a Service or Repository, but vendor exception types cannot escape Data.

`AuthRepository` is the source of truth for session state as observed by the client. Actual authentication and authorization authority remains with the trusted external authentication source and Backend. The application-lifetime Auth Session Provider owns one observation subscription; Router-facing state folds Riverpod loading and session initialization into one `resolving` state.

The first architecture validation slice uses `FakeAuthRepository` and must include a vertical integration test covering bootstrap, session Provider, Router, ViewModel, Repository, and observed session changes. It is architecture evidence, not delivered production authentication. Android and iOS build/evidence compatibility is an architecture requirement; named test owners belong in current testing/Sprint records.

Only `flutter_riverpod`, `go_router`, and SDK testing support for `integration_test` are approved in principle for this slice. Compatible versions must be verified against Flutter 3.47.2 and `pubspec.lock` must be committed. The current slice does not introduce code generation, Freezed, `json_serializable`, `get_it`, BLoC, Provider, Mockito, or Mocktail; this is not a permanent prohibition.

This decision does not approve Firebase configuration or a real Auth adapter, backend topology, schema, API contracts, recommendation algorithms/factor registry, final UI baseline, offline synchronization, logging vendor, final error copy/fallbacks, or Account Action Request execution.
