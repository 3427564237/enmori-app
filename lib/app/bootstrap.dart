import "../features/recommendation_profile/recommendation_profile_providers.dart";
import "../features/recommendation_profile/data/backend_recommendation_profile_repository.dart";
import "../features/recommendation_profile/data/device_region_repository.dart";
import '../features/event_detail/event_detail_providers.dart';
import '../features/event_detail/data/platform_event_actions.dart';
import '../core/presentation/identity_avatar.dart';
import '../features/account/presentation/authenticated_avatar.dart';
import '../features/account/own_avatar_providers.dart';
import '../features/account/data/backend_own_avatar_repository.dart';
import 'controlled_demo_app.dart';
import 'proactive_messaging_composition.dart';
import '../features/proactive/data/firebase_proactive_messaging.dart';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/network/backend_api_client.dart';
import 'platform/controlled_account_http_client.dart';

import '../features/account/account_providers.dart';
import '../features/account/account_preferences_providers.dart';
import '../features/account/data/backend_account_preferences_repository.dart';
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
import '../features/interests/admin_interest_providers.dart';
import '../features/interests/data/backend_admin_interest_repository.dart';
import '../features/event_browse/event_browse_providers.dart';
import 'platform/external_activity_opener.dart';
import 'app.dart';
import 'providers.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  final configuration = FirebaseRuntimeConfiguration.fromEnvironment();
  const controlledAccount = bool.fromEnvironment(
    'ENMORI_CONTROLLED_REAL_ACCOUNT',
  );
  const remoteAccount = bool.fromEnvironment('ENMORI_REMOTE_GROUP');
  const companionFirstFlow = bool.fromEnvironment(
    'ENMORI_AI_COMPANION_FIRST_FLOW',
  );
  const companionInstallation = String.fromEnvironment(
    'ENMORI_AI_COMPANION_INSTALLATION_REF',
  );
  const backendUrl = String.fromEnvironment('ENMORI_API_BASE_URL');
  const certificate = String.fromEnvironment('ENMORI_API_CERTIFICATE_BASE64');
  final baseUri = parseApprovedBackendBaseUri(backendUrl);
  final configurationValid =
      (companionInstallation.isEmpty ||
          companionFirstFlow &&
              remoteAccount &&
              validCompanionInstallationRef(companionInstallation)) &&
      validAccountRuntimeConfiguration(
        configuration,
        controlledAccount: controlledAccount,
        remoteAccount: remoteAccount,
        certificateBase64: certificate,
        baseUri: baseUri,
      );
  http.Client? controlledClient;
  var firebaseReady = false;

  if (configurationValid && configuration.options != null) {
    final options = configuration.options!;
    try {
      if (controlledAccount) {
        controlledClient = createControlledAccountHttpClient(
          baseUri!,
          certificate,
        );
      }
      await Firebase.initializeApp(options: options);
      if (configuration.useAuthEmulator) {
        await FirebaseAuth.instance.useAuthEmulator(
          configuration.authEmulatorHost,
          configuration.authEmulatorPort,
        );
      }
      firebaseReady = true;
    } catch (_) {
      // Invalid TLS/configuration must not fall back to another environment.
      controlledClient?.close();
      controlledClient = null;
      firebaseReady = false;
    }
  }

  if (remoteAccount && firebaseReady && baseUri != null) {
    final auth = FirebaseAuthRepository(FirebaseAuth.instance);
    runApp(
      ControlledDemoApp(
        baseUri: baseUri,
        auth: auth,
        client: http.Client(),
        onClose: auth.signOut,
        dualAccounts: true,
        eventParticipationEnabled: true,
        remoteGroupEnabled: true,
        companionFirstFlowEnabled: companionFirstFlow,
        companionInstallationRef: companionInstallation.isEmpty
            ? null
            : companionInstallation,
        companionMessagingPort: companionInstallation.isEmpty
            ? null
            : FirebaseProactiveMessagingPort(),
      ),
    );
    return;
  }

  runApp(
    ProviderScope(
      overrides: [
        eventActionsProvider.overrideWithValue(const PlatformEventActions()),
        if (controlledAccount || remoteAccount)
          backendBaseUriProvider.overrideWithValue(
            firebaseReady ? baseUri : null,
          ),
        if (controlledClient case final client?)
          backendApiClientProvider.overrideWith((ref) {
            final api = BackendApiClient(
              baseUri,
              ref.watch(authRepositoryProvider).getIdToken,
              httpClient: client,
            );
            ref.onDispose(api.close);
            return api;
          }),
        externalActivityOpenerProvider.overrideWithValue(
          const PlatformExternalActivityOpener(),
        ),
        identityAvatarBuilderProvider.overrideWithValue(
          (username, size) =>
              AuthenticatedAvatar(username: username, size: size),
        ),
        visibleAvatarRepositoryProvider.overrideWith(
          (ref) => BackendOwnAvatarRepository(
            ref.watch(backendApiClientProvider),
            shared: true,
          ),
        ),
        ownAvatarRepositoryProvider.overrideWith(
          (ref) => BackendOwnAvatarRepository(
            ref.watch(backendApiClientProvider),
            shared: true,
          ),
        ),
        regionRepositoryProvider.overrideWith(
          (ref) => DeviceRegionRepository(),
        ),
        recommendationProfileRepositoryProvider.overrideWith(
          (ref) => BackendRecommendationProfileRepository(
            ref.watch(backendApiClientProvider),
          ),
        ),
        accountPreferencesRepositoryProvider.overrideWith(
          (ref) => BackendAccountPreferencesRepository(
            ref.watch(backendApiClientProvider),
          ),
        ),
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
        interestRepositoryProvider.overrideWith(
          (ref) =>
              BackendInterestRepository(ref.watch(backendApiClientProvider)),
        ),
        adminInterestRepositoryProvider.overrideWith(
          (ref) => BackendAdminInterestRepository(
            ref.watch(backendApiClientProvider),
          ),
        ),
        eventRecommendationRepositoryProvider.overrideWith(
          (ref) => BackendEventRecommendationRepository(
            ref.watch(backendApiClientProvider),
            activityAreaCode: () => ref.read(activityAreaProvider).code,
          ),
        ),
      ],
      child: EnmoriApp(
        environmentLabel: controlledAccount
            ? 'Real account verification · Account, profile & settings'
            : null,
      ),
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

/// Validate before contacting Firebase; a real-account build cannot use emulators.
bool validAccountRuntimeConfiguration(
  FirebaseRuntimeConfiguration configuration, {
  required bool controlledAccount,
  bool remoteAccount = false,
  required String certificateBase64,
  required Uri? baseUri,
}) {
  if (remoteAccount) {
    return !controlledAccount &&
        configuration.options?.projectId == 'enmori-rmvp-controlled' &&
        !configuration.useAuthEmulator &&
        certificateBase64.isEmpty &&
        baseUri?.scheme == 'https' &&
        ((baseUri?.host == 'enmori-rmvp-demo.tail29ae43.ts.net' &&
                baseUri?.port == 8443) ||
            (baseUri?.host == 'enmori-backend-20261029.azurewebsites.net' &&
                baseUri?.port == 443)) &&
        baseUri!.userInfo.isEmpty &&
        !baseUri.hasQuery &&
        !baseUri.hasFragment &&
        (baseUri.path.isEmpty || baseUri.path == '/');
  }
  if (!controlledAccount) return certificateBase64.isEmpty;
  return configuration.options?.projectId == 'enmori-rmvp-controlled' &&
      !configuration.useAuthEmulator &&
      certificateBase64.isNotEmpty &&
      baseUri?.scheme == 'https' &&
      baseUri?.host == '127.0.0.1' &&
      baseUri?.port == 9381 &&
      baseUri!.userInfo.isEmpty &&
      !baseUri.hasQuery &&
      !baseUri.hasFragment &&
      (baseUri.path.isEmpty || baseUri.path == '/');
}
