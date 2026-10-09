import 'dart:convert';
import 'dart:io';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/isolated_persona_pages.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:enmori/features/personas/presentation/persona_editor_page.dart';
import 'package:enmori/features/personas/presentation/persona_management_page.dart';
import 'package:enmori/features/personas/presentation/persona_overview_page.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

// PC13 uses actual Firebase Auth, Backend handlers and Firestore persistence.
// Only the isolated composition and the generated local certificate are supplied
// by this harness. There are no simulated Persona results or direct client data
// writes. The host fixture independently checks stored state after this test.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'PC13 Android creates, rereads, edits, activates and deletes Active with two-owner isolation',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        const url = String.fromEnvironment('ENMORI_API_BASE_URL');
        const password = String.fromEnvironment('ENMORI_TEST_PASSWORD');
        const certificate = String.fromEnvironment(
          'ENMORI_TEST_TLS_CERTIFICATE_BASE64',
        );
        final uri = Uri.tryParse(url);
        if (uri == null ||
            uri.scheme != 'https' ||
            !const {'10.0.2.2', '127.0.0.1'}.contains(uri.host) ||
            uri.userInfo.isNotEmpty ||
            password.isEmpty ||
            certificate.isEmpty) {
          throw StateError('Isolated Android HTTPS fixture required.');
        }
        final firebase = await Firebase.initializeApp(
          name: 'persona-android',
          options: const FirebaseOptions(
            apiKey: 'controlled-emulator-key',
            appId: '1:1234567890:android:controlledtest',
            messagingSenderId: '1234567890',
            projectId: 'demo-enmori-rmvp01a-r10',
          ),
        );
        addTearDown(firebase.delete);
        final auth = FirebaseAuth.instanceFor(app: firebase);
        await auth.useAuthEmulator(uri.host, 9099, automaticHostMapping: false);
        final trust = SecurityContext(withTrustedRoots: false)
          ..setTrustedCertificatesBytes(base64Decode(certificate));
        final observed = _OperationCounts(IOClient(HttpClient(context: trust)));
        final client = BackendApiClient(uri, () async {
          final token = await auth.currentUser?.getIdToken(true);
          return token == null
              ? const Failure(
                  AppFailure(
                    kind: AppFailureKind.authRequired,
                    message: 'The isolated test identity is unavailable.',
                  ),
                )
              : Success(token);
        }, httpClient: observed);
        addTearDown(client.close);
        final scope = ProviderContainer(
          overrides: [
            isolatedSlicesEnabledProvider.overrideWithValue(true),
            authRepositoryProvider.overrideWithValue(
              FirebaseAuthRepository(auth),
            ),
            backendApiClientProvider.overrideWithValue(client),
            personaRepositoryProvider.overrideWithValue(
              BackendPersonaRepository(client),
            ),
            accountRepositoryProvider.overrideWithValue(
              BackendAccountRepository(client),
            ),
            isolatedPersonaPagesProvider.overrideWithValue(
              IsolatedPersonaPages(
                overview: (context, {required onManage, required onBack}) =>
                    PersonaOverviewPage(onManage: onManage, onBack: onBack),
                management:
                    (
                      context, {
                      required onCreate,
                      required onEdit,
                      required onBack,
                    }) => PersonaManagementPage(
                      onCreate: onCreate,
                      onEdit: onEdit,
                      onBack: onBack,
                    ),
                create: (context, {required onBack}) =>
                    PersonaEditorPage(onBack: onBack),
                edit: (context, {required personaId, required onBack}) =>
                    PersonaEditorPage(personaId: personaId, onBack: onBack),
              ),
            ),
          ],
        );
        addTearDown(scope.dispose);
        await tester.pumpWidget(
          UncontrolledProviderScope(container: scope, child: const EnmoriApp()),
        );

        Future<void> signIn({required bool owner}) async {
          await auth.signOut();
          await _until(
            tester,
            () => scope.read(currentAuthSubjectProvider) == null,
          );
          await auth.signInWithEmailAndPassword(
            email: owner
                ? 'persona-owner@example.invalid'
                : 'persona-peer@example.invalid',
            password: password,
          );
          await _until(
            tester,
            () =>
                scope.read(routerGateProvider) == RouterGateState.authenticated,
          );
          await _visible(tester, find.byKey(const Key('route-home')));
        }

        Future<void> openManagement() async {
          await _tap(tester, 'home-manage-personas');
          await _visible(tester, find.byKey(const Key('persona-manage')));
          await _checkAccessibility(tester, 'overview');
          await _tap(tester, 'persona-manage');
          await _visible(tester, find.byKey(const Key('persona-create')));
          await _checkAccessibility(tester, 'management');
        }

        await signIn(owner: true);
        debugPrint('PC13: owner authenticated');
        await openManagement();
        await _visible(tester, find.text('You have no Personas yet.'));
        await _tap(tester, 'persona-create');
        await _visible(tester, find.byKey(const Key('persona-name')));
        await _checkAccessibility(tester, 'create editor');
        final name = find.byKey(const Key('persona-name'));
        final textScaler = MediaQuery.textScalerOf(tester.element(name));
        final effectiveSize = textScaler.scale(16);
        debugPrint('PC13 accessibility: effective 16sp size = $effectiveSize');
        if (const bool.fromEnvironment('ENMORI_EXPECT_LARGE_TEXT')) {
          expect(effectiveSize, greaterThan(16));
        }
        // The generic labeled-target guideline excludes text fields, so verify
        // this required field and its validation message explicitly.
        expect(find.bySemanticsLabel(RegExp('Name')), findsWidgets);
        final mutationsBeforeValidation = observed.personaMutations;
        await _tap(tester, 'persona-save');
        await _settle(tester);
        expect(_ownsPrimaryFocus(tester, name), isTrue);
        expect(
          find.bySemanticsLabel(
            RegExp(
              'Enter a name of 1–50 characters without control characters.',
            ),
          ),
          findsWidgets,
        );
        expect(observed.personaMutations, mutationsBeforeValidation);
        expect(tester.takeException(), isNull);
        debugPrint('PC13 accessibility: invalid Name is labeled and focused');
        await tester.enterText(
          find.byKey(const Key('persona-name')),
          'Synthetic Persona',
        );
        await _tap(tester, 'persona-save');
        await _visible(tester, find.byKey(const Key('persona-saved')));
        await _checkAccessibility(tester, 'saved create editor');
        debugPrint('PC13: create confirmed');
        final created = await _readSet(client);
        final createdRows = created['items']! as List;
        expect(createdRows.length, 1);
        final id = (createdRows.single as Map)['personaId']! as String;
        expect(created['stateRevision'], 1);
        expect(created.containsKey('activePersonaId'), isFalse);
        expect((createdRows.single as Map)['revision'], 1);
        expect(
          (createdRows.single as Map)['displayName'] == 'Synthetic Persona',
          isTrue,
        );
        await _tap(tester, 'persona-back');

        // Destroy/reopen the route: the persisted full set is read independently.
        scope.read(appRouterProvider).go('/home');
        await _visible(tester, find.byKey(const Key('route-home')));
        final readsBefore = observed.setReads;
        await openManagement();
        await _visible(tester, find.byKey(Key('persona-edit-$id')));
        expect(observed.setReads > readsBefore, isTrue);
        await _tap(tester, 'persona-edit-$id');
        await _visible(tester, find.byKey(const Key('persona-name')));
        await _checkAccessibility(tester, 'edit editor');
        await tester.enterText(
          find.byKey(const Key('persona-name')),
          'Edited Synthetic Persona',
        );
        await _tap(tester, 'persona-save');
        await _visible(tester, find.byKey(const Key('persona-saved')));
        final edited = await _readSet(client);
        expect(edited['stateRevision'], 2);
        final editedRow = (edited['items']! as List).single as Map;
        expect(editedRow['revision'], 2);
        expect(editedRow['displayName'] == 'Edited Synthetic Persona', isTrue);
        debugPrint('PC13: persisted reread and edit confirmed');
        await _tap(tester, 'persona-back');

        final activationsBefore = observed.activations;
        await _tap(tester, 'persona-select-$id');
        expect(observed.activations, activationsBefore);
        await _cancelWithKeyboard(
          tester,
          observed,
          invokerKey: 'persona-activate',
          confirmationKey: 'persona-confirm-activate',
          stage: 'activation confirmation',
        );
        await _tap(tester, 'persona-activate');
        await _tap(tester, 'persona-confirm-activate');
        await _until(
          tester,
          () => observed.activations == activationsBefore + 1,
        );
        await _until(tester, () => find.text('Active').evaluate().isNotEmpty);
        final active = await _readSet(client);
        expect(active['stateRevision'], 3);
        expect(active['activePersonaId'] == id, isTrue);
        debugPrint('PC13: explicit activation confirmed');

        // Switch to a distinct real Auth identity, exercising session clearing.
        await signIn(owner: false);
        await openManagement();
        await _visible(tester, find.text('You have no Personas yet.'));
        final peer = await _readSet(client);
        expect(peer['items'], isEmpty);
        expect(peer['stateRevision'], 0);
        final foreign = await client.get('/v1/me/personas/$id');
        expect(foreign is Failure<JsonObject>, isTrue);
        expect(
          (foreign as Failure<JsonObject>).failure.kind,
          AppFailureKind.personaUnavailable,
        );
        final foreignActivation = await client.put(
          '/v1/me/persona-selection',
          body: {
            'personaId': id,
            'expectedRevision': 2,
            'expectedStateRevision': 0,
          },
        );
        expect(foreignActivation is Failure<JsonObject>, isTrue);
        expect(
          (foreignActivation as Failure<JsonObject>).failure.kind,
          AppFailureKind.personaUnavailable,
        );

        await signIn(owner: true);
        debugPrint('PC13: second-owner isolation confirmed');
        await openManagement();
        await _visible(tester, find.byKey(Key('persona-delete-$id')));
        final preserved = await _readSet(client);
        expect(preserved['stateRevision'], 3);
        expect(preserved['activePersonaId'] == id, isTrue);
        await _cancelWithKeyboard(
          tester,
          observed,
          invokerKey: 'persona-delete-$id',
          confirmationKey: 'persona-confirm-delete',
          stage: 'active deletion confirmation',
        );
        await _tap(tester, 'persona-delete-$id');
        await _visible(
          tester,
          find.textContaining(
            'You will have no active Persona until you activate another.',
          ),
        );
        await _tap(tester, 'persona-confirm-delete');
        await _visible(tester, find.text('You have no Personas yet.'));
        final deleted = await _readSet(client);
        expect(deleted['items'], isEmpty);
        expect(deleted['stateRevision'], 4);
        expect(deleted.containsKey('activePersonaId'), isFalse);
        expect(observed.deletes, 1);
        await _tap(tester, 'persona-back');
        await _visible(
          tester,
          find.text(
            'No Persona is active. Future AI requests use default presentation until you activate one.',
          ),
        );
        expect(tester.takeException(), isNull);
        await _checkAccessibility(tester, 'no-Active overview');
        debugPrint('PC13: active deletion and no-Active state confirmed');
        debugPrint(
          'PC13 accessibility: Android semantics and injected keyboard checks completed; audible TalkBack was not tested',
        );
      } finally {
        semantics.dispose();
      }
    },
  );
}

