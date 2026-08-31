# Flutter Client Architecture Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest executable Flutter slice that proves ENMORI's approved client dependency direction, Riverpod session lifetime, Router authentication folding, ViewModel result mapping, and Android/iOS compatibility using `FakeAuthRepository`.

**Architecture:** The app is feature-first. Auth Presentation depends on an Auth Domain contract; the Fake implementation lives in Auth Data. Non-Riverpod Domain/Data objects use constructor injection. Riverpod ViewModels declare Repository dependencies in `build()` with `ref.watch`. One application-lifetime session Provider owns the Repository observation, and `go_router` redirects only from a folded router-facing state.

**Tech Stack:** Flutter 3.47.2 through FVM, Dart 3.13.2, `flutter_riverpod` 3.4.2, `go_router` 18.0.0, Flutter SDK `integration_test`, Flutter test framework

**Spec:** `docs/superpowers/specs/2026-09-01-flutter-client-architecture-design.md`

## Scope guardrails

- This plan implements architecture evidence, not production authentication.
- Do not configure Firebase or select a real Auth provider.
- Do not add backend, schema, API, recommendation, final UI, or offline-sync behavior.
- Do not add code generation, Freezed, `json_serializable`, `get_it`, BLoC, Provider, Mockito, or Mocktail in this slice.
- Keep the validation UI visibly labelled as architecture-only.
- Do not pass Riverpod `Ref` into Domain/Data classes.
- Do not read Providers ad hoc inside ViewModel commands; commands use Repository dependencies declared in `build()`.
- Commit the regenerated `pubspec.lock`.
- Android and iOS evidence are both required before the slice is Done. A Linux implementation run may stop with iOS evidence explicitly pending; it must not claim full completion.

---

## Task 1: Add only the approved dependencies

**Files:**

- Modify: `pubspec.yaml`
- Modify and commit: `pubspec.lock`

- [ ] **Step 1: Add the approved packages through FVM**

Run:

```bash
fvm flutter pub add flutter_riverpod:3.4.2 go_router:18.0.0
fvm flutter pub add 'dev:integration_test:{"sdk":"flutter"}'
```

Expected: dependency resolution succeeds with Flutter 3.47.2 / Dart 3.13.2, and both `pubspec.yaml` and `pubspec.lock` change.

- [ ] **Step 2: Verify dependency scope and lockfile**

Run:

```bash
git diff -- pubspec.yaml pubspec.lock
fvm flutter pub get
git status --short pubspec.lock
```

Expected: only the three approved packages and their transitive lock entries are added; `pubspec.lock` is tracked as modified.

- [ ] **Step 3: Commit**

```bash
git add pubspec.yaml pubspec.lock
git commit -m "build: add client architecture dependencies"
```

---

## Task 2: Introduce the project-wide Result protocol

**Files:**

- Create: `lib/core/result/app_failure.dart`
- Create: `lib/core/result/result.dart`
- Create: `test/core/result/result_test.dart`

- [ ] **Step 1: Write the failing Result tests**

Create `test/core/result/result_test.dart`:

```dart
import 'package:enmori/core/result/app_failure.dart';
import 'package:enmori/core/result/result.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('success retains its value', () {
    const result = Success<int>(42);
    expect(result.value, 42);
  });

  test('failure retains a stable application failure', () {
    const appFailure = AppFailure(
      kind: AppFailureKind.unauthorized,
      code: 'auth.invalid_credentials',
    );
    const result = Failure<int>(appFailure);
    expect(result.failure, same(appFailure));
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `fvm flutter test test/core/result/result_test.dart`

Expected: FAIL because the Result files do not exist.

- [ ] **Step 3: Implement the minimal protocol**

Create `lib/core/result/app_failure.dart`:

```dart
enum AppFailureKind {
  validation,
  unauthorized,
  forbidden,
  unavailable,
  conflict,
  unexpected,
}

final class AppFailure implements Exception {
  const AppFailure({required this.kind, required this.code});

