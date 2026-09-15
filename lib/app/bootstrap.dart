import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/account/account_providers.dart';
import '../features/account/data/backend_account_repository.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/data/firebase_auth_repository.dart';
import '../features/auth/data/unavailable_auth_repository.dart';
import '../features/check_in/check_in_providers.dart';
import '../features/check_in/data/backend_check_in_repository.dart';
import '../features/event_recommendations/data/backend_event_recommendation_repository.dart';
import '../features/event_recommendations/event_recommendations_providers.dart';
import '../features/interests/data/backend_interest_repository.dart';
import '../features/interests/interests_providers.dart';
import 'app.dart';
import 'providers.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  final configuration = FirebaseRuntimeConfiguration.fromEnvironment();
  var firebaseReady = false;

  if (configuration.options case final options?) {
    try {
      await Firebase.initializeApp(options: options);
      if (configuration.useAuthEmulator) {
        await FirebaseAuth.instance.useAuthEmulator(
          configuration.authEmulatorHost,
          configuration.authEmulatorPort,
        );
      }
      firebaseReady = true;
    } on FirebaseException {
      firebaseReady = false;
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          firebaseReady
              ? FirebaseAuthRepository(FirebaseAuth.instance)
              : const UnavailableAuthRepository(),
        ),
        accountRepositoryProvider.overrideWith(
          (ref) =>
              BackendAccountRepository(ref.watch(backendApiClientProvider)),
        ),
        checkInRepositoryProvider.overrideWith(
          (ref) =>
              BackendCheckInRepository(ref.watch(backendApiClientProvider)),
        ),
<<<<<<< HEAD
        interestRepositoryProvider.overrideWith(
          (ref) =>
              BackendInterestRepository(ref.watch(backendApiClientProvider)),
        ),
        eventRecommendationRepositoryProvider.overrideWith(
          (ref) => BackendEventRecommendationRepository(
            ref.watch(backendApiClientProvider),
          ),
        ),
      ],
      child: const EnmoriApp(),
    ),
  );
}

final class FirebaseRuntimeConfiguration {
  const FirebaseRuntimeConfiguration({
    required this.options,
    required this.useAuthEmulator,
    required this.authEmulatorHost,
    required this.authEmulatorPort,
  });

  factory FirebaseRuntimeConfiguration.fromEnvironment() {
    const apiKey = String.fromEnvironment('ENMORI_FIREBASE_API_KEY');
    const appId = String.fromEnvironment('ENMORI_FIREBASE_APP_ID');
    const messagingSenderId = String.fromEnvironment(
      'ENMORI_FIREBASE_MESSAGING_SENDER_ID',
    );
    const projectId = String.fromEnvironment('ENMORI_FIREBASE_PROJECT_ID');
    const useAuthEmulator = bool.fromEnvironment(
      'ENMORI_USE_FIREBASE_AUTH_EMULATOR',
    );
    const emulatorHost = String.fromEnvironment(
      'ENMORI_FIREBASE_AUTH_EMULATOR_HOST',
      defaultValue: '10.0.2.2',
    );
    const emulatorPort = int.fromEnvironment(
      'ENMORI_FIREBASE_AUTH_EMULATOR_PORT',
      defaultValue: 9099,
    );

    final isComplete =
        apiKey.isNotEmpty &&
        appId.isNotEmpty &&
        messagingSenderId.isNotEmpty &&
        projectId.isNotEmpty;
    return FirebaseRuntimeConfiguration(
      options: isComplete
          ? const FirebaseOptions(
              apiKey: apiKey,
              appId: appId,
              messagingSenderId: messagingSenderId,
              projectId: projectId,
            )
          : null,
      useAuthEmulator: useAuthEmulator,
      authEmulatorHost: emulatorHost,
      authEmulatorPort: emulatorPort,
    );
  }

  final FirebaseOptions? options;
  final bool useAuthEmulator;
  final String authEmulatorHost;
  final int authEmulatorPort;
}
