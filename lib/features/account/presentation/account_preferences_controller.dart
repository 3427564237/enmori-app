import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../account_preferences_providers.dart';
import '../domain/account_preferences_repository.dart';
import '../domain/account_repository.dart';

enum PreferencesView { profile, settings }

enum PreferencesPhase { loading, ready, saving, reloadRequired, failed }

final class PreferencesState {
  const PreferencesState({
    this.phase = PreferencesPhase.loading,
    this.profile,
    this.settings,
    this.message,
    this.saved = false,
  });
  final PreferencesPhase phase;
  final OwnProfile? profile;
  final OwnSettings? settings;
  final String? message;
  final bool saved;
}

final accountPreferencesControllerProvider = NotifierProvider.autoDispose
    .family<AccountPreferencesController, PreferencesState, PreferencesView>(
      AccountPreferencesController.new,
    );

final class AccountPreferencesController extends Notifier<PreferencesState> {
  AccountPreferencesController(this.view);
  final PreferencesView view;
  late AccountPreferencesRepository _repository;
  int _operation = 0;

  @override
  PreferencesState build() {
    _repository = ref.watch(accountPreferencesRepositoryProvider);
    // A replacement observation is a new session even for the same subject.
    // Rebuild the request fence so old reads/saves cannot settle this session.
    final session = ref.watch(authSessionProvider).asData?.value;
    final operation = ++_operation;
    ref.onDispose(() => _operation++);
    if (session is AuthSessionAuthenticated) {
      scheduleMicrotask(() {
        if (ref.mounted && operation == _operation) unawaited(load());
      });
    }
    return const PreferencesState();
  }

  Future<void> load({bool saved = false}) async {
    if (!ref.mounted || state.phase == PreferencesPhase.saving) return;
    final operation = ++_operation;
    state = const PreferencesState();
    if (view == PreferencesView.profile) {
      final result = await _repository.readProfile();
      if (!ref.mounted || operation != _operation) return;
      state = switch (result) {
        Success<OwnProfile>(:final value) => PreferencesState(
          phase: PreferencesPhase.ready,
          profile: value,
          saved: saved,
        ),
        Failure<OwnProfile>() => const PreferencesState(
          phase: PreferencesPhase.failed,
          message: 'Profile could not be loaded. Try again.',
        ),
      };
    } else {
      final result = await _repository.readSettings();
      if (!ref.mounted || operation != _operation) return;
      state = switch (result) {
        Success<OwnSettings>(:final value) => PreferencesState(
          phase: PreferencesPhase.ready,
          settings: value,
          saved: saved,
        ),
        Failure<OwnSettings>() => const PreferencesState(
          phase: PreferencesPhase.failed,
          message: 'Settings could not be loaded. Try again.',
        ),
      };
    }
  }

  Future<void> saveProfile(String? name, ProfileVisibility visibility) async {
    final profile = state.profile;
    if (state.phase != PreferencesPhase.ready || profile == null) return;
    await _save(
      () => _repository.saveProfile(
        displayName: name,
        visibility: visibility,
        expectedRevision: profile.revision,
      ),
    );
  }

  Future<void> saveSettings(
    CheckInVisibility visibility,
    OptionalProcessingConsent consent,
  ) async {
    final settings = state.settings;
    if (state.phase != PreferencesPhase.ready || settings == null) return;
    await _save(
      () => _repository.saveSettings(
        visibility: visibility,
        consent: consent,
        expectedRevision: settings.revision,
      ),
    );
  }

  Future<void> _save<T>(Future<Result<T>> Function() command) async {
    final operation = ++_operation;
    final profile = state.profile, settings = state.settings;
    state = PreferencesState(
      phase: PreferencesPhase.saving,
      profile: profile,
      settings: settings,
    );
    final result = await command();
    if (!ref.mounted || operation != _operation) return;
    if (result is Success<T>) {
      state = PreferencesState(
        phase: PreferencesPhase.ready,
        profile: profile,
        settings: settings,
      );
      await load(saved: true);
    } else {
      final kind = (result as Failure<T>).failure.kind;
      final invalid =
          kind == AppFailureKind.profileInvalid ||
          kind == AppFailureKind.settingsInvalid;
      final stale =
          kind == AppFailureKind.profileRevisionPreconditionFailed ||
          kind == AppFailureKind.settingsRevisionPreconditionFailed;
      state = PreferencesState(
        phase: invalid
            ? PreferencesPhase.ready
            : PreferencesPhase.reloadRequired,
        profile: profile,
        settings: settings,
        message: invalid
            ? (view == PreferencesView.profile
                  ? 'Use a display name of 1–50 characters or leave it unset, and choose a valid Profile visibility.'
                  : 'Choose valid privacy and data-use settings.')
            : stale
            ? 'These details changed. Reload them before saving again.'
            : 'The save could not be confirmed. Reload before trying again.',
      );
    }
  }
}
