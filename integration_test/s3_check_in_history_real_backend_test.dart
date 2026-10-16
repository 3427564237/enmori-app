import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('isolated Android owner-date Footprint read and paging', (
    tester,
  ) async {
    const captureScreenshots = bool.fromEnvironment(
      'ENMORI_CAPTURE_DEVICE_SCREENSHOTS',
    );
    const apiBaseUrl = String.fromEnvironment('ENMORI_API_BASE_URL');
    const apiKey = String.fromEnvironment('ENMORI_FIREBASE_API_KEY');
    const projectId = String.fromEnvironment('ENMORI_FIREBASE_PROJECT_ID');
    const email = String.fromEnvironment('ENMORI_TEST_EMAIL');
    const password = String.fromEnvironment('ENMORI_TEST_PASSWORD');
    const expectedZone = String.fromEnvironment('ENMORI_EXPECTED_DEVICE_ZONE');
    const expectedDate = String.fromEnvironment('ENMORI_EXPECTED_DEVICE_DATE');
    const certificate = String.fromEnvironment(
      'ENMORI_TEST_TLS_CERTIFICATE_BASE64',
    );
    const authHost = String.fromEnvironment(
      'ENMORI_FIREBASE_AUTH_EMULATOR_HOST',
      defaultValue: '127.0.0.1',
    );
    const authPort = int.fromEnvironment(
      'ENMORI_FIREBASE_AUTH_EMULATOR_PORT',
      defaultValue: 9099,
    );

    for (final (name, value) in [
      ('ENMORI_API_BASE_URL', apiBaseUrl),
      ('ENMORI_FIREBASE_API_KEY', apiKey),
      ('ENMORI_FIREBASE_PROJECT_ID', projectId),
      ('ENMORI_TEST_EMAIL', email),
      ('ENMORI_TEST_PASSWORD', password),
      ('ENMORI_EXPECTED_DEVICE_ZONE', expectedZone),
      ('ENMORI_EXPECTED_DEVICE_DATE', expectedDate),
      ('ENMORI_TEST_TLS_CERTIFICATE_BASE64', certificate),
    ]) {
      if (value.isEmpty) throw StateError('$name is required');
    }
    final uri = Uri.parse(apiBaseUrl);
    if (projectId != 'demo-enmori-rmvp01a-r10' ||
        authHost != '127.0.0.1' ||
        authPort < 20000 ||
        authPort >= 60000 ||
        uri.scheme != 'https' ||
        uri.host != '127.0.0.1' ||
        uri.port < 20000 ||
        uri.port >= 60000) {
      throw StateError('Controlled Android/Firebase Emulator required.');
    }

    final signInResponse = await http.post(
      Uri(
        scheme: 'http',
        host: authHost,
        port: authPort,
        path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
        queryParameters: {'key': apiKey},
      ),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'returnSecureToken': true,
      }),
    );
    expect(signInResponse.statusCode, 200, reason: signInResponse.body);
    final authResponse =
        jsonDecode(signInResponse.body) as Map<String, dynamic>;
    final idToken = authResponse['idToken'] as String;
    final subject = authResponse['localId'] as String;

    final securityContext = SecurityContext(withTrustedRoots: false)
      ..setTrustedCertificatesBytes(base64Decode(certificate));
    final observed = _ObservedHistoryClient(
      IOClient(HttpClient(context: securityContext)),
    );
    final client = BackendApiClient(
      parseApprovedBackendBaseUri(apiBaseUrl),
      () async => Success(idToken),
      httpClient: observed,
    );
    addTearDown(client.close);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          _ControlledAuthRepository(subject),
        ),
        checkInRepositoryProvider.overrideWithValue(
          BackendCheckInRepository(client),
        ),
      ],
    );
    addTearDown(container.dispose);
    String? openedId;
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: Builder(
            builder: (context) => buildCheckInHistoryPage(
              context: context,
              onBack: () {},
              onOpenSavedCheckIn: (id) => openedId = id,
            ),
          ),
        ),
      ),
    );
    if (captureScreenshots) {
      debugPrint('S3_HISTORY_SCREENSHOT_CAPTURE_ENABLED');
      await binding.convertFlutterSurfaceToImage();
    }

    await _wait(tester, find.byKey(const Key('history-entry-history_00')));
    final state = container.read(checkInHistoryControllerProvider);
    expect(state.phase, CheckInHistoryPhase.ready);
    expect(state.ianaZone, expectedZone);
    expect(_dateText(state.selectedDate!), expectedDate);
    expect(find.text(expectedZone), findsOneWidget);
    expect(find.text('Synthetic footprint 00'), findsOneWidget);
    expect(
      observed.records.first,
      _HistoryRequest(
        date: expectedDate,
        zone: expectedZone,
        hasCursor: false,
        status: 200,
      ),
    );
    expect(state.entries, hasLength(20));
    expect(state.entries.last.checkIn.checkInId, 'history_19');
    final firstTile = tester.widget<ListTile>(
      find.byKey(const Key('history-entry-history_00')),
    );
    final displayedTime = (firstTile.subtitle! as Text).data!;
    expect(
      displayedTime,
      matches(RegExp(r'^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} · \d{2}:\d{2}')),
    );
    if (captureScreenshots) {
      await tester.pumpAndSettle();
      await binding.takeScreenshot('s3_history_first_page');
    }

    final readsBeforeNext = observed.records.length;
    await tester.ensureVisible(find.byKey(const Key('history-next-page')));
    await tester.tap(find.byKey(const Key('history-next-page')));
    await tester.pump();
    await _waitUntil(tester, () {
      return observed.records.length > readsBeforeNext &&
          container.read(checkInHistoryControllerProvider).phase ==
              CheckInHistoryPhase.ready;
    });
    final nextPage = container.read(checkInHistoryControllerProvider);
    expect(
      observed.records.last.hasCursor,
      isTrue,
      reason:
          'Next request must carry the opaque page cursor; sequence=${observed.records.map((record) => record.hasCursor).toList()}',
    );
    expect(
      nextPage.phase,
      CheckInHistoryPhase.ready,
      reason: 'Next request result: ${observed.records.last.status}',
    );
    expect(nextPage.entries, hasLength(2));
    expect(nextPage.entries.first.checkIn.checkInId, 'history_20');
    expect(nextPage.entries.last.checkIn.checkInId, 'history_21');
    expect(observed.records.last.hasCursor, isTrue);
    expect(observed.records.last.status, 200);
    expect(find.byKey(const Key('history-next-page')), findsNothing);
    if (captureScreenshots) {
      await tester.pumpAndSettle();
      await binding.takeScreenshot('s3_history_next_page');
    }

    await tester.tap(find.byKey(const Key('history-reload')));
    await tester.pump();
    await _wait(tester, find.byKey(const Key('history-entry-history_00')));
    final reloaded = container.read(checkInHistoryControllerProvider);
    expect(reloaded.entries, hasLength(20));
    expect(reloaded.entries.first.checkIn.checkInId, 'history_00');
    expect(observed.records.last.hasCursor, isFalse);

    final today = DateTime.parse('${expectedDate}T00:00:00Z');
    final previousDay = today.subtract(const Duration(days: 1));
    final readsBeforePreviousDay = observed.records.length;
    await tester.tap(find.byKey(const Key('history-select-date')));
    await tester.pumpAndSettle();
    final previousDayFinder = find.descendant(
      of: find.byType(CalendarDatePicker),
      matching: find.text('${previousDay.day}'),
    );
    expect(previousDayFinder, findsOneWidget);
    await tester.tap(previousDayFinder);
    await tester.tap(find.text('OK'));
    await tester.pump();
    await _waitUntil(
      tester,
      () {
        final current = container.read(checkInHistoryControllerProvider);
        return observed.records.length > readsBeforePreviousDay &&
            current.phase != CheckInHistoryPhase.loading;
      },
      diagnostic: () {
        final current = container.read(checkInHistoryControllerProvider);
        return 'phase=${current.phase} selected=${current.selectedDate} '
            'requests=${observed.records.map((record) => '${record.date}/${record.status}').toList()}';
      },
    );
    final previousDayState = container.read(checkInHistoryControllerProvider);
    expect(
      previousDayState.phase,
      CheckInHistoryPhase.ready,
      reason: 'Previous-day request result: ${observed.records.last.status}',
    );
    expect(_dateText(previousDayState.selectedDate!), _dateText(previousDay));
    expect(previousDayState.entries, isEmpty);
    expect(find.byKey(const Key('history-empty')), findsOneWidget);
    expect(observed.records.last.date, _dateText(previousDay));
    expect(observed.records.last.zone, expectedZone);
    expect(find.byKey(const Key('history-entry-history_00')), findsNothing);
    if (captureScreenshots) {
      await tester.pumpAndSettle();
      await binding.takeScreenshot('s3_history_previous_day_empty');
    }

    final readsBeforeToday = observed.records.length;
    await tester.tap(find.byKey(const Key('history-select-date')));
    await tester.pumpAndSettle();
    final todayFinder = find.descendant(
      of: find.byType(CalendarDatePicker),
      matching: find.text('${today.day}'),
    );
    expect(todayFinder, findsOneWidget);
    await tester.tap(todayFinder);
    await tester.tap(find.text('OK'));
    await tester.pump();
    await _waitUntil(tester, () {
      final current = container.read(checkInHistoryControllerProvider);
      return observed.records.length > readsBeforeToday &&
          current.phase == CheckInHistoryPhase.ready;
    });
    expect(observed.records.last.date, expectedDate);
    expect(observed.records.last.hasCursor, isFalse);
    expect(find.byKey(const Key('history-entry-history_20')), findsNothing);

    await tester.tap(find.byKey(const Key('history-entry-history_00')));
    expect(openedId, 'history_00');
    expect(observed.records.every((request) => request.status == 200), isTrue);
    expect(observed.records.map((request) => request.date), [
      expectedDate,
      expectedDate,
      expectedDate,
      _dateText(previousDay),
      expectedDate,
    ]);
    debugPrint(
      'S3_HISTORY_ANDROID_PASS zone=$expectedZone date=$expectedDate reads=${observed.records.length} pages=20+2',
    );
    expect(tester.takeException(), isNull);
  });
}

