import 'dart:convert';
import 'dart:io';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:enmori/features/friends/presentation/friend_controller.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/data/backend_account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/data/backend_interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

// Synthetic isolated Emulator execution. All product repositories and the
// application router are real; no production configuration or TLS bypass.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'S3 snapshots, Friend decline/accept, and Event Detail use real persisted Backend',
    (tester) async {
      const apiBaseUrl = String.fromEnvironment('ENMORI_API_BASE_URL');
      const firebaseApiKey = String.fromEnvironment('ENMORI_FIREBASE_API_KEY');
      const firebaseAppId = String.fromEnvironment('ENMORI_FIREBASE_APP_ID');
      const firebaseMessagingSenderId = String.fromEnvironment(
        'ENMORI_FIREBASE_MESSAGING_SENDER_ID',
      );
      const firebaseProjectId = String.fromEnvironment(
        'ENMORI_FIREBASE_PROJECT_ID',
      );
      const authEmulatorHost = String.fromEnvironment(
        'ENMORI_FIREBASE_AUTH_EMULATOR_HOST',
        defaultValue: '10.0.2.2',
      );
      const authEmulatorPort = int.fromEnvironment(
        'ENMORI_FIREBASE_AUTH_EMULATOR_PORT',
        defaultValue: 9099,
      );
      const fixtureEmail = String.fromEnvironment('ENMORI_TEST_EMAIL');
      const fixturePassword = String.fromEnvironment('ENMORI_TEST_PASSWORD');
      const fixtureInterestTagId = String.fromEnvironment(
        'ENMORI_TEST_INTEREST_TAG_ID',
      );
      const testCertificate = String.fromEnvironment(
        'ENMORI_TEST_TLS_CERTIFICATE_BASE64',
      );

      for (final (name, value) in [
        ('ENMORI_API_BASE_URL', apiBaseUrl),
        ('ENMORI_FIREBASE_API_KEY', firebaseApiKey),
        ('ENMORI_FIREBASE_APP_ID', firebaseAppId),
        ('ENMORI_FIREBASE_MESSAGING_SENDER_ID', firebaseMessagingSenderId),
        ('ENMORI_FIREBASE_PROJECT_ID', firebaseProjectId),
        ('ENMORI_TEST_EMAIL', fixtureEmail),
        ('ENMORI_TEST_PASSWORD', fixturePassword),
        ('ENMORI_TEST_INTEREST_TAG_ID', fixtureInterestTagId),
      ]) {
        if (value.isEmpty) throw StateError('$name is required');
      }

      final testUri = Uri.tryParse(apiBaseUrl);
      if (firebaseProjectId != 'demo-enmori-rmvp01a-r10' ||
          authEmulatorHost != '10.0.2.2' ||
          authEmulatorPort != 9099 ||
          testUri?.scheme != 'https' ||
          testUri?.host != '10.0.2.2' ||
          testCertificate.isEmpty) {
        throw StateError(
          'Isolated Android/Firebase Emulator configuration required.',
        );
      }

      final firebaseApp = await Firebase.initializeApp(
        name: 's3-blocker-real-backend-test',
        options: const FirebaseOptions(
          apiKey: firebaseApiKey,
          appId: firebaseAppId,
          messagingSenderId: firebaseMessagingSenderId,
          projectId: firebaseProjectId,
        ),
      );
      addTearDown(firebaseApp.delete);
      final auth = FirebaseAuth.instanceFor(app: firebaseApp);
      await auth.useAuthEmulator(authEmulatorHost, authEmulatorPort);
      await auth.signInWithEmailAndPassword(
        email: fixtureEmail,
        password: fixturePassword,
      );

      IOClient? testHttpClient;
      if (testCertificate.isNotEmpty) {
        final uri = Uri.parse(apiBaseUrl);
        if (!firebaseProjectId.startsWith('demo-') ||
            uri.scheme != 'https' ||
            uri.host != '10.0.2.2') {
          throw StateError('Test TLS trust is limited to the Android Emulator');
        }
        final context = SecurityContext(withTrustedRoots: false)
          ..setTrustedCertificatesBytes(base64Decode(testCertificate));
        testHttpClient = IOClient(HttpClient(context: context));
      }

      final observed = _ObservedClient(testHttpClient ?? IOClient());
      final client = BackendApiClient(
        parseApprovedBackendBaseUri(apiBaseUrl),
        () async {
          final token = await auth.currentUser?.getIdToken(true);
          return token == null
              ? const Failure(
                  AppFailure(
                    kind: AppFailureKind.authRequired,
                    message: 'The controlled test identity is unavailable.',
                  ),
                )
              : Success(token);
        },
        httpClient: observed,
      );
      addTearDown(client.close);
      final interests = BackendInterestRepository(client);
      final scope = ProviderContainer(
        overrides: [
          isolatedSlicesEnabledProvider.overrideWithValue(true),
          checkInRepositoryProvider.overrideWithValue(
            BackendCheckInRepository(client),
          ),
          authRepositoryProvider.overrideWithValue(
            FirebaseAuthRepository(auth),
          ),
          backendApiClientProvider.overrideWithValue(client),
          accountRepositoryProvider.overrideWithValue(
            BackendAccountRepository(client),
          ),
          accountPreferencesRepositoryProvider.overrideWithValue(
            BackendAccountPreferencesRepository(client),
          ),
          interestRepositoryProvider.overrideWithValue(interests),
          eventRecommendationRepositoryProvider.overrideWithValue(
            BackendEventRecommendationRepository(client),
          ),
        ],
      );
      addTearDown(scope.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: scope, child: const EnmoriApp()),
      );
      await _wait(tester, find.byKey(const Key('route-home')));
      await _wait(tester, find.text('Synthetic Profile event'));
      final snapshots = <CheckIn>[];
      final preferences = BackendAccountPreferencesRepository(client);
      for (final (label, visibility) in [
        ('Private', CheckInVisibility.private),
        ('Public', CheckInVisibility.public),
        ('Friends only', CheckInVisibility.friendsOnly),
      ]) {
        await _tap(tester, 'my-profile-button');
        await _tap(tester, 'profile-settings');
        await _wait(tester, find.byKey(const Key('settings-visibility')));
        await _tap(tester, 'settings-visibility');
        await tester.tap(find.text(label).last);
        await tester.pumpAndSettle();
        await _tap(tester, 'settings-save');
        await _wait(tester, find.byKey(const Key('preferences-save-success')));
        expect(
          (await preferences.readSettings() as Success<OwnSettings>)
              .value
              .checkInVisibility,
          visibility,
        );
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
        await _wait(tester, find.byKey(const Key('route-home')));
        await _tap(tester, 'r6-new-check-in-button');
        await _wait(tester, find.byKey(const Key('r6-check-in-note')));
        await tester.enterText(
          find.byKey(const Key('r6-check-in-note')),
          'Synthetic $label snapshot',
        );
        await _tap(tester, 'r6-check-in-create');
        await _wait(tester, find.byKey(const Key('r6-check-in-committed')));
        final created = (scope.read(
          checkInControllerProvider,
        ) as CommandSucceeded<CheckIn>).value;
        snapshots.add(created);
        expect(created.checkInVisibility, visibility);
        expect(
          find.textContaining(
            'Visibility: ${visibility == CheckInVisibility.friendsOnly ? 'Friends-only' : label}',
          ),
          findsOneWidget,
        );
        await _tap(tester, 'r6-check-in-confirm');
        await _wait(tester, find.byKey(const Key('r6-check-in-confirmed')));
        await _tap(tester, 'r6-return-home-inline');
        await _wait(tester, find.byKey(const Key('route-home')));
      }
      debugPrint('S3_CHECKIN_ANDROID_THREE_SNAPSHOTS: Pass');
      for (final checkin in snapshots) {
        final read = await BackendCheckInRepository(client)
            .readOwned(checkInId: checkin.checkInId);
        expect(
          (read as Success<CheckIn>).value.checkInVisibility,
          checkin.checkInVisibility,
        );
      }
      scope
          .read(appRouterProvider)
          .push<void>(AppRoutes.savedCheckIn(snapshots.first.checkInId));
      await _wait(tester, find.byKey(const Key('r6-saved-check-in-confirmed')));
      await _wait(tester, find.textContaining('Visibility: Private'));
      expect(find.textContaining('Visibility: Private'), findsOneWidget);
      await _tap(tester, 'r6-return-home');
      await _wait(tester, find.byKey(const Key('route-home')));
      await _tap(tester, 'event-recommendation-s3_profile_event');
      await _wait(tester, find.byKey(const Key('event-detail-title')));
      expect(find.text('Location: Not provided'), findsOneWidget);
      await _tap(tester, 'event-detail-copy-link');
      await _wait(tester, find.text('Link copied.'));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await _tap(tester, 'event-recommendations-see-all');
      await _wait(tester, find.byKey(const Key('route-event-recommendations')));
      await _tap(tester, 'event-recommendation-s3_profile_event');
      await _wait(tester, find.byKey(const Key('event-detail-title')));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      debugPrint('S3_EVENT_HOME_ALL_DETAIL_COPY: Pass');
      const secondUsername = String.fromEnvironment(
            'ENMORI_TEST_SECOND_USERNAME',
          ),
          secondEmail = String.fromEnvironment('ENMORI_TEST_SECOND_EMAIL');
      Future<void> switchUser(String email) async {
        await _tap(tester, 'my-profile-button');
        await _tap(tester, 'profile-settings');
        await _tap(tester, 'settings-sign-out');
        await _wait(tester, find.byKey(const Key('route-sign-in')));
        await tester.enterText(find.byKey(const Key('sign-in-email')), email);
        await tester.enterText(
          find.byKey(const Key('sign-in-password')),
          fixturePassword,
        );
        await _tap(tester, 'sign-in-submit');
        await _wait(tester, find.byKey(const Key('route-home')));
      }

      Future<void> findAndSend() async {
        await _tap(tester, 'home-friends');
        await _wait(tester, find.text('No current friend requests.'));
        await tester.enterText(
          find.byKey(const Key('friend-username')),
          secondUsername,
        );
        await _tap(tester, 'friend-lookup');
        final lookupDeadline = DateTime.now().add(const Duration(seconds: 30));
        while (scope.read(friendControllerProvider).busy ||
            (scope.read(friendControllerProvider).target == null &&
                scope.read(friendControllerProvider).failure == null)) {
          if (DateTime.now().isAfter(lookupDeadline)) {
            throw TestFailure('Friend lookup did not finish');
          }
          await tester.pump(const Duration(milliseconds: 100));
        }
        final lookedUp = scope.read(friendControllerProvider);
        expect(lookedUp.failure, isNull);
        expect(lookedUp.target?.relationship, RelationshipState.canSendRequest);
        await tester.scrollUntilVisible(
          find.byKey(const Key('friend-send')),
          100,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-friends')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await _tap(tester, 'friend-send');
        await _wait(tester, find.text('Request sent'));
        await tester.pageBack();
        await tester.pumpAndSettle();
      }

      await findAndSend();
      await switchUser(secondEmail);
      await _tap(tester, 'home-friends');
      await _wait(tester, find.text('Member A'));
      final firstRequest = scope.read(friendControllerProvider).requests.single;
      await _tap(tester, 'friend-decline-${firstRequest.requestRef}');
      await _wait(tester, find.text('Friend request declined.'));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await switchUser(fixtureEmail);
      await findAndSend();
      await switchUser(secondEmail);
      await _tap(tester, 'home-friends');
      await _wait(tester, find.text('Member A'));
      final freshRequest = scope.read(friendControllerProvider).requests.single;
      expect(freshRequest.requestRef, isNot(firstRequest.requestRef));
      await _tap(tester, 'friend-accept-${freshRequest.requestRef}');
      await _wait(tester, find.text('Friend request accepted.'));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await switchUser(fixtureEmail);
      await _tap(tester, 'home-friends');
      await _wait(tester, find.text('No current friend requests.'));
      await tester.enterText(
        find.byKey(const Key('friend-username')),
        secondUsername,
      );
      await _tap(tester, 'friend-lookup');
      await _wait(tester, find.text('Already friends'));
      debugPrint('S3_FRIEND_TWO_ACCOUNT_DECLINE_ACCEPT_REREAD: Pass');
      expect(tester.takeException(), isNull);
    },
  );
}

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

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await _wait(tester, finder);
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final keyboardDeadline = DateTime.now().add(const Duration(seconds: 5));
  while (tester.view.viewInsets.bottom > 0 &&
      DateTime.now().isBefore(keyboardDeadline)) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  await Scrollable.ensureVisible(tester.element(finder), alignment: 0.5);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pump();
}

// Counts only fixed operation names; no token, identity or body is retained.
final class _ObservedClient extends http.BaseClient {
  _ObservedClient(this._inner);
  final http.Client _inner;
  int homeReads = 0;
  int interestWrites = 0;
  int profileWrites = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.method == 'PUT' && request.url.path == '/v1/me/profile') {
      profileWrites++;
    }
    if (request.method == 'GET' &&
        request.url.path == '/v1/recommendations/events' &&
        request.url.queryParameters['view'] == 'home') {
      homeReads++;
    }
    if (request.method == 'PUT' && request.url.path == '/v1/me/interests') {
      interestWrites++;
    }
    return _inner.send(request);
  }

  @override
  void close() {
    _inner.close();
    super.close();
  }
}