  final AppFailureKind kind;
  final String code;
}
```

Create `lib/core/result/result.dart`:

```dart
import 'app_failure.dart';

sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  const Success(this.value);

  final T value;
}

final class Failure<T> extends Result<T> {
  const Failure(this.failure);

  final AppFailure failure;
}
```

- [ ] **Step 4: Run the focused test**

Run: `fvm flutter test test/core/result/result_test.dart`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/core/result test/core/result
git commit -m "feat: add application result protocol"
```

---

## Task 3: Define Auth Domain contracts and the Fake Data adapter

**Files:**

- Create: `lib/features/auth/domain/auth_session.dart`
- Create: `lib/features/auth/domain/auth_repository.dart`
- Create: `lib/features/auth/data/repositories/fake_auth_repository.dart`
- Create: `test/features/auth/data/fake_auth_repository_test.dart`

- [ ] **Step 1: Write failing Fake repository contract tests**

Test these behaviors in `test/features/auth/data/fake_auth_repository_test.dart`:

```dart
test('watchSession emits current session before later changes', () async {
  final repository = FakeAuthRepository(
    initialSession: const AuthSessionInitializing(),
  );
  addTearDown(repository.dispose);

  final sessions = <AuthSession>[];
  final subscription = repository.watchSession().listen(sessions.add);
  addTearDown(subscription.cancel);
  await pumpEventQueue();

  repository.emitSession(const AuthSessionUnauthenticated());
  await pumpEventQueue();

  expect(sessions, [
    isA<AuthSessionInitializing>(),
    isA<AuthSessionUnauthenticated>(),
  ]);
});

test('signIn returns success and publishes an authenticated session', () async {
  final repository = FakeAuthRepository();
  addTearDown(repository.dispose);
  final sessions = <AuthSession>[];
  final subscription = repository.watchSession().listen(sessions.add);
  addTearDown(subscription.cancel);
  await pumpEventQueue();

  final result = await repository.signIn(
    email: 'architecture@example.invalid',
    password: 'architecture-only',
  );
  await pumpEventQueue();

  expect(result, isA<Success<void>>());
  expect(sessions.last, isA<AuthSessionAuthenticated>());
});
```

Also test `signOut`, `watchCallCount`, and `activeSubscriptionCount` so later lifetime tests have observable evidence.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `fvm flutter test test/features/auth/data/fake_auth_repository_test.dart`

Expected: FAIL because the contracts and Fake do not exist.

- [ ] **Step 3: Implement the Domain contract**

Use this session model in `auth_session.dart`:

```dart
sealed class AuthSession {
  const AuthSession();
}

final class AuthSessionInitializing extends AuthSession {
  const AuthSessionInitializing();
}

final class AuthSessionUnauthenticated extends AuthSession {
  const AuthSessionUnauthenticated();
}

final class AuthSessionAuthenticated extends AuthSession {
  const AuthSessionAuthenticated({required this.userId});
  final String userId;
}
```

Use this Repository interface in `auth_repository.dart`:

```dart
abstract interface class AuthRepository {
  Stream<AuthSession> watchSession();

  Future<Result<void>> signIn({
    required String email,
    required String password,
  });

  Future<Result<void>> signOut();
}
```

Import only project Dart files. Domain must not import Flutter, Riverpod, `go_router`, or an external SDK.

- [ ] **Step 4: Implement `FakeAuthRepository`**

Use a broadcast `StreamController<AuthSession>`, store the current session, and implement `watchSession()` as an `async*` stream that:

1. increments `watchCallCount` and `activeSubscriptionCount`;
2. yields the current session immediately;
3. yields later controller events;
4. decrements `activeSubscriptionCount` in `finally`.

Default to `AuthSessionUnauthenticated`. `signIn` returns `const Success<void>(null)` and publishes `AuthSessionAuthenticated(userId: 'fake-user')`; `signOut` returns success and publishes unauthenticated. Expose `emitSession(AuthSession session)` only as an explicitly Fake/testing seam. Provide `Future<void> dispose()`.

