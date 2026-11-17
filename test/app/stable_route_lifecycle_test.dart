import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets(
    'long foreground and background waits retain an unsaved interest route',
    (tester) async {
      final fixture = await _Fixture.start(tester);
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.enterText(find.byKey(const Key('interest-search')), 'Art');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();

      await tester.pump(const Duration(minutes: 10));
      await tester.pumpAndSettle();
      fixture.expectDraft(tester);

      for (final lifecycle in [
        AppLifecycleState.inactive,
        AppLifecycleState.hidden,
        AppLifecycleState.paused,
      ]) {
        tester.binding.handleAppLifecycleStateChanged(lifecycle);
        await tester.pump();
      }
      await tester.pump(const Duration(minutes: 10));
      for (final lifecycle in [
        AppLifecycleState.hidden,
        AppLifecycleState.inactive,
        AppLifecycleState.resumed,
      ]) {
        tester.binding.handleAppLifecycleStateChanged(lifecycle);
        await tester.pump();
      }
      await tester.pumpAndSettle();
      fixture.expectDraft(tester);
      expect(fixture.onboardingReads, 1);
      expect(fixture.writes, 0);
      expect(fixture.auth.observations, 1);
      await fixture.finish(tester);
    },
  );

  testWidgets(
    'unchanged app composition rebuild retains unsaved interest route',
    (tester) async {
      final fixture = await _Fixture.start(tester);
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.enterText(find.byKey(const Key('interest-search')), 'Art');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.pumpWidget(fixture.app());
      await tester.pumpAndSettle();

      fixture.expectDraft(tester);
      expect(fixture.onboardingReads, 1);
      expect(fixture.writes, 0);
      expect(fixture.auth.observations, 1);
      await fixture.finish(tester);
    },
  );

  testWidgets(
    'rebuild during an interest save preserves one request and its receipt',
    (tester) async {
      final fixture = await _Fixture.start(tester);
      final response = fixture.pendingSave = Completer<http.Response>();
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      final save = find.byKey(const Key('interest-save'));
      await tester.tap(save);
      await tester.pump();
      expect(fixture.writes, 1);

      await tester.pumpWidget(fixture.app());
      await tester.pump();
      expect(fixture.router.state.uri.path, AppRoutes.interests);
      expect(tester.widget<FilledButton>(save).onPressed, isNull);
      expect(fixture.writes, 1);
      response.complete(
        http.Response(
          jsonEncode({
            'interests': {
              'interestTags': [
                {
                  'interestTagId': 'tag-art',
                  'displayName': 'Art',
                  'lifecycleState': 'active',
                },
              ],
              'revision': 1,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('interest-save-success')), findsOneWidget);
      expect(fixture.writes, 1);
      expect(fixture.onboardingReads, 1);
      expect(fixture.auth.observations, 1);
      expect(tester.takeException(), isNull);
      await fixture.finish(tester);
    },
  );
}

final class _Fixture {
  final auth = _Auth();
  late final http.Client client;
  late GoRouter router;
  var onboardingReads = 0;
  var writes = 0;
  Completer<http.Response>? pendingSave;

  _Fixture() {
    client = MockClient((request) async {
      if (request.method != 'GET') writes++;
      if (request.url.path == '/v1/me/interests' && request.method == 'PUT') {
        return pendingSave!.future;
      }
      final Object body;
      var status = 200;
      switch (request.url.path) {
        case '/v1/me/onboarding':
          onboardingReads++;
          body = {
            'status': 'completed',
            'account': {
              'username': 'synthetic_owner',
              'optionalProcessingConsent': 'rejected',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-11-17T00:00:00.000Z',
            },
          };
        case '/v1/interest-tags':
          body = {
            'interestTags': [
              {'interestTagId': 'tag-art', 'displayName': 'Art'},
              {'interestTagId': 'tag-music', 'displayName': 'Music'},
            ],
          };
        case '/v1/me/interests':
          body = {
            'interests': {'interestTags': [], 'revision': 0},
          };
        default:
          status = 503;
          body = {
            'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Synthetic'},
          };
      }
      return http.Response(
        jsonEncode(body),
        status,
        headers: {'content-type': 'application/json'},
      );
    });
  }

  Widget app() => ControlledDemoApp(
    baseUri: Uri.parse('https://enmori-backend-20261029.azurewebsites.net'),
    auth: auth,
    client: client,
    dualAccounts: true,
    remoteGroupEnabled: true,
    eventParticipationEnabled: true,
    onClose: auth.signOut,
  );

  static Future<_Fixture> start(WidgetTester tester) async {
    final fixture = _Fixture();
    addTearDown(fixture.auth.events.close);
    addTearDown(fixture.client.close);
    await tester.pumpWidget(fixture.app());
    await tester.pump();
    fixture.auth.events.add(
      const AuthSessionAuthenticated(subject: 'synthetic-owner'),
    );
    await tester.pumpAndSettle();
    fixture.router = GoRouter.of(
      tester.element(find.byKey(const Key('route-home'))),
    );
    fixture.router.push<void>(AppRoutes.interests);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('route-interests')), findsOneWidget);
    return fixture;
  }

  void expectDraft(WidgetTester tester) {
    final context = tester.element(find.byType(Navigator).first);
    expect(GoRouter.of(context), same(router));
    expect(router.state.uri.path, AppRoutes.interests);
    expect(find.byKey(const Key('route-interests')), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('interest-search')))
          .controller!
          .text,
      'Art',
    );
    expect(find.byKey(const Key('interest-selected-tag-art')), findsOneWidget);
    expect(tester.takeException(), isNull);
  }

  Future<void> finish(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  }
}

final class _Auth implements AuthRepository {
  final events = StreamController<AuthSession>.broadcast(sync: true);
  var observations = 0;

  @override
  Stream<AuthSession> watchSession() {
    observations++;
    return events.stream;
  }

  @override
  Future<Result<String>> getIdToken() async => const Success('synthetic-token');

  @override
  Future<Result<void>> signOut() async => const Success(null);

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);
}
