import 'dart:convert';

import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/companion_navigation.dart';
import 'package:enmori/app/route_status_pages.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/proactive/presentation/proactive_follow_up_page.dart';
import 'package:enmori/features/proactive/presentation/proactive_settings_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'controlled_demo_app_test.dart' show AuthDouble;
import '../features/proactive/proactive_test_support.dart' show fixtureSource;

void main() {
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
}

Future<
  ({
    ProviderContainer container,
    AuthDouble auth,
    AuthSessionAuthenticated session,
    List<http.Request> requests,
  })
>
_pump(WidgetTester tester, {required bool enabled}) async {
  tester.view.physicalSize = const Size(430, 932);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final auth = AuthDouble(), requests = <http.Request>[];
  final client = MockClient((request) async {
    requests.add(request);
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
  await tester.pumpWidget(
    ControlledDemoApp(
      baseUri: Uri.parse('https://127.0.0.1:42001/'),
      auth: auth,
      client: client,
      onClose: () async => const Success(null),
      companionFirstFlowEnabled: enabled,
    ),
  );
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
    client.close();
  });
  return (
    container: container,
    auth: auth,
    session: session,
    requests: requests,
  );
}