- [ ] **Step 5: Verify tests and Domain independence**

Run:

```bash
fvm flutter test test/features/auth/data/fake_auth_repository_test.dart
rg -n "package:(flutter|flutter_riverpod|go_router)" lib/features/auth/domain lib/core/result
```

Expected: tests PASS and `rg` returns no matches.

- [ ] **Step 6: Commit**

```bash
git add lib/features/auth/domain lib/features/auth/data test/features/auth/data
git commit -m "feat: add fake auth repository contract"
```

---

## Task 4: Establish application-lifetime session ownership

**Files:**

- Create: `lib/features/auth/presentation/providers/auth_providers.dart`
- Create: `test/features/auth/presentation/providers/auth_providers_test.dart`

- [ ] **Step 1: Write failing Provider lifetime tests**

The tests must create a `ProviderContainer` with `authRepositoryProvider.overrideWithValue(fake)`, listen to `authSessionProvider`, and assert:

- Riverpod loading and `AuthSessionInitializing` both fold to `RouterAuthState.resolving`;
- emitting unauthenticated/authenticated changes the folded state correctly;
- multiple consumers of `authSessionProvider` still produce `fake.watchCallCount == 1` and `fake.activeSubscriptionCount == 1`;
- removing a page-level consumer while an app-level consumer remains does not cancel or recreate the Repository subscription;
- disposing the container eventually returns `activeSubscriptionCount` to zero.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `fvm flutter test test/features/auth/presentation/providers/auth_providers_test.dart`

Expected: FAIL because Providers do not exist.

- [ ] **Step 3: Implement the Providers**

Use these public types:

```dart
enum RouterAuthState { resolving, authenticated, unauthenticated }

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final repository = FakeAuthRepository();
  ref.onDispose(repository.dispose);
  return repository;
});

final authSessionProvider = StreamProvider<AuthSession>((ref) {
  return ref.watch(authRepositoryProvider).watchSession();
});

final routerAuthStateProvider = Provider<RouterAuthState>((ref) {
  final session = ref.watch(authSessionProvider);
  return switch (session) {
    AsyncData(value: AuthSessionAuthenticated()) =>
      RouterAuthState.authenticated,
    AsyncData(value: AuthSessionUnauthenticated()) =>
      RouterAuthState.unauthenticated,
    _ => RouterAuthState.resolving,
  };
});
```

Do not use `.autoDispose`. The app Router will be the stable application-level consumer in Task 6. Mapping `AsyncError` to `resolving` is a fail-closed architecture-slice behavior only; final recovery UX remains deferred.

- [ ] **Step 4: Run focused tests**

Run: `fvm flutter test test/features/auth/presentation/providers/auth_providers_test.dart`

Expected: PASS, including exactly one active session observation.

- [ ] **Step 5: Commit**

```bash
git add lib/features/auth/presentation/providers test/features/auth/presentation/providers
git commit -m "feat: own auth session at application lifetime"
```

---

## Task 5: Add the Riverpod Auth ViewModel boundary

**Files:**

- Create: `lib/features/auth/presentation/view_models/auth_view_model.dart`
- Create: `test/features/auth/presentation/view_models/auth_view_model_test.dart`

- [ ] **Step 1: Write failing ViewModel tests**

Cover all of the following through a `ProviderContainer` override:

- `build()` obtains the active Repository from `authRepositoryProvider`;
- `signIn` enters `AsyncLoading<void>` and maps `Success<void>` to `AsyncData<void>`;
- `Failure<void>` maps to `AsyncError<void>` containing the project `AppFailure`, not a nested `Result`;
- a second submit while the first is running is ignored;
- separate containers with different Repository overrides drive the corresponding ViewModel instances, proving the dependency comes from the Provider graph rather than an internally constructed implementation.

Use hand-written test repositories implementing `AuthRepository`; do not add a mocking package.

- [ ] **Step 2: Run the test to verify it fails**

