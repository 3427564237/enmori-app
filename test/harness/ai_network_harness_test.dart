import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../support/fake_account_preferences.dart';

import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

void main() {
  testWidgets(
    'one isolated OpenAI configuration binds request mode and the Settings processor',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true), client = _Client();
      final preferences = FakeAccountPreferences()
        ..settings = const OwnSettings(
          checkInVisibility: CheckInVisibility.private,
          consent: OptionalProcessingConsent.accepted,
          revision: 0,
          cloudAiConsent: CloudAiConsent.accepted,
        );
      final navigator = GlobalKey<NavigatorState>();
      addTearDown(auth.dispose);
      await tester.pumpWidget(
        AiNetworkHarnessApp(
          baseUri: Uri.parse('https://backend.invalid'),
          auth: auth,
          client: client,
          environmentLabel: 'Synthetic OpenAI configuration only',
          processing: AiClientProcessing.openaiCloud,
          navigatorKey: navigator,
          accountPreferencesRepository: preferences,
          onOpenSettings: () {},
        ),
      );
      await tester.pumpAndSettle();
      final scope = ProviderScope.containerOf(
        tester.element(find.byType(AiConversationPage)),
      );
      final repository =
          scope.read(aiConversationRepositoryProvider) as AiWireRepository;
      expect(
        scope.read(aiClientProcessingProvider),
        AiClientProcessing.openaiCloud,
      );
      expect(repository.processing, AiClientProcessing.openaiCloud);
      expect(client.requests, isEmpty);
      final preparing = repository.prepareSelected(
        token: 'synthetic-token-1',
        abort: AiAbortSignal(),
        sourceIds: [],
      );
      await tester.pumpAndSettle();
      expect(await preparing, isA<Success<AiSelectedReplyTicket>>());
      final request = client.requests.single as http.Request;
      expect(jsonDecode(request.body), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
        'contextSelection': {'processing': 'cloud', 'sources': []},
      });
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => const AccountPreferencesPage(
              view: PreferencesView.settings,
              aiOnly: true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('OpenAI cloud processing'), findsOneWidget);
      expect(find.text('Groq cloud processing'), findsNothing);
      await tester.ensureVisible(
        find.byKey(const Key('settings-cloud-consent')),
      );
      expect(
        tester
            .widget<SwitchListTile>(
              find.byKey(const Key('settings-cloud-consent')),
            )
            .value,
        isFalse,
      );
      expect(preferences.settings.cloudAiConsent, CloudAiConsent.accepted);
      expect(client.requests, hasLength(1));
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'changing isolated processor replaces the mapper without dispatching the retained draft',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true), client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      final oldScope = ProviderScope.containerOf(
        tester.element(find.byType(AiConversationPage)),
      );
      final oldRepository =
          oldScope.read(aiConversationRepositoryProvider) as AiWireRepository;
      expect(oldRepository.processing, AiClientProcessing.local);
      expect(
        oldScope.read(aiClientProcessingProvider),
        AiClientProcessing.local,
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Local draft',
      );
      await tester.pumpWidget(
        _app(auth, client, processing: AiClientProcessing.openaiCloud),
      );
      await tester.pumpAndSettle();
      final scope = ProviderScope.containerOf(
        tester.element(find.byType(AiConversationPage)),
      );
      final repository =
          scope.read(aiConversationRepositoryProvider) as AiWireRepository;
      expect(identical(oldRepository, repository), isFalse);
      expect(repository.processing, AiClientProcessing.openaiCloud);
      expect(
        scope.read(aiClientProcessingProvider),
        AiClientProcessing.openaiCloud,
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Local draft',
      );
      expect(client.requests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'network harness uses observed Auth, reviewed social page and caller-owned client',
    (tester) async {
      final auth = _ObservedAuth(authenticated: false);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('ai-network-harness-banner')),
        findsOneWidget,
      );
      expect(
        find.text(
          'Synthetic account and input only. Storage, Note, model and cleanup evidence belong to the selected Backend.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-message-input')), findsNothing);
      expect(client.requests, isEmpty);
      expect(auth.observers, 1);
      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-pinned-composer')), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .enabled,
        isTrue,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );

  testWidgets(
    'label-only rebuild preserves draft and existing observed session',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Unsent synthetic draft',
      );
      await tester.pumpWidget(
        _app(auth, client, label: 'Synthetic changed evidence label'),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Unsent synthetic draft',
      );
      expect(auth.observers, 1);
      expect(client.requests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'same UID replacement detaches original execution and late body',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Synthetic pending input',
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pump();
      await tester.pump();
      expect(
        client.requests.where(
          (request) => request.url.path.endsWith('/execute'),
        ),
        hasLength(1),
      );
      auth.replaceSession();
      await tester.pump();
      await tester.pump();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        isEmpty,
      );
      final cancel = client.requests.singleWhere(
        (request) => request.url.path.endsWith('/cancel'),
      );
      expect(cancel.headers['Authorization'], 'Bearer synthetic-token-1');
      client.execution.complete(
        _json({
          'operationId': _operation,
          'conversationId': _conversation,
          'userMessage': _message(_user, 'user', 1, 'Synthetic pending input'),
          'assistantMessage': _message(
            _assistant,
            'assistant',
            2,
            'Late synthetic reply',
          ),
        }),
      );
      await tester.pump();
      await tester.pump();
      expect(find.text('Late synthetic reply'), findsNothing);
      expect(
        client.requests.where(
          (request) => request.url.path.endsWith('/execute'),
        ),
        hasLength(1),
      );
      expect(auth.observers, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );
}

