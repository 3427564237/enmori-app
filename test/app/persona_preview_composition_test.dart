import 'dart:async';

import 'package:enmori/app/persona_preview_composition.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_preview_repository.dart';
import 'package:enmori/features/personas/persona_preview_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

const _accepted = OwnSettings(
  checkInVisibility: CheckInVisibility.private,
  consent: OptionalProcessingConsent.accepted,
  revision: 0,
);
const _draft = PersonaFields(
  displayName: 'Draft',
  tone: PersonaTone.warm,
  responseLength: PersonaResponseLength.detailed,
  formatStyle: PersonaFormatStyle.bulleted,
);

final class _Preview implements PersonaPreviewRepository {
  final reply = Completer<Result<String>>();
  bool Function()? eligible;
  @override
  Future<Result<String>> preview({
    required PersonaFields draft,
    required String text,
    required bool Function() isEligible,
  }) {
    eligible = isEligible;
    return reply.future;
  }
}

void main() {
  test('actual settings binding requires ready accepted consent through save and reload', () async {
    final auth = FakeAuthRepository(), preferences = FakeAccountPreferences();
    final firstRead = Completer<Result<OwnSettings>>();
    preferences.settingsReads.add(firstRead.future);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        accountPreferencesRepositoryProvider.overrideWithValue(preferences),
      ],
    );
    final subscription = container.listen(
      connectedPersonaPreviewAccessProvider,
      (_, _) {},
    );
    addTearDown(() async {
      subscription.close();
      container.dispose();
      await auth.close();
    });
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
    auth.emit(AuthSessionAuthenticated(subject: 'same-owner'));
    await container.pump();
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
    firstRead.complete(const Success(_accepted));
    await container.pump();
    expect(container.read(connectedPersonaPreviewAccessProvider), isTrue);
    final controller = container.read(
      accountPreferencesControllerProvider(PreferencesView.settings).notifier,
    );
    final saving = controller.saveSettings(
      CheckInVisibility.private,
      OptionalProcessingConsent.rejected,
    );
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
    await saving;
    await container.pump();
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
    preferences.settings = _accepted;
    await controller.load();
    await container.pump();
    expect(container.read(connectedPersonaPreviewAccessProvider), isTrue);
    preferences.saveFailure = const AppFailure(
      kind: AppFailureKind.settingsRevisionPreconditionFailed,
      message: 'Synthetic stale revision',
    );
    await controller.saveSettings(
      CheckInVisibility.private,
      OptionalProcessingConsent.accepted,
    );
    await container.pump();
    expect(
      container
          .read(accountPreferencesControllerProvider(PreferencesView.settings))
          .phase,
      PreferencesPhase.reloadRequired,
    );
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
  });

  test('same-UID replacement denies preview until fresh settings and drops the old reply', () async {
    final auth = FakeAuthRepository(),
        preferences = FakeAccountPreferences()..settings = _accepted;
    final preview = _Preview();
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        accountPreferencesRepositoryProvider.overrideWithValue(preferences),
        personaPreviewAccessProvider.overrideWith(
          (ref) => ref.watch(connectedPersonaPreviewAccessProvider),
        ),
        personaPreviewRepositoryProvider.overrideWithValue(preview),
      ],
    );
    final subscription = container.listen(
      personaPreviewControllerProvider,
      (_, _) {},
    );
    addTearDown(() async {
      subscription.close();
      container.dispose();
      await auth.close();
    });
    expect(
      container.read(personaPreviewControllerProvider).canPreview,
      isFalse,
    );
    auth.emit(AuthSessionAuthenticated(subject: 'same-owner'));
    await container.pump();
    container.read(personaPreviewControllerProvider);
    await container.pump();
    expect(container.read(personaPreviewControllerProvider).canPreview, isTrue);
    final controller = container.read(
      personaPreviewControllerProvider.notifier,
    );
    final pending = controller.preview(_draft, 'Synthetic draft question');
    expect(preview.eligible!(), isTrue);
    final freshSettings = Completer<Result<OwnSettings>>();
    preferences.settingsReads.add(freshSettings.future);
    auth.emit(AuthSessionAuthenticated(subject: 'same-owner'));
    await container.pump();
    expect(container.read(connectedPersonaPreviewAccessProvider), isFalse);
    expect(
      container.read(personaPreviewControllerProvider).canPreview,
      isFalse,
    );
    expect(preview.eligible!(), isFalse);
    preview.reply.complete(const Success('Old private reply'));
    await pending;
    expect(container.read(personaPreviewControllerProvider).reply, isNull);
    freshSettings.complete(const Success(_accepted));
    await container.pump();
    expect(container.read(personaPreviewControllerProvider).canPreview, isTrue);
    auth.emit(const AuthSessionUnauthenticated());
    await container.pump();
    expect(
      container.read(personaPreviewControllerProvider).canPreview,
      isFalse,
    );
    expect(container.read(personaPreviewControllerProvider).reply, isNull);
    expect(auth.watchCount, 1);
  });
}