Run: `fvm flutter test test/features/auth/presentation/view_models/auth_view_model_test.dart`

Expected: FAIL because the ViewModel does not exist.

- [ ] **Step 3: Implement the ViewModel**

Use this dependency shape:

```dart
final authViewModelProvider =
    NotifierProvider<AuthViewModel, AsyncValue<void>>(AuthViewModel.new);

final class AuthViewModel extends Notifier<AsyncValue<void>> {
  late AuthRepository _repository;

  @override
  AsyncValue<void> build() {
    _repository = ref.watch(authRepositoryProvider);
    return const AsyncData<void>(null);
  }

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    if (state.isLoading) return;
    state = const AsyncLoading<void>();
    final result = await _repository.signIn(
      email: email,
      password: password,
    );
    state = switch (result) {
      Success<void>() => const AsyncData<void>(null),
      Failure<void>(:final failure) =>
        AsyncError<void>(failure, StackTrace.current),
    };
  }

  Future<void> signOut() async {
    if (state.isLoading) return;
    state = const AsyncLoading<void>();
    final result = await _repository.signOut();
    state = switch (result) {
      Success<void>() => const AsyncData<void>(null),
      Failure<void>(:final failure) =>
        AsyncError<void>(failure, StackTrace.current),
    };
  }
}
```

The only Provider read is the declared `ref.watch` in `build()`. Never pass `ref` to the Repository.

- [ ] **Step 4: Verify the ViewModel boundary**

Run:

```bash
fvm flutter test test/features/auth/presentation/view_models/auth_view_model_test.dart
rg -n "ref\.(read|watch)" lib/features/auth/presentation/view_models
```

Expected: tests PASS; the search finds only `ref.watch(authRepositoryProvider)` in `build()`.

- [ ] **Step 5: Commit**

```bash
git add lib/features/auth/presentation/view_models test/features/auth/presentation/view_models
git commit -m "feat: add auth presentation view model"
```

---

## Task 6: Add session-aware routing

**Files:**

- Create: `lib/app/router/app_router.dart`
- Create: `lib/app/router/router_refresh_notifier.dart`
- Create: `test/app/router/app_router_test.dart`

- [ ] **Step 1: Write failing redirect tests**

Test the pure redirect policy for the three architecture-only locations:

| Router auth state | Allowed location | Redirect from other slice locations |
|---|---|---|
| `resolving` | `/startup` | `/startup` |
| `unauthenticated` | `/sign-in` | `/sign-in` |
| `authenticated` | `/home` | `/home` |

Also write a Provider/Router test that proves an observed session emission triggers reevaluation without recreating the Repository session subscription.

- [ ] **Step 2: Run the test to verify it fails**

Run: `fvm flutter test test/app/router/app_router_test.dart`

Expected: FAIL because Router files do not exist.

- [ ] **Step 3: Implement Router refresh and redirect**

`RouterRefreshNotifier` must extend `ChangeNotifier`, register one `ref.listen<RouterAuthState>` in its constructor, and call `notifyListeners()` when the folded state changes. `appRouterProvider` must:

- watch/create one refresh notifier;
- construct one `GoRouter` with `initialLocation: '/startup'`;
- read only `routerAuthStateProvider` inside `redirect`;
- register `/startup`, `/sign-in`, and `/home` routes;
- dispose both Router and notifier from Provider disposal.

Keep redirect policy in a pure function:

```dart
String? authRedirect({
  required RouterAuthState authState,
  required String location,
}) {
  final target = switch (authState) {
    RouterAuthState.resolving => '/startup',
    RouterAuthState.unauthenticated => '/sign-in',
    RouterAuthState.authenticated => '/home',
  };
  return location == target ? null : target;
}
```

Route builders may temporarily reference the architecture validation Views introduced in Task 7. Until then, use small private placeholder widgets inside `app_router.dart`; Task 7 must remove them rather than preserve a second UI implementation.

- [ ] **Step 4: Verify Router behavior**