Widget _app(
  _ObservedAuth auth,
  _Client client, {
  String label = 'Synthetic HTTP peer; no storage/model evidence',
  AiClientProcessing processing = AiClientProcessing.local,
}) => AiNetworkHarnessApp(
  key: const Key('controlled-network-composition'),
  baseUri: Uri.parse('https://backend.invalid'),
  auth: auth,
  client: client,
  environmentLabel: label,
  processing: processing,
  onOpenSettings: () {},
);

const _conversation = '00000000-0000-4000-8000-000000000001';
const _operation = '00000000-0000-4000-8000-000000000002';
const _user = '00000000-0000-4000-8000-000000000003';
const _assistant = '00000000-0000-4000-8000-000000000004';

Map<String, Object> _message(
  String id,
  String role,
  int sequence,
  String text,
) => {
  'messageId': id,
  'role': role,
  'sequence': sequence,
  'persistedAt': '2026-10-14T10:00:00.123456Z',
  'availability': 'available',
  'text': text,
};

http.StreamedResponse _json(Object body, [int status = 200]) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(body))), status);

final class _Client extends http.BaseClient {
  final requests = <http.BaseRequest>[];
  final execution = Completer<http.StreamedResponse>();
  int closes = 0;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    requests.add(request);
    if (request.url.path.endsWith('/execute')) return execution.future;
    if (request.url.path.endsWith('/cancel')) {
      return _json({'operationId': _operation, 'state': 'terminal'});
    }
    final selected =
        request is http.Request &&
        request.body.isNotEmpty &&
        (jsonDecode(request.body) as Map<String, dynamic>).containsKey(
          'contextSelection',
        );
    final expires = DateTime.now()
        .toUtc()
        .add(const Duration(seconds: 15))
        .toIso8601String();
    return _json({
      if (selected)
        'contextSelection': {
          'selectionRevision': _assistant,
          'expiresAt': expires,
          'sourceCards': [],
          'historyPairs': [],
        },
      'operationId': _operation,
      'operationKey': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'conversationId': _conversation,
      'preparationExpiresAt': expires,
    }, 201);
  }

  @override
  void close() => closes++;
}

final class _ObservedAuth implements AuthRepository {
  _ObservedAuth({required bool authenticated})
    : _session = authenticated
          ? AuthSessionAuthenticated(subject: 'synthetic-owner')
          : const AuthSessionUnauthenticated();
  final _changes = StreamController<AuthSession>.broadcast(sync: true);
  AuthSession _session;
  int generation = 1, observers = 0;

  void replaceSession() {
    generation++;
    _session = AuthSessionAuthenticated(subject: 'synthetic-owner');
    _changes.add(_session);
  }

  @override
  Stream<AuthSession> watchSession() async* {
    observers++;
    yield _session;
    yield* _changes.stream;
  }

  @override
  Future<Result<String>> getIdToken() async =>
      Success('synthetic-token-$generation');

  @override
  Future<Result<void>> signOut() async {
    _session = const AuthSessionUnauthenticated();
    _changes.add(_session);
    return const Success(null);
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  Future<void> dispose() => _changes.close();
}

const _unsupported = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'Synthetic test Auth only.',
);
