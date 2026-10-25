import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/companion_navigation.dart';
import 'package:enmori/app/route_status_pages.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/language/data/platform_app_language_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_owned_sources.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/proactive/presentation/proactive_follow_up_page.dart';
import 'package:enmori/features/proactive/presentation/proactive_settings_page.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';
import 'package:enmori/features/proactive/proactive_notification_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'controlled_demo_app_test.dart' show AuthDouble;
import '../features/proactive/proactive_test_support.dart' show fixtureSource;
import '../features/proactive/proactive_messaging_test_support.dart'
    show MessagingPort, messagingInstallation;

void main() {
  testWidgets('notification cleanup cannot sign out a replacement session', (
    tester,
  ) async {
    final cleanup = Completer<http.Response>();
    final rig = await _pump(
      tester,
      enabled: true,
      settingsReady: true,
      registrationRead: cleanup,
    );
    rig.container.read(proactiveNotificationControllerProvider);
    rig.container.read(appRouterProvider).go(AppRoutes.settings);
    await tester.pumpAndSettle();
    expect(
      rig.container
          .read(accountPreferencesControllerProvider(PreferencesView.settings))
          .phase,
      PreferencesPhase.ready,
    );
    expect(
      rig.container.read(appRouterProvider).state.uri.path,
      AppRoutes.settings,
      reason: 'The cleanup fixture must enter the actual settings route.',
    );
    final signOut = tester
        .widget<AccountPreferencesPage>(find.byType(AccountPreferencesPage))
        .onSignOut!;
    final pending = signOut();
    await tester.pump();
    expect(
      rig.requests.where((r) => r.url.path == '/v1/me/proactive-registration'),
      hasLength(1),
    );
    final replacement = AuthSessionAuthenticated(subject: 'synthetic-owner');
    rig.auth.sessions.add(replacement);
    await tester.pumpAndSettle();
    cleanup.complete(http.Response('unconfirmed synthetic registration', 503));
    expect(await pending, isA<Failure<void>>());
    expect(
      rig.container.read(authSessionProvider).asData?.value,
      same(replacement),
    );
    expect(await signOut(), isA<Failure<void>>());
    expect(
      rig.requests.where((r) => r.url.path == '/v1/me/proactive-registration'),
      hasLength(1),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'bounded notification cleanup leaves sign-out available on timeout',
    (tester) async {
      final cleanup = Completer<http.Response>();
      final rig = await _pump(
        tester,
        enabled: true,
        settingsReady: true,
        registrationRead: cleanup,
      );
      rig.container.read(proactiveNotificationControllerProvider);
      rig.container.read(appRouterProvider).go(AppRoutes.settings);
      await tester.pumpAndSettle();
      expect(
        rig.container
            .read(
              accountPreferencesControllerProvider(PreferencesView.settings),
            )
            .phase,
        PreferencesPhase.ready,
      );
      final signOut = tester
          .widget<AccountPreferencesPage>(find.byType(AccountPreferencesPage))
          .onSignOut!;
      final pending = signOut();
      await tester.pump();
      expect(
        rig.requests.where(
          (r) => r.url.path == '/v1/me/proactive-registration',
        ),
        hasLength(1),
      );
      await tester.pump(const Duration(seconds: 15));
      expect(await pending, isA<Success<void>>());
      cleanup.complete(
        http.Response('unconfirmed synthetic registration', 503),
      );
      await tester.pumpAndSettle();
      expect(
        rig.container.read(authSessionProvider).asData?.value,
        isA<AuthSessionUnauthenticated>(),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'companion routes stay absent unless the candidate is explicitly selected',
    (tester) async {
      final rig = await _pump(tester, enabled: false);
      final paths = rig.container
          .read(appRouterProvider)
          .configuration
          .routes
          .whereType<GoRoute>()
          .map((r) => r.path);
      expect(paths, isNot(contains(AppRoutes.aiFollowUps)));
      expect(paths, isNot(contains(AppRoutes.newAiFollowUp)));
      expect(paths, isNot(contains(AppRoutes.aiMessage)));
      expect(
        rig.requests.where((r) => r.url.path.contains('proactive')),
        isEmpty,
      );
    },
  );

  testWidgets(
    'follow-up source extra belongs to the exact session and cannot survive same-UID replacement',
    (tester) async {
      final rig = await _pump(tester, enabled: true);
      final extra = FollowUpNavigation(
        session: rig.session,
        source: fixtureSource,
      );
      rig.container
          .read(appRouterProvider)
          .go(AppRoutes.newAiFollowUp, extra: extra);
      await tester.pumpAndSettle();
      expect(find.byType(ProactiveFollowUpPage), findsOneWidget);
      rig.auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'synthetic-owner'),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ProactiveFollowUpPage), findsNothing);
      rig.container
          .read(appRouterProvider)
          .go(AppRoutes.newAiFollowUp, extra: extra);
      await tester.pumpAndSettle();
      expect(find.byType(ConfigurationUnavailablePage), findsOneWidget);
      expect(find.byType(ProactiveFollowUpPage), findsNothing);
      expect(find.text(fixtureSource.text), findsNothing);
      expect(rig.requests.where((r) => r.method != 'GET'), isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'missing source stays unavailable and explicit settings navigation is read-only',
    (tester) async {
      final rig = await _pump(tester, enabled: true);
      rig.container.read(appRouterProvider).go(AppRoutes.newAiFollowUp);
      await tester.pumpAndSettle();
      expect(find.byType(ConfigurationUnavailablePage), findsOneWidget);
      rig.container.read(appRouterProvider).go(AppRoutes.aiFollowUps);
      await tester.pumpAndSettle();
      expect(find.byType(ProactiveSettingsPage), findsOneWidget);
      expect(rig.requests.where((r) => r.method != 'GET'), isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'message navigation requires its exact session and a fresh target read',
    (tester) async {
      final rig = await _pump(tester, enabled: true, settingsReady: true);
      const locator = AiMessageLocator(
        conversationId: '11111111-1111-4111-8111-111111111111',
        messageId: '22222222-2222-4222-8222-222222222222',
      );
      rig.container.read(appRouterProvider).go(AppRoutes.aiMessage);
      await tester.pumpAndSettle();
      expect(find.byType(ConfigurationUnavailablePage), findsOneWidget);
      final extra = AiMessageNavigation(session: rig.session, locator: locator);
      rig.container
          .read(appRouterProvider)
          .go(AppRoutes.aiMessage, extra: extra);
      await tester.pumpAndSettle();
      final page = tester.widget<AiConversationPage>(
        find.byType(AiConversationPage),
      );
      expect(page.initialMessage, same(locator));
      expect(
        rig.requests.where((r) => r.url.path.endsWith('/anchor')),
        hasLength(1),
      );
      expect(
        rig.requests.where((r) => r.url.path.endsWith('/messages')),
        isEmpty,
      );
      expect(rig.requests.where((r) => r.method != 'GET'), isEmpty);
      rig.auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'synthetic-owner'),
      );
      await tester.pumpAndSettle();
      rig.container
          .read(appRouterProvider)
          .go(AppRoutes.aiMessage, extra: extra);
      await tester.pumpAndSettle();
      expect(find.byType(ConfigurationUnavailablePage), findsOneWidget);
      expect(find.byType(AiConversationPage), findsNothing);
      expect(
        rig.requests.where((r) => r.url.path.endsWith('/anchor')),
        hasLength(1),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'resolved notification handler opens only its original session and still requires a fresh anchor',
    (tester) async {
      final rig = await _pump(tester, enabled: true, settingsReady: true);
      final handler = rig.container.read(
        proactiveMessageTargetHandlerProvider,
      )!;
      const target = ProactiveMessageTarget(
        conversationId: '11111111-1111-4111-8111-111111111111',
        messageId: '22222222-2222-4222-8222-222222222222',
      );
      handler(rig.session, target);
      await tester.pumpAndSettle();
      expect(
        rig.container.read(appRouterProvider).state.uri.path,
        AppRoutes.aiMessage,
      );
      expect(
        rig.requests.where((r) => r.url.path.endsWith('/anchor')),
        hasLength(1),
      );
      expect(rig.requests.where((r) => r.method != 'GET'), isEmpty);
      rig.auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'synthetic-owner'),
      );
      await tester.pumpAndSettle();
      final path = rig.container.read(appRouterProvider).state.uri.path;
      final count = rig.requests.length;
      handler(rig.session, target);
      await tester.pumpAndSettle();
      expect(rig.container.read(appRouterProvider).state.uri.path, path);
      expect(rig.requests, hasLength(count));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'authorized Check-in target uses the saved owner route and stale callbacks cannot navigate',
    (tester) async {
      final rig = await _pump(tester, enabled: true, settingsReady: true);
      rig.container.read(appRouterProvider).go(AppRoutes.aiAssistant);
      await tester.pumpAndSettle();
      final page = tester.widget<AiConversationPage>(
        find.byType(AiConversationPage),
      );
      final open = page.onOpenSourceTarget!;
      open(const AiCheckInTarget('legacy-record-id'));
      await tester.pumpAndSettle();
      expect(
        rig.container.read(appRouterProvider).state.uri.path,
        AppRoutes.savedCheckIn('legacy-record-id'),
      );
      rig.auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'synthetic-owner'),
      );
      await tester.pumpAndSettle();
      final path = rig.container.read(appRouterProvider).state.uri.path;
      final requests = rig.requests.length;
      open(const AiCheckInTarget('stale-record-id'));
      await tester.pumpAndSettle();
      expect(rig.container.read(appRouterProvider).state.uri.path, path);
      expect(rig.requests.length, requests);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<
  ({
    ProviderContainer container,
    AuthDouble auth,
    AuthSessionAuthenticated session,
    List<http.Request> requests,
  })
>
_pump(
  WidgetTester tester, {
  required bool enabled,
  bool settingsReady = false,
  Completer<http.Response>? registrationRead,
}) async {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(PlatformAppLanguageRepository.channel, (
    call,
  ) async {
    expect(call.method, 'readLanguage');
    return 'en';
  });
  addTearDown(
    () => messenger.setMockMethodCallHandler(
      PlatformAppLanguageRepository.channel,
      null,
    ),
  );
  tester.view.physicalSize = const Size(430, 932);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final auth = AuthDouble(), requests = <http.Request>[];
  final sdk = registrationRead == null ? null : MessagingPort();
  final client = MockClient((request) async {
    requests.add(request);
    if (registrationRead != null &&
        request.url.path == '/v1/me/proactive-registration')
      return registrationRead.future;
    if (request.url.path == '/v1/me/onboarding') {
      return http.Response(
        jsonEncode({
          'status': 'completed',
          'account': {
            'username': 'synthetic_owner',
            'optionalProcessingConsent': 'accepted',
            'checkInVisibility': 'private',
            'onboardingCompletedAt': '2026-10-19T00:00:00.000Z',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (settingsReady && request.url.path == '/v1/me/settings') {
      return http.Response(
        jsonEncode({
          'settings': {
            'checkInVisibility': 'private',
            'optionalProcessingConsent': 'accepted',
            'revision': 0,
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response(
      jsonEncode({
        'error': {
          'code': 'SERVICE_UNAVAILABLE',
          'message': 'Synthetic unavailable',
        },
        'requestId': 'synthetic',
      }),
      503,
      headers: {'content-type': 'application/json'},
    );
  });
  final app = ControlledDemoApp(
    baseUri: Uri.parse('https://127.0.0.1:42001/'),
    auth: auth,
    client: client,
    onClose: () async => const Success(null),
    companionFirstFlowEnabled: enabled,
    companionInstallationRef: registrationRead == null
        ? null
        : messagingInstallation,
    companionMessagingPort: sdk,
  );
  await tester.pumpWidget(app);
  await tester.pump();
  final session = AuthSessionAuthenticated(subject: 'synthetic-owner');
  auth.sessions.add(session);
  await tester.pumpAndSettle();
  final container = ProviderScope.containerOf(
    tester.element(find.byType(MaterialApp)),
    listen: false,
  );
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await auth.sessions.close();
    await sdk?.close();
    client.close();
  });
  return (
    container: container,
    auth: auth,
    session: session,
    requests: requests,
  );
}