Run: `fvm flutter test test/app/router/app_router_test.dart`

Expected: PASS; Router changes follow observed session state and `watchCallCount` remains one.

- [ ] **Step 5: Commit**

```bash
git add lib/app/router test/app/router
git commit -m "feat: add session-aware application router"
```

---

## Task 7: Replace the template counter with the validation shell

**Files:**

- Create: `lib/app/enmori_app.dart`
- Create: `lib/features/auth/presentation/views/startup_view.dart`
- Create: `lib/features/auth/presentation/views/sign_in_view.dart`
- Create: `lib/features/auth/presentation/views/home_view.dart`
- Modify: `lib/app/router/app_router.dart`
- Modify: `lib/main.dart`
- Replace: `test/widget_test.dart`

- [ ] **Step 1: Replace the counter test with a failing shell test**

The widget test must pump `ProviderScope(overrides: [authRepositoryProvider.overrideWithValue(fake)], child: const EnmoriApp())` and prove:

1. an initializing session shows `Key('architecture-startup-view')`;
2. an unauthenticated emission shows `Key('architecture-sign-in-view')`;
3. tapping `Key('architecture-sign-in-button')` eventually shows `Key('architecture-home-view')`;
4. tapping `Key('architecture-sign-out-button')` returns to sign-in;
5. `fake.watchCallCount == 1` after the full page loop.

- [ ] **Step 2: Run the test to verify it fails**

Run: `fvm flutter test test/widget_test.dart`

Expected: FAIL because the app shell and Views do not exist.

- [ ] **Step 3: Build the minimal validation Views**

- `StartupView`: display “Architecture validation: resolving session”.
- `SignInView`: display “Architecture validation: fake sign-in” and one button that calls `AuthViewModel.signIn` with fixed non-production test values.
- `HomeView`: display “Architecture validation: authenticated” and one sign-out button.
- Both command Views watch `authViewModelProvider` only to render/disable during loading and invoke commands through `ref.read(authViewModelProvider.notifier)` from event callbacks.
- Show only a generic architecture-test failure marker from `AsyncError`; do not invent final product error copy.

- [ ] **Step 4: Wire the app root**

`EnmoriApp` is a `ConsumerWidget` that watches `appRouterProvider` and returns `MaterialApp.router(routerConfig: router)`. `main()` calls `runApp(const ProviderScope(child: EnmoriApp()))`.

Remove all counter-template code and imports. Replace Router placeholders with the three Views.

- [ ] **Step 5: Verify the widget loop**

Run:

```bash
fvm flutter test test/widget_test.dart
fvm flutter analyze
```

Expected: widget test PASS and analyzer reports no issues.

- [ ] **Step 6: Commit**

```bash
git add lib/main.dart lib/app lib/features/auth/presentation/views test/widget_test.dart
git commit -m "feat: add architecture validation app shell"
```

---

## Task 8: Add the mandatory vertical integration test

**Files:**

- Create: `integration_test/auth_architecture_test.dart`

- [ ] **Step 1: Write the integration test**

Use `IntegrationTestWidgetsFlutterBinding.ensureInitialized()`. Pump the app with a `FakeAuthRepository(initialSession: AuthSessionInitializing())` override and verify this exact loop:

```text
ProviderScope/bootstrap
  → one AuthRepository override
  → one application-lifetime authSessionProvider subscription
  → resolving Router state/startup View
  → Fake emits unauthenticated
  → Router/sign-in View
  → View invokes AuthViewModel command
  → ViewModel uses Repository declared in build()
  → Fake returns Success and emits authenticated session
  → session Provider/Router/home View
  → sign-out command/emission
  → Router returns to sign-in
```

At the end assert `watchCallCount == 1` and `activeSubscriptionCount == 1` before the app is unmounted; then unmount and confirm the subscription is released.

- [ ] **Step 2: Run on a connected Android target**

Run:

```bash
fvm flutter devices
fvm flutter test integration_test/auth_architecture_test.dart -d <android-device-id>
```

