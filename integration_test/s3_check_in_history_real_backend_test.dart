import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_page.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('isolated Android owner-date Footprint read and paging', (
    tester,
  ) async {
    const apiBaseUrl = String.fromEnvironment('ENMORI_API_BASE_URL');
    const apiKey = String.fromEnvironment('ENMORI_FIREBASE_API_KEY');
    const appId = String.fromEnvironment('ENMORI_FIREBASE_APP_ID');
    const senderId = String.fromEnvironment(
      'ENMORI_FIREBASE_MESSAGING_SENDER_ID',
    );
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
      defaultValue: '10.0.2.2',
    );
    const authPort = int.fromEnvironment(
      'ENMORI_FIREBASE_AUTH_EMULATOR_PORT',
      defaultValue: 9099,
    );

    for (final (name, value) in [
      ('ENMORI_API_BASE_URL', apiBaseUrl),
      ('ENMORI_FIREBASE_API_KEY', apiKey),
      ('ENMORI_FIREBASE_APP_ID', appId),
      ('ENMORI_FIREBASE_MESSAGING_SENDER_ID', senderId),
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
        authHost != '10.0.2.2' ||
        authPort != 9099 ||
        uri.scheme != 'https' ||
        uri.host != '10.0.2.2') {
      throw StateError('Controlled Android/Firebase Emulator required.');
    }

    final firebaseApp = await Firebase.initializeApp(
      name: 's3-check-in-history-test',
      options: const FirebaseOptions(
        apiKey: apiKey,
        appId: appId,
        messagingSenderId: senderId,
        projectId: projectId,
      ),
    );
    addTearDown(firebaseApp.delete);
    final auth = FirebaseAuth.instanceFor(app: firebaseApp);
    await auth.useAuthEmulator(authHost, authPort);
    await auth.signInWithEmailAndPassword(email: email, password: password);

    final securityContext = SecurityContext(withTrustedRoots: false)
      ..setTrustedCertificatesBytes(base64Decode(certificate));
    final observed = _ObservedHistoryClient(
      IOClient(HttpClient(context: securityContext)),
    );
    final client = BackendApiClient(
      parseApprovedBackendBaseUri(apiBaseUrl),
      () async {
        final token = await auth.currentUser?.getIdToken(true);
        return token == null
            ? const Failure(
                AppFailure(
                  kind: AppFailureKind.authRequired,
                  message: 'The controlled owner session is unavailable.',
                ),
              )
            : Success(token);
      },
      httpClient: observed,
    );
    addTearDown(client.close);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(FirebaseAuthRepository(auth)),
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

    final readsBeforeNext = observed.records.length;
    await tester.ensureVisible(find.byKey(const Key('history-next-page')));
    await tester.tap(find.byKey(const Key('history-next-page')));
    await tester.pump();
    await _waitUntil(tester, () => observed.records.length > readsBeforeNext);
    final nextPage = container.read(checkInHistoryControllerProvider);
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

    await tester.tap(find.byKey(const Key('history-reload')));
    await tester.pump();
    await _wait(tester, find.byKey(const Key('history-entry-history_00')));
    final reloaded = container.read(checkInHistoryControllerProvider);
    expect(reloaded.entries, hasLength(20));
    expect(reloaded.entries.first.checkIn.checkInId, 'history_00');
    expect(observed.records.last.hasCursor, isFalse);

    final today = DateTime.parse('${expectedDate}T00:00:00Z');
    final previousDay = today.subtract(const Duration(days: 1));
    await tester.tap(find.byKey(const Key('history-select-date')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('${previousDay.day}').last);
    await tester.pump();
    await _wait(tester, find.byKey(const Key('history-empty')));
    expect(
      observed.records.last.date,
      _dateText(previousDay),
    );
    expect(observed.records.last.zone, expectedZone);
    expect(find.byKey(const Key('history-entry-history_00')), findsNothing);

    await tester.tap(find.byKey(const Key('history-select-date')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('${today.day}').last);
    await tester.pump();
    await _wait(tester, find.byKey(const Key('history-entry-history_00')));
    expect(observed.records.last.date, expectedDate);
    expect(observed.records.last.hasCursor, isFalse);
    expect(find.byKey(const Key('history-entry-history_20')), findsNothing);

    await tester.tap(find.byKey(const Key('history-entry-history_00')));
    expect(openedId, 'history_00');
    expect(
      observed.records.every((request) => request.status == 200),
      isTrue,
    );
    expect(
      observed.records.map((request) => request.date),
      [expectedDate, expectedDate, expectedDate, _dateText(previousDay), expectedDate],
    );
    debugPrint(
      'S3_HISTORY_ANDROID_PASS zone=$expectedZone date=$expectedDate reads=${observed.records.length} pages=20+2',
    );
    expect(tester.takeException(), isNull);
  });
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

Future<void> _waitUntil(WidgetTester tester, bool Function() condition) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure('Timed out waiting for the history request to finish.');
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
