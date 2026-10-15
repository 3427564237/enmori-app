import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/platform/external_activity_opener.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/activity_routes.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:integration_test/integration_test.dart';

import '../test/support/fakes.dart';

// Assigned Android only. HTTP/auth data are synthetic; native channel/OS and
// lifecycle are real. Host observes the browser/chooser then foregrounds this
// dedicated test package. No provider key, model, account or product write.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Android activity handoff clears both routes and requires reload',
    (tester) async {
      debugPrint('ENMORI_ACTIVITY_STAGE started');
      const id = 'tm_U3ludGhldGljXzAx';
      const title = 'Synthetic native handoff activity';
      const source = 'https://ticketmaster.sg/';
      final calls = <http.Request>[];
      final auth = FakeAuthRepository();
      final lifecycle = _Lifecycle();
      WidgetsBinding.instance.addObserver(lifecycle);
      final opener = _NativeOpener();
      final client = BackendApiClient(
        Uri.parse('https://controlled.invalid'),
        () async => const Success('synthetic-not-a-credential'),
        httpClient: MockClient((request) async {
          calls.add(request);
          expect(request.method, 'GET');
          expect(request.url.query, isEmpty);
          expect(request.body, isEmpty);
          expect(
            request.headers['authorization'],
            'Bearer synthetic-not-a-credential',
          );
          final summary = <String, Object?>{
            'browseId': id,
            'title': title,
            'startAt': '2026-10-16T12:00:00Z',
          };
          final Object payload;
          if (request.url.path == '/v1/event-browse') {
            payload = {
              'asOf': '2026-10-15T00:00:00Z',
              'scope': 'ticketmaster_sg_first_batch_v1',
              'items': [summary],
            };
          } else {
            expect(request.url.path, '/v1/event-browse/$id');
            payload = {...summary, 'externalSourceUrl': source};
          }
          return http.Response(
            jsonEncode(payload),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      var gate = RouterGateState.resolving;
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountRepositoryProvider.overrideWithValue(
            FakeAccountRepository()
              ..statusResult = Success(OnboardingCompleted(testAccount())),
          ),
          routerGateProvider.overrideWith((ref) => gate),
          activityBrowseEnabledProvider.overrideWithValue(true),
          activityRepositoryProvider.overrideWithValue(
            BackendActivityRepository(client),
          ),
          externalActivityOpenerProvider.overrideWithValue(opener),
          eventRecommendationRepositoryProvider.overrideWithValue(
            FakeEventRecommendationRepository(),
          ),
        ],
      );
      addTearDown(() async {
        WidgetsBinding.instance.removeObserver(lifecycle);
        container.dispose();
        client.close();
        await auth.close();
      });
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const EnmoriApp(),
        ),
      );
      debugPrint('ENMORI_ACTIVITY_STAGE harness_mounted');
      auth.emit(AuthSessionAuthenticated(subject: 'synthetic-device-subject'));
      for (var i = 0; i < 50; i++) {
        if (container.read(authSessionProvider).value
            is AuthSessionAuthenticated)
          break;
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(
        container.read(authSessionProvider).value,
        isA<AuthSessionAuthenticated>(),
      );
      gate = RouterGateState.authenticated;
      container.invalidate(routerGateProvider);
      await tester.pumpAndSettle();

      debugPrint('ENMORI_ACTIVITY_STAGE home_ready');

      // Exercise native validation directly, bypassing the Dart URL gate. None
      // of these rejected values may background the app or invoke a browser.
      for (final value in [
        'http://ticketmaster.sg/',
        'https://ticketmaster.sg.evil.invalid/',
        'https://synthetic@ticketmaster.sg/',
        'https://ticketmaster.sg:444/',
        'https://ticketmaster.sg/#fragment',
        'https://ticketmaster.sg/?%74oken=synthetic',
        'https://ticketmaster.sg/?api-key=synthetic',
        'https://ticketmaster.sg/\n',
        'https://ticketmaster.sg/${'x' * 2048}',
      ]) {
        expect(
          await PlatformExternalActivityOpener.channel.invokeMethod<bool>(
            'open',
            {'url': value},
          ),
          isFalse,
        );
      }
      expect(lifecycle.backgroundCount, 0);
      debugPrint('ENMORI_ACTIVITY_STAGE native_rejections_pass');

      await _tap(tester, find.byKey(const Key('home-browse-activities')));
      expect(calls.map((r) => r.url.path), ['/v1/event-browse']);
      expect(find.textContaining('not the full catalogue'), findsOneWidget);
      await _tap(tester, find.text(title));
      expect(find.text('Activity details'), findsOneWidget);
      expect(find.text('End time unavailable.'), findsOneWidget);
      expect(find.text('Location unavailable.'), findsOneWidget);
      expect(find.text('Category unavailable.'), findsOneWidget);
      expect(opener.calls, 0);
      expect(calls.length, 2);
      debugPrint('ENMORI_ACTIVITY_STAGE detail_ready');

      await tester.ensureVisible(find.text('View on Ticketmaster'));
      await tester.pumpAndSettle();
      debugPrint('ENMORI_ACTIVITY_STAGE external_handoff_requested');
      await tester.tap(find.text('View on Ticketmaster'));
      await tester.runAsync(() async {
        expect(
          await opener.result.future.timeout(const Duration(seconds: 30)),
          isTrue,
        );
        await lifecycle.background.future.timeout(const Duration(seconds: 30));
        debugPrint('ENMORI_ACTIVITY_STAGE native_handoff_and_background_pass');
        await lifecycle.returned.future.timeout(const Duration(seconds: 90));
      });
      await tester.pumpAndSettle();
      expect(lifecycle.backgroundCount, greaterThan(0));
      expect(opener.calls, 1);
      expect(opener.received.toString(), source);
      expect(find.text(title), findsNothing);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(calls.length, 2);
      expect(find.text('Going'), findsNothing);
      expect(find.textContaining('registered'), findsNothing);
      await _tap(tester, find.text('Reload'));
      expect(calls.length, 3);
      expect(find.text(title), findsOneWidget);
      container.read(appRouterProvider).pop();
      await tester.pumpAndSettle();
      expect(find.text('Browse activities'), findsOneWidget);
      expect(find.text(title), findsNothing);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(calls.length, 3);
      await _tap(tester, find.text('Reload'));
      expect(calls.length, 4);
      expect(find.text(title), findsOneWidget);
      expect(calls.map((r) => r.url.path), [
        '/v1/event-browse',
        '/v1/event-browse/$id',
        '/v1/event-browse/$id',
        '/v1/event-browse',
      ]);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      debugPrint('ENMORI_ACTIVITY_STAGE return_reload_and_no_writes_pass');
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

final class _NativeOpener implements ExternalActivityOpener {
  final result = Completer<bool>();
  int calls = 0;
  Uri? received;
  @override
  Future<bool> open(Uri url, {required bool Function() current}) async {
    calls++;
    received = url;
    final value = await const PlatformExternalActivityOpener().open(
      url,
      current: current,
    );
    result.complete(value);
    return value;
  }
}

final class _Lifecycle with WidgetsBindingObserver {
  final background = Completer<void>();
  final returned = Completer<void>();
  int backgroundCount = 0;
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      backgroundCount++;
      if (!background.isCompleted) background.complete();
    } else if (background.isCompleted && !returned.isCompleted) {
      returned.complete();
    }
  }
}
