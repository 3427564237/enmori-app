import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/data/backend_interest_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'S2-01 Android page saves and later reads through the real Backend and Firebase Emulator',
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

      final firebaseApp = await Firebase.initializeApp(
        name: 's2-interest-real-backend-test',
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
      );
      addTearDown(client.close);
      final repository = BackendInterestRepository(client);
      final beforeResult = await repository.readOwn();
      final catalogueResult = await repository.readSelectableTags();
      expect(beforeResult, isA<Success<InterestSelection>>());
      expect(catalogueResult, isA<Success<List<InterestTagOption>>>());
      final before = (beforeResult as Success<InterestSelection>).value;
      final catalogue =
          (catalogueResult as Success<List<InterestTagOption>>).value;
      expect(
        catalogue.any((tag) => tag.interestTagId == fixtureInterestTagId),
        isTrue,
      );
      final wasSelected = before.interestTags.any(
        (tag) => tag.interestTagId == fixtureInterestTagId,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [interestRepositoryProvider.overrideWithValue(repository)],
          child: const MaterialApp(home: InterestEditorPage()),
        ),
      );
      await tester.pumpAndSettle();
      final option = find.byKey(Key('interest-option-$fixtureInterestTagId'));
      expect(option, findsOneWidget);
      await tester.tap(option);
      await tester.pump();
      await tester.tap(find.byKey(const Key('interest-save')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('interest-save-success')), findsOneWidget);

      final laterResult = await repository.readOwn();
      expect(laterResult, isA<Success<InterestSelection>>());
      final later = (laterResult as Success<InterestSelection>).value;
      expect(later.revision, before.revision + 1);
      expect(
        later.interestTags.any(
          (tag) => tag.interestTagId == fixtureInterestTagId,
        ),
        !wasSelected,
      );
    },
  );
}
