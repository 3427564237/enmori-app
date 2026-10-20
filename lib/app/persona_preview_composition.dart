import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/account/domain/account_repository.dart';
import '../features/account/presentation/account_preferences_controller.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';

/// App-owned settings/session binding for the optional connected preview.
/// This controls presentation eligibility; the Backend rechecks permission.
final connectedPersonaPreviewAccessProvider = Provider<bool>((ref) {
  final session = ref.watch(authSessionProvider);
  if (session is! AsyncData<AuthSession> ||
      session.value is! AuthSessionAuthenticated) {
    return false;
  }
  final settings = ref.watch(
    accountPreferencesControllerProvider(PreferencesView.settings),
  );
  return settings.phase == PreferencesPhase.ready &&
      settings.settings?.consent == OptionalProcessingConsent.accepted;
});