Future<JsonObject> _readSet(BackendApiClient client) async {
  final result = await client.get('/v1/me/personas');
  expect(result is Success<JsonObject>, isTrue);
  return Map<String, Object?>.from(
    (result as Success<JsonObject>).value['personas']! as Map,
  );
}

Future<void> _until(WidgetTester tester, bool Function() condition) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (true) {
    // Evaluate after the frame: the first overview frame schedules its load,
    // and a following pump may replace a briefly visible control with loading.
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure('The isolated Persona operation did not settle.');
    }
  }
}

Future<void> _visible(WidgetTester tester, Finder finder) =>
    _until(tester, () => finder.evaluate().isNotEmpty);

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await _settle(tester);
  await _visible(tester, finder);
  await tester.ensureVisible(finder);
  await _settle(tester);
  await tester.tap(finder);
  await tester.pump();
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pumpAndSettle(
    const Duration(milliseconds: 100),
    EnginePhase.sendSemanticsUpdate,
    const Duration(seconds: 30),
  );
}

Future<void> _checkAccessibility(WidgetTester tester, String stage) async {
  await _settle(tester);
  expect(
    tester.takeException(),
    isNull,
    reason: '$stage must have no overflow',
  );
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  debugPrint(
    'PC13 accessibility: $stage labels and Android tap targets passed',
  );
}