Expected: PASS on an Android emulator or device. Replace the placeholder with an actual ID returned by `flutter devices`; do not commit a machine-specific ID.

- [ ] **Step 3: Run as a host test where supported**

Run: `fvm flutter test integration_test/auth_architecture_test.dart`

Expected: PASS if the configured host supports the test target. This does not replace Android/iOS evidence.

- [ ] **Step 4: Commit**

```bash
git add integration_test/auth_architecture_test.dart
git commit -m "test: cover auth architecture vertical loop"
```

---

## Task 9: Verify dependency rules and both platforms

**Files:**

- Create: `docs/testing/2026-09-01-architecture-slice-evidence.md`

- [ ] **Step 1: Run the complete static and automated suite**

```bash
fvm flutter pub get
fvm flutter analyze
fvm flutter test
rg -n "package:(flutter|flutter_riverpod|go_router)" lib/features/auth/domain lib/core/result
rg -n "ref\.(read|watch)" lib/features/auth/presentation/view_models
git diff --check
```

Expected: analyzer/tests PASS; Domain/core search has no matches; ViewModel search contains only the approved `ref.watch(authRepositoryProvider)` in `build()`; no whitespace errors.

- [ ] **Step 2: Record Android evidence**

```bash
fvm flutter build apk --debug
fvm flutter test integration_test/auth_architecture_test.dart -d <android-device-id>
```

Record date, host OS, `fvm flutter --version`, target/device class, commands, pass/fail, and generated APK path. This is a debug APK using the standard local debug signing configuration; release signing is outside this slice.

- [ ] **Step 3: Record iOS evidence on macOS**

On a macOS team host using the same FVM lock:

```bash
fvm flutter --version
fvm flutter build ios --debug --no-codesign
fvm flutter test integration_test/auth_architecture_test.dart -d <ios-simulator-or-device-id>
```

Record date, macOS/Xcode/CocoaPods versions, FVM Flutter version, simulator/device class, commands, and pass/fail. The evidence record may identify the current task performer, but `ARCHITECTURE.md` must not gain a permanent named owner.

- [ ] **Step 4: Write the evidence record honestly**

Create `docs/testing/2026-09-01-architecture-slice-evidence.md` with sections for dependency lock, analyzer/unit/widget/provider/router results, Android build/integration results, and iOS build/integration results. Use `PASS`, `FAIL`, or `PENDING`; never describe an unrun command as passing.

- [ ] **Step 5: Final scope audit**

```bash
git diff c26ca05..HEAD --name-only
git status --short
git log --oneline -10
```

Confirm no Firebase files, backend code, final UI assets, schema/API definitions, or unrelated dependencies were added.

- [ ] **Step 6: Commit verified evidence**

```bash
git add docs/testing/2026-09-01-architecture-slice-evidence.md pubspec.lock
git commit -m "docs: record architecture slice verification"
```

If iOS is still `PENDING`, commit the accurate partial record but do not mark the Architecture Slice Done. Update and recommit the record after macOS evidence is obtained.

---

## Completion gate

The slice is complete only when all of the following are evidenced:

- `pubspec.lock` is committed and resolves under FVM Flutter 3.47.2.
- Domain/core have no Flutter, Riverpod, Router, or vendor imports.
- Non-Riverpod Domain/Data dependencies are constructor-injected.
- The Riverpod ViewModel declares its Repository dependency only through `ref.watch` in `build()`.
- Repository results are mapped to Presentation `AsyncValue`; no View receives `AsyncValue<Result<T>>`.
- Router consumes only the folded auth state.
- Exactly one application-lifetime session observation survives page transitions and is released with the app container.
- The Fake-auth vertical integration test passes.
- Analyzer, unit, Provider, Router, Widget, and integration tests pass.
- Android debug build/integration evidence and iOS debug build/integration evidence are both recorded.
- No deferred architecture, backend, UI, or product decision has been introduced.
