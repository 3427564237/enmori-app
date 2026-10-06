import 'dart:convert';
import 'dart:io';

import 'package:enmori/app/app.dart';
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
import 'package:enmori/features/interests/domain/interest_repository.dart';
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
    'S3 Profile/Settings persists, rereads, cancels, signs out and refreshes Home',
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
        name: 's3-own-profile-real-backend-test',
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
      final before =
          (await interests.readOwn() as Success<InterestSelection>).value;
      expect(before.interestTags.map((tag) => tag.interestTagId), [
        'interest_inactive',
      ]);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: scope, child: const EnmoriApp()),
      );
      await _wait(tester, find.byKey(const Key('event-recommendations-empty')));
      await _tap(tester, 'my-profile-button');
      await _wait(
        tester,
        find.text('No longer available — you can remove it.'),
      );
      const username = String.fromEnvironment('ENMORI_TEST_USERNAME');
      expect(username, isNotEmpty);
      expect(find.text(username), findsOneWidget);
      expect(find.text('Inactive fixture'), findsOneWidget);

      await _tap(tester, 'profile-edit-interests');
      await _wait(
        tester,
        find.byKey(Key('interest-option-$fixtureInterestTagId')),
      );
      await _tap(tester, 'interest-option-$fixtureInterestTagId');
      await _tap(tester, 'interest-save');
      await _wait(tester, find.byKey(const Key('interest-save-success')));
      final saved =
          (await interests.readOwn() as Success<InterestSelection>).value;
      expect(saved.revision, before.revision + 1);
      expect(saved.interestTags.map((tag) => tag.interestTagId), [
        fixtureInterestTagId,
        'interest_inactive',
      ]);
      await _tap(tester, 'interest-done');
      await _wait(tester, find.byKey(const Key('profile-edit-interests')));
      await _wait(tester, find.text('Music fixture'));
      expect(find.text('Inactive fixture'), findsOneWidget);
      expect(
        tester.getTopLeft(find.text('Music fixture')).dy,
        lessThan(tester.getTopLeft(find.text('Inactive fixture')).dy),
      );
      final readsBeforeReturn = observed.homeReads;
      await tester.pageBack();
      await _wait(tester, find.text('Synthetic Profile event'));
      expect(observed.homeReads, greaterThan(readsBeforeReturn));

      await _tap(tester, 'my-profile-button');
      await _wait(tester, find.text('Music fixture'));
      await _tap(tester, 'profile-edit-interests');
      await _wait(
        tester,
        find.byKey(Key('interest-option-$fixtureInterestTagId')),
      );
      final writesBeforeCancel = observed.interestWrites;
      await _tap(tester, 'interest-option-$fixtureInterestTagId');
      await tester.pageBack();
      await _wait(tester, find.text('Music fixture'));
      final cancelled =
          (await interests.readOwn() as Success<InterestSelection>).value;
      expect(cancelled.revision, saved.revision);
      expect(
        cancelled.interestTags.map((tag) => tag.interestTagId),
        saved.interestTags.map((tag) => tag.interestTagId),
      );
      expect(observed.interestWrites, writesBeforeCancel);
      final readsBeforeCancelReturn = observed.homeReads;
      await tester.binding.handlePopRoute();
      await _wait(tester, find.text('Synthetic Profile event'));
      expect(observed.homeReads, greaterThan(readsBeforeCancelReturn));

      await _tap(tester, 'my-profile-button');
      await _wait(tester, find.text('Music fixture'));
      await _tap(tester, 'profile-edit-interests');
      await _wait(tester, find.byKey(const Key('interest-clear')));
      await _tap(tester, 'interest-clear');
      await _tap(tester, 'interest-save');
      await _wait(tester, find.byKey(const Key('interest-save-success')));
      // Saving does not require Done to become canonical.
      await tester.binding.handlePopRoute();
      await _wait(tester, find.text('No interests selected.'));
      final empty =
          (await interests.readOwn() as Success<InterestSelection>).value;
      expect(empty.interestTags, isEmpty);
      expect(empty.revision, saved.revision + 1);
      final readsBeforeEmptyReturn = observed.homeReads;
      await tester.pageBack();
      await _wait(tester, find.byKey(const Key('event-recommendations-empty')));
      expect(observed.homeReads, greaterThan(readsBeforeEmptyReturn));
      expect(find.text('Synthetic Profile event'), findsNothing);

      // Destroying/reopening the route must reread persistence.
      await _tap(tester, 'my-profile-button');
      await _wait(tester, find.text('No interests selected.'));
      expect(find.text(username), findsOneWidget);
      await tester.pageBack();
      await _wait(tester, find.byKey(const Key('event-recommendations-empty')));
      await _tap(tester, 'event-recommendations-see-all-empty');
      await _wait(tester, find.byKey(const Key('route-event-recommendations')));
      await _wait(tester, find.byKey(const Key('event-recommendations-empty')));
      final readsBeforeAllReturn = observed.homeReads;
      await tester.pageBack();
      await _wait(tester, find.byKey(const Key('route-home')));
      await _wait(tester, find.byKey(const Key('event-recommendations-empty')));
      expect(observed.homeReads, greaterThan(readsBeforeAllReturn));
      final preferences = BackendAccountPreferencesRepository(client);
      final legacy =
          (await preferences.readProfile() as Success<OwnProfile>).value;
      expect(legacy.displayName, isNull);
      expect(legacy.visibility, ProfileVisibility.private);
      expect(legacy.revision, 0);
      await _tap(tester, 'my-profile-button');
      await _tap(tester, 'profile-edit');
      await _wait(tester, find.byKey(const Key('profile-display-name')));
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        '  LI fixture  ',
      );
      await _tap(tester, 'profile-visibility');
      await tester.tap(find.text('Friends only').last);
      await tester.pumpAndSettle();
      await _tap(tester, 'profile-save');
      await _wait(tester, find.byKey(const Key('preferences-save-success')));
      final profile =
          (await preferences.readProfile() as Success<OwnProfile>).value;
      expect(profile.displayName, 'LI fixture');
      expect(profile.visibility, ProfileVisibility.friendsOnly);
      expect(profile.revision, 1);
      await tester.pageBack();
      await _wait(tester, find.text('LI fixture'));
      await _tap(tester, 'profile-edit');
      await _wait(tester, find.byKey(const Key('profile-display-name')));
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'Unsaved fixture',
      );
      final profileWrites = observed.profileWrites;
      await tester.pageBack();
      await _wait(tester, find.text('LI fixture'));
      expect(observed.profileWrites, profileWrites);
      await _tap(tester, 'profile-settings');
      await _wait(tester, find.byKey(const Key('settings-visibility')));
      await _tap(tester, 'settings-visibility');
      await tester.tap(find.text('Friends only').last);
      await tester.pumpAndSettle();
      await _tap(tester, 'settings-consent');
      await _tap(tester, 'settings-save');
      await _wait(tester, find.byKey(const Key('preferences-save-success')));
      final firstSettings =
          (await preferences.readSettings() as Success<OwnSettings>).value;
      expect(firstSettings.checkInVisibility, CheckInVisibility.friendsOnly);
      expect(firstSettings.consent, OptionalProcessingConsent.accepted);
      await _tap(tester, 'settings-consent');
      await _tap(tester, 'settings-save');
      await _wait(tester, find.byKey(const Key('preferences-save-success')));
      for (final label in ['Public', 'Private', 'Friends only']) {
        await _tap(tester, 'settings-visibility');
        await tester.tap(find.text(label).last);
        await tester.pumpAndSettle();
        await _tap(tester, 'settings-save');
        await _wait(tester, find.byKey(const Key('preferences-save-success')));
      }
      final finalSettings =
          (await preferences.readSettings() as Success<OwnSettings>).value;
      expect(finalSettings.revision, 5);
      expect(finalSettings.checkInVisibility, CheckInVisibility.friendsOnly);
      expect(finalSettings.consent, OptionalProcessingConsent.rejected);
      expect(
        (await preferences.readProfile() as Success<OwnProfile>)
            .value
            .visibility,
        ProfileVisibility.friendsOnly,
      );
      await _tap(tester, 'settings-sign-out');
      await _wait(tester, find.byKey(const Key('route-sign-in')));
      expect(auth.currentUser, isNull);
      expect(find.byKey(const Key('route-settings')), findsNothing);
      await tester.enterText(
        find.byKey(const Key('sign-in-email')),
        fixtureEmail,
      );
      await tester.enterText(
        find.byKey(const Key('sign-in-password')),
        fixturePassword,
      );
      await _tap(tester, 'sign-in-submit');
      await _wait(tester, find.byKey(const Key('route-home')));
      await _tap(tester, 'my-profile-button');
      await _wait(tester, find.text('LI fixture'));
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
  await tester.ensureVisible(finder);
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