bool _ownsPrimaryFocus(WidgetTester tester, Finder owner) {
  final target = tester.element(owner);
  final context = FocusManager.instance.primaryFocus?.context;
  if (context == null) return false;
  if (identical(context, target)) return true;
  var found = false;
  context.visitAncestorElements((element) {
    if (identical(element, target)) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

Future<void> _pressTab(WidgetTester tester, {bool reverse = false}) async {
  if (reverse) await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
  try {
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  } finally {
    if (reverse) await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
  }
  await _settle(tester);
}

Future<void> _cancelWithKeyboard(
  WidgetTester tester,
  _OperationCounts observed, {
  required String invokerKey,
  required String confirmationKey,
  required String stage,
}) async {
  final invoker = find.byKey(Key(invokerKey));
  await _settle(tester);
  // Large text can put this ListView child beyond the lazy viewport cache.
  // A wait cannot construct it: scroll the actual management list first.
  if (invoker.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      invoker,
      200,
      scrollable: find.descendant(
        of: find.byKey(const Key('route-persona-management')),
        matching: find.byType(Scrollable),
      ),
      maxScrolls: 20,
    );
  }
  await _visible(tester, invoker);
  await tester.ensureVisible(invoker);
  await _settle(tester);
  // Reach the real button through keyboard traversal, preserving the route's
  // focus history so dialog dismissal must restore the invoking control.
  for (
    var attempt = 0;
    attempt < 16 && !_ownsPrimaryFocus(tester, invoker);
    attempt++
  ) {
    await _pressTab(tester);
  }
  expect(
    _ownsPrimaryFocus(tester, invoker),
    isTrue,
    reason: '$stage must be reachable by keyboard',
  );
  final mutationsBeforeCancel = observed.personaMutations;
  await tester.sendKeyEvent(LogicalKeyboardKey.enter);
  await _visible(tester, find.byType(AlertDialog));
  await _checkAccessibility(tester, stage);
  final cancel = find.widgetWithText(TextButton, 'Cancel');
  final confirmation = find.byKey(Key(confirmationKey));
  expect(_ownsPrimaryFocus(tester, cancel), isTrue);
  await _pressTab(tester);
  expect(_ownsPrimaryFocus(tester, confirmation), isTrue);
  await _pressTab(tester);
  expect(_ownsPrimaryFocus(tester, cancel), isTrue);
  await _pressTab(tester, reverse: true);
  expect(_ownsPrimaryFocus(tester, confirmation), isTrue);
  await _pressTab(tester, reverse: true);
  expect(_ownsPrimaryFocus(tester, cancel), isTrue);
  await tester.sendKeyEvent(LogicalKeyboardKey.enter);
  await _until(tester, () => find.byType(AlertDialog).evaluate().isEmpty);
  await _settle(tester);
  expect(_ownsPrimaryFocus(tester, invoker), isTrue);
  expect(observed.personaMutations, mutationsBeforeCancel);
  expect(tester.takeException(), isNull);
  debugPrint(
    'PC13 accessibility: $stage Cancel autofocus, Tab/Shift+Tab loop, Enter cancel and restored invoker focus passed without mutations',
  );
}

// Only fixed operation counts are retained, without identities or body content.
final class _OperationCounts extends http.BaseClient {
  _OperationCounts(this.delegate);
  final http.Client delegate;
  int setReads = 0;
  int activations = 0;
  int deletes = 0;
  int personaMutations = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    if (request.method != 'GET' &&
        (request.url.path == '/v1/me/personas' ||
            request.url.path.startsWith('/v1/me/personas/') ||
            request.url.path == '/v1/me/persona-selection')) {
      personaMutations++;
    }
    if (request.method == 'GET' && request.url.path == '/v1/me/personas') {
      setReads++;
    }
    if (request.method == 'PUT' &&
        request.url.path == '/v1/me/persona-selection') {
      activations++;
    }
    if (request.method == 'DELETE' &&
        request.url.path.startsWith('/v1/me/personas/')) {
      deletes++;
    }
    return delegate.send(request);
  }

  @override
  void close() => delegate.close();
}