final class _ControlledAuthRepository implements AuthRepository {
  const _ControlledAuthRepository(this._subject);

  final String _subject;

  @override
  Stream<AuthSession> watchSession() =>
      Stream.value(AuthSessionAuthenticated(subject: _subject));

  @override
  Future<Result<String>> getIdToken() => Future.error(
    UnsupportedError('ID tokens are supplied by the test client.'),
  );

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) => Future.error(UnsupportedError('Registration is outside this test.'));

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) => Future.error(
    UnsupportedError('Sign-in is performed against Auth Emulator.'),
  );

  @override
  Future<Result<void>> signOut() =>
      Future.error(UnsupportedError('Sign-out is outside this test.'));
}

String _dateText(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

Future<void> _wait(WidgetTester tester, Finder finder) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (finder.evaluate().isEmpty) {
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure('Timed out waiting for $finder');
    }
    await tester.pump(const Duration(milliseconds: 100));
  }
  await tester.pump();
}

Future<void> _waitUntil(
  WidgetTester tester,
  bool Function() condition, {
  String Function()? diagnostic,
}) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure(
        'Timed out waiting for the history request to finish. '
        '${diagnostic?.call() ?? ''}',
      );
    }
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _HistoryRequest {
  const _HistoryRequest({
    required this.date,
    required this.zone,
    required this.hasCursor,
    required this.status,
  });

  final String date;
  final String zone;
  final bool hasCursor;
  final int? status;

  @override
  bool operator ==(Object other) =>
      other is _HistoryRequest &&
      date == other.date &&
      zone == other.zone &&
      hasCursor == other.hasCursor &&
      status == other.status;

  @override
  int get hashCode => Object.hash(date, zone, hasCursor, status);
}

final class _ObservedHistoryClient extends http.BaseClient {
  _ObservedHistoryClient(this._inner);

  final http.Client _inner;
  final records = <_HistoryRequest>[];

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final observation = _HistoryRequest(
      date: request.url.queryParameters['date'] ?? '',
      zone: request.url.queryParameters['timeZone'] ?? '',
      hasCursor: request.url.queryParameters.containsKey('cursor'),
      status: null,
    );
    try {
      final response = await _inner.send(request);
      records.add(
        _HistoryRequest(
          date: observation.date,
          zone: observation.zone,
          hasCursor: observation.hasCursor,
          status: response.statusCode,
        ),
      );
      return response;
    } on Object {
      records.add(observation);
      rethrow;
    }
  }

  @override
  void close() {
    _inner.close();
    super.close();
  }
}
