import '../content_access.dart';
import '../domain/profile_location_repository.dart';
import '../domain/profile_details.dart';

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
  late ProfileLocationRepository _locationRepository;
  int _operation = 0;

  @override
  PreferencesState build() {
    _repository = ref.watch(accountPreferencesRepositoryProvider);
    _locationRepository = ref.watch(profileLocationRepositoryProvider);
    // A replacement observation is a new session even for the same subject.
    // Rebuild the request fence so old reads/saves cannot settle this session.
    final session = ref.watch(authSessionProvider).asData?.value;
    ref.listen(contentAccessProvider, (before, after) {
      if (after.foreground && state.phase == PreferencesPhase.saving) return;
      _operation++;
      state = const PreferencesState();
      if (after.foreground) {
        scheduleMicrotask(() {
          if (ref.mounted) unawaited(load());
        });
      }
    });
    final operation = ++_operation;
    ref.onDispose(() => _operation++);
    if (session is AuthSessionAuthenticated) {
      scheduleMicrotask(() {
        if (ref.mounted && operation == _operation) unawaited(load());
      });
    }
    return const PreferencesState();
  }

  Future<Result<String>> locateRegion() =>
      _locationRepository.currentRegionCoordinates();

  Future<void> load({bool saved = false}) async {
    if (!ref.mounted ||
        state.phase == PreferencesPhase.saving ||
        !ref.read(contentAccessProvider).foreground) {
      return;
    }
    final operation = ++_operation;
    final previousProfile = state.profile;
    final previousSettings = state.settings;
    state = PreferencesState(
      profile: previousProfile,
      settings: previousSettings,
    );
    if (view == PreferencesView.profile) {
      final result = await _repository.readProfile();
      if (!ref.mounted || operation != _operation) return;
      state = switch (result) {
        Success<OwnProfile>(:final value) => PreferencesState(
          phase: PreferencesPhase.ready,
          profile: value,
          saved: saved,
        ),
        Failure<OwnProfile>() => PreferencesState(
          profile: previousProfile,
          phase: PreferencesPhase.failed,
          message: 'Profile could not be loaded. Try again.',
        ),
      };
    } else {
      final result = await _repository.readSettings();
      if (!ref.mounted || operation != _operation) return;
      if (result case Success<OwnSettings>(:final value)) {
        ref.read(accountSettingsSnapshotProvider.notifier).observe(value);
      }
      state = switch (result) {
        Success<OwnSettings>(:final value) => PreferencesState(
          phase: PreferencesPhase.ready,
          settings: value,
          saved: saved,
        ),
        Failure<OwnSettings>() => PreferencesState(
          settings: previousSettings,
          phase: PreferencesPhase.failed,
          message: 'Settings could not be loaded. Try again.',
        ),
      };
    }
  }

  Future<void> saveProfile(
    String? name,
    ProfileVisibility visibility, {
    ProfileDetails? details,
  }) async {
    final profile = state.profile;
    if (state.phase != PreferencesPhase.ready || profile == null) return;
    await _save(
      () => _repository.saveProfile(
        details: details,
        displayName: name,
        visibility: visibility,
        expectedRevision: profile.revision,
      ),
    );
  }

  Future<void> saveSettings(
    CheckInVisibility visibility,
    OptionalProcessingConsent consent, {
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
  }) async {
    final settings = state.settings;
    if (state.phase != PreferencesPhase.ready || settings == null) return;
    await _save(
      () => _repository.saveSettings(
        defaultCheckInLocation: defaultCheckInLocation,
        defaultCheckInWeather: defaultCheckInWeather,
        homeWeatherAuto: homeWeatherAuto,
        fieldPrivacy: fieldPrivacy,
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
    final result = await afterContentMutation(ref, command);
    if (!ref.mounted || operation != _operation) return;
    if (result is Success<T>) {
      if (result.value case final OwnSettings confirmed) {
        ref.read(accountSettingsSnapshotProvider.notifier).observe(confirmed);
      }
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
            ? 'These details changed elsewhere. Read the latest version before saving again.'
            : 'The save could not be confirmed. Check the latest version before trying again.',
      );
    }
  }
}
