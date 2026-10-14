import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/isolated_history_home_app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'real History builder and Backend repositories run through Home',
    (tester) async {
      final f = await _pump(tester);
      expect(f.scope.read(backendBaseUriProvider), isNull);
      expect(find.byKey(const Key('home-ai-conversation')), findsNothing);
      await _open(tester);
      expect(find.byType(CheckInHistoryPage), findsOneWidget);
      expect(find.text('Asia/Singapore'), findsOneWidget);
      expect(find.text('First synthetic Note'), findsOneWidget);
      expect(f.historyQueries.single, {
        'date': '2026-10-13',
        'timeZone': 'Asia/Singapore',
      });
      await tester.tap(find.byTooltip('Back'));
      await _frames(tester);
      expect(f.router.state.uri.path, AppRoutes.home);
      await _open(tester);
      expect(f.historyQueries.length, 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Next replaces page, Reload restores first, chosen date is sent',
    (tester) async {
      final f = await _pump(tester);
      await _open(tester);
      await _tap(tester, 'history-next-page');
      expect(find.text('First synthetic Note'), findsNothing);
      expect(find.text('Next synthetic Note'), findsOneWidget);
      expect(f.historyQueries.last['cursor'], 'synthetic-cursor');
      await _tap(tester, 'history-reload');
      expect(find.text('First synthetic Note'), findsOneWidget);
      expect(f.historyQueries.last.containsKey('cursor'), isFalse);
      await _tap(tester, 'history-select-date');
      await tester.tap(find.text('12').last);
      await tester.tap(find.text('OK'));
      await _frames(tester);
      expect(f.historyQueries.last['date'], '2026-10-12');
      expect(f.historyQueries.last.containsKey('cursor'), isFalse);
      expect(find.byKey(const Key('history-empty')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'saved Check-in uses existing owner read and return rereads date',
    (tester) async {
      final f = await _pump(tester);
      await _open(tester);
      await _tap(tester, 'history-entry-chk_shared');
      expect(f.router.state.uri.path, AppRoutes.savedCheckIn('chk_shared'));
      expect(
        find.byKey(const Key('r6-saved-check-in-confirmed')),
        findsOneWidget,
      );
      expect(f.savedReads, 1);
      f.router.pop();
      await _frames(tester);
      expect(f.router.state.uri.path, AppRoutes.checkInHistory);
      expect(f.historyQueries.length, 2);
      expect(f.historyQueries.last['date'], '2026-10-13');
      expect(find.text('First synthetic Note'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final logout in [false, true]) {
    testWidgets('pending History is discarded on session change ($logout)', (
      tester,
    ) async {
      final f = await _pump(tester);
      f.pending = Completer<http.Response>();
      await _open(tester);
      expect(find.byKey(const Key('history-loading')), findsOneWidget);
      final old = f.router;
      f.auth.emit(
        logout
            ? const AuthSessionUnauthenticated()
            : AuthSessionAuthenticated(subject: 'shared-owner'),
      );
      await _frames(tester);
      expect(f.router, isNot(same(old)));
      expect(find.byType(CheckInHistoryPage), findsNothing);
      final afterSessionReads = f.historyQueries.length;
      f.pending!.complete(_page('Late private Note'));
      f.pending = null;
      await _frames(tester);
      expect(find.text('Late private Note', skipOffstage: false), findsNothing);
      expect(f.historyQueries.length, afterSessionReads);
      if (logout) {
        expect(f.router.state.uri.path, AppRoutes.register);
        f.auth.emit(AuthSessionAuthenticated(subject: 'shared-owner'));
        await _frames(tester);
      }
      await _open(tester);
      expect(find.text('First synthetic Note'), findsOneWidget);
      expect(f.historyQueries.length, afterSessionReads + 1);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('dependency error stays failure until explicit Retry', (
    tester,
  ) async {
    final f = await _pump(tester);
    f.failNext = true;
    await _open(tester);
    expect(find.byKey(const Key('history-error')), findsOneWidget);
    expect(find.byKey(const Key('history-empty')), findsNothing);
    expect(f.historyQueries.length, 1);
    await _tap(tester, 'history-retry');
    expect(find.text('First synthetic Note'), findsOneWidget);
    expect(f.historyQueries.length, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('unavailable device zone fails before any History HTTP request', (
    tester,
  ) async {
    final f = await _pump(tester, zoneUnavailable: true);
    await _open(tester);
    expect(find.byKey(const Key('history-error')), findsOneWidget);
    expect(f.historyQueries, isEmpty);
    expect(find.text('Asia/Singapore'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

Future<_Fixture> _pump(
  WidgetTester tester, {
  bool zoneUnavailable = false,
}) async {
  final f = _Fixture();
  addTearDown(() async {
    f.client.close();
    await f.auth.close();
  });
  await tester.pumpWidget(
    IsolatedHistoryHomeApp(
      auth: f.auth,
      client: f.client,
      device: _Device(zoneUnavailable),
    ),
  );
  f.scope = ProviderScope.containerOf(tester.element(find.byType(EnmoriApp)));
  await _frames(tester);
  f.auth.emit(AuthSessionAuthenticated(subject: 'shared-owner'));
  await _frames(tester);
  expect(
    f.router.state.uri.path,
    AppRoutes.home,
    reason:
        'Synthetic onboarding gate: '
        '${f.scope.read(onboardingStatusProvider('shared-owner'))}',
  );
  return f;
}

Future<void> _open(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.byKey(const Key('home-check-in-history')),
    200,
    scrollable: find
        .descendant(
          of: find.byKey(const Key('route-home')),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await _tap(tester, 'home-check-in-history');
}

Future<void> _tap(WidgetTester tester, String key) async {
  await tester.ensureVisible(find.byKey(Key(key)));
  await tester.tap(find.byKey(Key(key)));
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

http.Response _json(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);
Map<String, Object> _entry(String note) => {
  'checkInId': 'chk_shared',
  'note': note,
  'createdAt': '2026-10-13T01:00:00.000Z',
};
http.Response _page(String note, {String? cursor}) => _json({
  'checkIns': [_entry(note)],
  'nextCursor': cursor,
});

final class _Fixture {
  final auth = FakeAuthRepository();
  final historyQueries = <Map<String, String>>[];
  int savedReads = 0;
  bool failNext = false;
  Completer<http.Response>? pending;
  late final client = BackendApiClient(
    Uri.parse('https://127.0.0.1:24443'),
    auth.getIdToken,
    httpClient: MockClient((request) async {
      // HTTP callbacks can run while a live-device pump is in progress.
      expectSync(request.method, 'GET');
      expectSync(request.headers['Authorization'], 'Bearer test-token');
      switch (request.url.path) {
        case '/v1/me/onboarding':
          return _json({
            'status': 'completed',
            'account': {
              'username': 'shared-owner',
              'optionalProcessingConsent': 'rejected',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-12T01:00:00.000Z',
            },
          });
        case '/v1/me/check-ins':
          historyQueries.add(request.url.queryParameters);
          if (pending case final value?) return value.future;
          if (failNext) {
            failNext = false;
            return _json({
              'error': {
                'code': 'DEPENDENCY_UNAVAILABLE',
                'message': 'Unavailable',
                'requestId': 'synthetic-request',
              },
            }, 503);
          }
          if (request.url.queryParameters['date'] == '2026-10-12') {
            return _json({'checkIns': <Object>[], 'nextCursor': null});
          }
          if (request.url.queryParameters.containsKey('cursor')) {
            return _page('Next synthetic Note');
          }
          return _page('First synthetic Note', cursor: 'synthetic-cursor');
        case '/v1/check-ins/chk_shared':
          savedReads++;
          return _json({'checkIn': _entry('First synthetic Note')});
        default:
          throw StateError('Unexpected synthetic request ${request.url.path}');
      }
    }),
  );
  late ProviderContainer scope;
  GoRouter get router => scope.read(appRouterProvider);
}

final class _Device implements HistoryDevicePort {
  const _Device(this.unavailable);
  final bool unavailable;
  @override
  Future<String> captureIanaZone() async {
    if (unavailable) throw StateError('Synthetic unavailable device zone');
    return 'Asia/Singapore';
  }

  @override
  Future<DateTime> todayInZone(String ianaZone) async =>
      DateTime.utc(2026, 10, 13);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async => [for (final _ in instants) '09:00'];
}
