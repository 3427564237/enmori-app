import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../account/account_preferences_providers.dart';
import '../account/content_access.dart';
import '../account/domain/account_preferences_repository.dart';
import '../account/domain/account_repository.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/proactive_messaging.dart';
import 'proactive_providers.dart';

final proactiveMessagingEnabledProvider = Provider<bool>((ref) => false);
final proactiveMessagingPortProvider = Provider<ProactiveMessagingPort?>(
  (ref) => null,
);
final proactiveMessagingInstallationRefProvider = Provider<String?>(
  (ref) => null,
);
final proactiveRegistrationRepositoryProvider =
    Provider<ProactiveRegistrationRepository?>((ref) => null);
final proactiveDeliveryResolverProvider = Provider<ProactiveDeliveryResolver?>(
  (ref) => null,
);
typedef ProactiveMessageTargetHandler = void Function(
  AuthSessionAuthenticated session,
  ProactiveMessageTarget target,
);
final proactiveMessageTargetHandlerProvider =
    Provider<ProactiveMessageTargetHandler?>((ref) => null);
final proactiveNotificationControllerProvider =
    NotifierProvider<
      ProactiveNotificationController,
      ProactiveNotificationState
    >(ProactiveNotificationController.new);

final class ProactiveNotificationState {
  const ProactiveNotificationState({
    required this.configured,
    required this.authenticated,
    required this.busy,
    required this.unconfirmed,
    this.registration,
    this.permission,
    this.hasPendingDelivery = false,
    this.resolvingDelivery = false,
    this.failure,
  });
  final bool configured,
      authenticated,
      busy,
      unconfirmed,
      hasPendingDelivery,
      resolvingDelivery;
  final ProactiveRegistration? registration;
  final ProactiveNotificationPermission? permission;
  final AppFailure? failure;
}

final class _Grant {
  const _Grant(
    this.actor,
    this.consentRevision,
    this.settingsRevision,
    this.registrationRevision,
  );
  final AuthSessionAuthenticated actor;
  final int consentRevision, settingsRevision, registrationRevision;
}

final class _UnknownFence {
  const _UnknownFence(this.registrationRevision, this.settingsRevision);
  final int? registrationRevision, settingsRevision;
}

/// Explicit registration and read-only opaque click restoration. No private
/// message body, token, unread acknowledgement or generated message is cached.
class ProactiveNotificationController
    extends Notifier<ProactiveNotificationState> {
  late AuthRepository _auth;
  late AccountPreferencesRepository _preferences;
  late AiClientProcessing _processing;
  ProactiveRepository? _settingsRepo;
  ProactiveRegistrationRepository? _registrations;
  ProactiveMessagingPort? _sdk;
  ProactiveDeliveryResolver? _resolver;
  ProactiveMessageTargetHandler? _handler;
  AuthSession? _actor;
  String? _installation;
  bool _enabled = false, _dead = false;
  Object _epoch = Object(), _configuration = Object();
  final _requests = <ProactiveAbortSignal>{}, _actions = <Object>{};
  Future<void>? _releasing;
  bool _autoReleaseAttempted = false;
  StreamSubscription<String>? _clicks, _refreshes;
  Object? _initialConfiguration;
  Completer<void>? _foregroundWaiter;
  _Grant? _grant;
  AuthSessionAuthenticated? _boundSession;
  ProactiveRegistration? _registration;
  ProactiveNotificationPermission? _permission;
  AppFailure? _failure;
  int? _unknownRegistrationRevision, _unknownSettingsRevision;
  // Non-content RAM fences survive same-owner session/provider replacement.
  // Different owners receive no old registration, credential or pending UI.
  final _unknownOwners = <String, _UnknownFence>{};
  bool _checkRequired = false, _resolving = false, _attemptedDelivery = false;
  String? _pendingDelivery, _lastDelivery;
  AuthSessionAuthenticated? _pendingOwner, _lastDeliveryOwner;

  @override
  ProactiveNotificationState build() {
    final previous = _actor,
        sdk = _sdk,
        installation = _installation,
        enabled = _enabled;
    _abort();
    _cancelSubscriptions();
    _wakeForeground();
    _dead = false;
    _epoch = Object();
    _grant = null;
    _enabled = ref.watch(proactiveMessagingEnabledProvider);
    _sdk = ref.watch(proactiveMessagingPortProvider);
    _installation = ref.watch(proactiveMessagingInstallationRefProvider);
    _registrations = ref.watch(proactiveRegistrationRepositoryProvider);
    _resolver = ref.watch(proactiveDeliveryResolverProvider);
    _handler = ref.watch(proactiveMessageTargetHandlerProvider);
    _auth = ref.watch(authRepositoryProvider);
    _processing = ref.watch(aiClientProcessingProvider);
    _actor = ref.watch(authSessionProvider).asData?.value;
    _preferences = ref.watch(accountPreferencesRepositoryProvider);
    _settingsRepo = ref.watch(proactiveRepositoryProvider);
    _registration = null;
    _permission = null;
    _failure = null;
    _resolving = false;
    _checkRequired = false;
    final fence = _actor is AuthSessionAuthenticated
        ? _unknownOwners[(_actor as AuthSessionAuthenticated).subject]
        : null;
    _unknownRegistrationRevision = fence?.registrationRevision;
    _unknownSettingsRevision = fence?.settingsRevision;
    if (!identical(sdk, _sdk) ||
        installation != _installation ||
        enabled != _enabled) {
      _configuration = Object();
      _pendingDelivery = null;
      _pendingOwner = null;
    }
    if (_pendingOwner != null && !identical(_pendingOwner, _actor)) {
      _clearPending();
    }
    if (previous is AuthSessionAuthenticated && !identical(previous, _actor)) {
      _lastDelivery = null;
      _lastDeliveryOwner = null;
      // A replacement session never supplies credentials for the old owner.
      if (identical(_boundSession, previous)) {
        _boundSession = null;
        if (_actor is AuthSessionUnauthenticated && _configured) {
          final epoch = _epoch;
          Future.microtask(() => _deleteLocalAfterLoss(epoch));
        }
      }
    }
    ref.onDispose(() {
      _dead = true;
      _abort();
      _cancelSubscriptions();
      _wakeForeground();
    });
    ref.listen(contentAccessProvider, (before, after) {
      if (!after.foreground) {
        _abort();
        _grant = null;
      } else {
        _wakeForeground();
        if (before?.foreground == true) _invalidate();
        if (_withdrawn(ref.read(accountSettingsSnapshotProvider))) {
          _scheduleRelease();
        }
        _maybeOpen();
      }
      _show();
    });
    ref.listen(accountSettingsSnapshotProvider, (before, after) {
      if (after?.consent != OptionalProcessingConsent.accepted ||
          _allowsProcessing(before) && !_allowsProcessing(after) ||
          before != null && after?.revision != before.revision) {
        final release =
            _boundSession != null &&
            identical(_boundSession, _actor) &&
            _withdrawn(after);
        _invalidate();
        if (release) _scheduleRelease();
      }
      _show();
    });
    ref.listen(proactiveControllerProvider, (before, after) {
      if (after.settingsUnconfirmed ||
          after.settingsStale ||
          before?.settings?.revision != after.settings?.revision) {
        _grant = null;
      }
      _show();
    });
    if (_configured) {
      final configuration = _configuration;
      Future.microtask(() => _startRouting(configuration));
    }
    return _snapshot();
  }

  bool get _configured =>
      _enabled &&
      _sdk != null &&
      _settingsRepo != null &&
      _registrations != null &&
      _resolver != null &&
      _handler != null &&
      _installation != null &&
      isProactiveUuid(_installation!);
  bool get _foreground => ref.read(contentAccessProvider).foreground;
  bool _identity(Object epoch) =>
      !_dead &&
      ref.mounted &&
      _configured &&
      identical(epoch, _epoch) &&
      _actor is AuthSessionAuthenticated &&
      identical(_actor, ref.read(authSessionProvider).asData?.value);
  bool _current(Object epoch) => _identity(epoch) && _foreground;
  bool get _consentAllowed =>
      ref.read(accountSettingsSnapshotProvider)?.consent ==
      OptionalProcessingConsent.accepted;
  bool _allowsProcessing(OwnSettings? settings) =>
      settings?.consent == OptionalProcessingConsent.accepted &&
      _processing != AiClientProcessing.groqCloud &&
      _processing.allowsCloudConsent(settings?.cloudAiConsent);
  bool get _processingConsentAllowed =>
      _allowsProcessing(ref.read(accountSettingsSnapshotProvider));
  bool _withdrawn(OwnSettings? settings) =>
      settings != null &&
      (settings.consent == OptionalProcessingConsent.rejected ||
          !_processing.allowsCloudConsent(settings.cloudAiConsent));
  ProactiveNotificationState _snapshot() => ProactiveNotificationState(
    configured: _configured,
    authenticated: _actor is AuthSessionAuthenticated,
    busy: _actions.isNotEmpty,
    unconfirmed:
        _checkRequired ||
        _unknownRegistrationRevision != null ||
        _unknownSettingsRevision != null,
    registration: _registration,
    permission: _permission,
    failure: _failure,
    hasPendingDelivery: _pendingDelivery != null,
    resolvingDelivery: _resolving,
  );
  void _show() {
    if (!_dead && ref.mounted) state = _snapshot();
  }

  void _abort() {
    for (final signal in _requests.toList()) {
      signal.abort();
    }
    _requests.clear();
  }

  void _wakeForeground() {
    final waiter = _foregroundWaiter;
    _foregroundWaiter = null;
    if (waiter != null && !waiter.isCompleted) waiter.complete();
  }

  void _cancelSubscriptions() {
    unawaited(_clicks?.cancel());
    unawaited(_refreshes?.cancel());
    _clicks = null;
    _refreshes = null;
  }

  void _invalidate() {
    _epoch = Object();
    _grant = null;
    _abort();
    _resolving = false;
    _wakeForeground();
  }

  void _clearPending() {
    _pendingDelivery = null;
    _pendingOwner = null;
    _attemptedDelivery = false;
  }

  void _rememberUnknown() {
    final actor = _actor;
    if (actor is! AuthSessionAuthenticated) return;
    if (_unknownRegistrationRevision == null &&
        _unknownSettingsRevision == null) {
      _unknownOwners.remove(actor.subject);
    } else {
      _unknownOwners[actor.subject] = _UnknownFence(
        _unknownRegistrationRevision,
        _unknownSettingsRevision,
      );
    }
  }

  Future<void> _waitForForeground(Object epoch) async {
    if (_foreground || !_identity(epoch)) return;
    final waiter = Completer<void>();
    _foregroundWaiter = waiter;
    final timer = Timer(const Duration(seconds: 15), _wakeForeground);
    try {
      await waiter.future;
    } finally {
      timer.cancel();
    }
  }

  Future<Result<T>> _call<T>(
    Object epoch,
    Future<Result<T>> Function(String, ProactiveAbortSignal) run, {
    bool needsConsent = false,
    bool needsProcessingConsent = false,
  }) async {
    bool current() =>
        _current(epoch) &&
        (!needsConsent || _consentAllowed) &&
        (!needsProcessingConsent || _processingConsentAllowed);
    if (!current()) return const Failure(_notVerified);
    final abort = ProactiveAbortSignal();
    _requests.add(abort);
    final timer = Timer(const Duration(seconds: 15), abort.abort);
    try {
      final token = await Future.any<Result<String>?>([
        _auth.getIdToken(),
        abort.whenAborted.then((_) => null),
      ]);
      if (!current() || abort.isAborted || token == null) {
        return const Failure(_notVerified);
      }
      if (token case Failure<String>(:final failure)) return Failure(failure);
      final result = await Future.any<Result<T>>([
        run((token as Success<String>).value, abort),
        abort.whenAborted.then((_) => const Failure(_notVerified)),
      ]);
      return current() && !abort.isAborted
          ? result
          : const Failure(_notVerified);
    } catch (_) {
      return const Failure(_notVerified);
    } finally {
      timer.cancel();
      _requests.remove(abort);
    }
  }

  Future<OwnSettings?> _consent(
    Object epoch, {
    int? expected,
    bool processing = true,
  }) async {
    if (!_current(epoch)) return null;
    final abort = ProactiveAbortSignal();
    _requests.add(abort);
    final timer = Timer(const Duration(seconds: 15), abort.abort);
    Result<OwnSettings>? result;
    try {
      result = await Future.any<Result<OwnSettings>?>([
        _preferences.readSettings(),
        abort.whenAborted.then((_) => null),
      ]);
    } catch (_) {
      result = const Failure(_notVerified);
    } finally {
      timer.cancel();
      _requests.remove(abort);
    }
    if (!_current(epoch)) return null;
    if (result == null || abort.isAborted) {
      _failure = _notVerified;
      return null;
    }
    if (result case Failure<OwnSettings>(:final failure)) {
      _failure = failure;
      return null;
    }
    final value = (result as Success<OwnSettings>).value,
        observed = ref.read(accountSettingsSnapshotProvider);
    if (observed != null && observed.revision > value.revision) {
      _failure = _notVerified;
      return null;
    }
    ref.read(accountSettingsSnapshotProvider.notifier).observe(value);
    if (!_current(epoch) ||
        expected != null && value.revision != expected ||
        value.consent != OptionalProcessingConsent.accepted ||
        ref.read(accountSettingsSnapshotProvider)?.consent !=
            OptionalProcessingConsent.accepted ||
        processing &&
            (!_allowsProcessing(value) || !_processingConsentAllowed)) {
      _failure = _notVerified;
      return null;
    }
    return value;
  }

  Future<ProactiveSettings?> _settings(Object epoch) async {
    final result = await _call(
      epoch,
      (token, abort) => _settingsRepo!.readSettings(token: token, abort: abort),
    );
    if (!_current(epoch)) return null;
    if (result case Failure<ProactiveSettings>(:final failure)) {
      _failure = failure;
      return null;
    }
    final value = (result as Success<ProactiveSettings>).value;
    if (_unknownSettingsRevision != null &&
        value.revision > _unknownSettingsRevision!) {
      _unknownSettingsRevision = null;
      _rememberUnknown();
    }
    return value;
  }

  Future<ProactiveRegistration?> _read(Object epoch) async {
    final result = await _call(
      epoch,
      (token, abort) => _registrations!.read(token: token, abort: abort),
    );
    if (!_current(epoch)) return null;
    if (result case Failure<ProactiveRegistration>(:final failure)) {
      _failure = failure;
      return null;
    }
    final value = (result as Success<ProactiveRegistration>).value;
    _registration = value;
    if (_unknownRegistrationRevision != null &&
        value.revision > _unknownRegistrationRevision!) {
      _unknownRegistrationRevision = null;
      _rememberUnknown();
    }
    return value;
  }

  void _guard(Object epoch) {
    if (!_current(epoch)) throw const _Stopped(_notVerified);
  }

  void _guardConsent(Object epoch, {bool processing = true}) {
    _guard(epoch);
    if (!_consentAllowed || processing && !_processingConsentAllowed) {
      throw const _Stopped(_notVerified);
    }
  }

  T _value<T>(Result<T> result) => switch (result) {
    Success<T>(:final value) => value,
    Failure<T>(:final failure) => throw _Stopped(failure),
  };
  Future<void> readRegistration() async {
    if (_actions.isNotEmpty || !_current(_epoch)) return;
    final epoch = _epoch, action = Object();
    _actions.add(action);
    _failure = null;
    _show();
    try {
      final settings = await _settings(epoch);
      _guard(epoch);
      final registration = await _read(epoch);
      _guard(epoch);
      if (settings == null || registration == null) return;
      _permission = _value(await _sdk!.permission());
      _guard(epoch);
      _checkRequired =
          _unknownSettingsRevision != null ||
          _unknownRegistrationRevision != null;
      if (_permission != ProactiveNotificationPermission.granted) _grant = null;
      if (_checkRequired) _failure = _unconfirmed;
    } on _Stopped catch (error) {
      if (_current(epoch)) _failure = error.failure;
    } catch (_) {
      if (_current(epoch)) _failure = _notVerified;
    } finally {
      _actions.remove(action);
      _show();
    }
  }

  Future<void> enablePush() async {
    if (_actions.isNotEmpty || !_current(_epoch) || _snapshot().unconfirmed) {
      return;
    }
    final epoch = _epoch, action = Object();
    _actions.add(action);
    _failure = null;
    _grant = null;
    _show();
    try {
      final consent = await _consent(epoch);
      _guard(epoch);
      final original = await _settings(epoch);
      _guard(epoch);
      if (consent == null || original == null) return;
      if (!original.allowsExplicitFollowUp) throw const _Stopped(_followUpsOff);
      _guardConsent(epoch);
      _permission = _value(await _sdk!.requestPermission());
      await _waitForForeground(epoch);
      _guard(epoch);
      if (_permission != ProactiveNotificationPermission.granted) {
        throw const _Stopped(_permissionDenied);
      }
      if (await _consent(epoch, expected: consent.revision) == null) return;
      final afterPermission = await _settings(epoch);
      _guard(epoch);
      if (afterPermission?.revision != original.revision ||
          afterPermission?.allowsExplicitFollowUp != true) {
        throw const _Stopped(_notVerified);
      }
      final channel = _value(await _sdk!.prepareChannel());
      _guardConsent(epoch);
      if (!channel) throw const _Stopped(_permissionDenied);
      final token = _value(await _sdk!.getToken());
      _guardConsent(epoch);
      if (await _consent(epoch, expected: consent.revision) == null) return;
      final before = await _settings(epoch);
      _guard(epoch);
      if (before == null ||
          before.revision != original.revision ||
          !before.allowsExplicitFollowUp) {
        throw const _Stopped(_notVerified);
      }
      final settings = before.pushEnabled
          ? before
          : await _changePush(epoch, before, true);
      _guard(epoch);
      final registration = await _read(epoch);
      _guard(epoch);
      if (registration == null) return;
      final updated = await _replace(epoch, registration.revision, token);
      _guard(epoch);
      _boundSession = _actor as AuthSessionAuthenticated;
      if (await _consent(epoch, expected: consent.revision) == null) return;
      final finalSettings = await _settings(epoch);
      _guard(epoch);
      if (finalSettings?.revision != settings.revision ||
          finalSettings?.pushEnabled != true ||
          finalSettings?.allowsExplicitFollowUp != true) {
        throw const _Stopped(_notVerified);
      }
      // Refresh the existing Settings UI through its public read method. This
      // is a read after an explicit confirmed command, never a replayed PUT.
      await ref.read(proactiveControllerProvider.notifier).readSettings();
      _guard(epoch);
      _registration = updated;
      _autoReleaseAttempted = false;
      _grant = _Grant(
        _boundSession!,
        consent.revision,
        settings.revision,
        updated.revision,
      );
      _checkRequired = false;
      _failure = null;
      _listenRefresh(_configuration);
    } on _Stopped catch (error) {
      if (_current(epoch)) {
        _failure = error.failure;
        _grant = null;
      }
    } catch (_) {
      if (_current(epoch)) {
        _failure = _notVerified;
        _grant = null;
      }
    } finally {
      _actions.remove(action);
      _show();
      _maybeOpen();
    }
  }

  Future<ProactiveSettings> _changePush(
    Object epoch,
    ProactiveSettings before,
    bool enabled,
  ) async {
    final requested = ProactiveSettings(
      revision: before.revision,
      mode: before.mode,
      categories: before.categories,
      timeZone: before.timeZone,
      quiet: before.quiet,
      maximumInRolling24h: before.maximumInRolling24h,
      cooldownMinutes: before.cooldownMinutes,
      pushEnabled: enabled,
      preview: before.preview,
      pausedUntil: before.pausedUntil,
    );
    final result = await _call(epoch, (token, abort) {
      _unknownSettingsRevision = before.revision;
      _checkRequired = true;
      _rememberUnknown();
      return _settingsRepo!.saveSettings(
        token: token,
        abort: abort,
        settings: requested,
        expectedRevision: before.revision,
      );
    }, needsProcessingConsent: enabled);
    _guard(epoch);
    if (result case Failure<ProactiveSettings>(:final failure)) {
      if (_definite(failure)) {
        _unknownSettingsRevision = null;
        _rememberUnknown();
      }
      throw _Stopped(failure);
    }
    final value = (result as Success<ProactiveSettings>).value;
    if (value.revision != before.revision + 1 ||
        !_sameSettings(value, requested)) {
      throw const _Stopped(_unconfirmed);
    }
    _unknownSettingsRevision = null;
    _rememberUnknown();
    return value;
  }

  Future<ProactiveRegistration> _replace(
    Object epoch,
    int expected,
    String value,
  ) async {
    final result = await _call(epoch, (token, abort) {
      _unknownRegistrationRevision = expected;
      _checkRequired = true;
      _rememberUnknown();
      return _registrations!.replace(
        token: token,
        abort: abort,
        expectedRevision: expected,
        installationRef: _installation!,
        registrationValue: value,
      );
    }, needsProcessingConsent: true);
    _guard(epoch);
    if (result case Failure<ProactiveRegistration>(:final failure)) {
      if (_definite(failure)) {
        _unknownRegistrationRevision = null;
        _rememberUnknown();
      }
      throw _Stopped(failure);
    }
    final current = (result as Success<ProactiveRegistration>).value;
    if (current.revision != expected + 1 ||
        !current.currentFor(_installation!, ref.read(proactiveNowProvider)())) {
      throw const _Stopped(_unconfirmed);
    }
    _unknownRegistrationRevision = null;
    _rememberUnknown();
    return current;
  }

  Future<void> disablePush() async {
    if (_actions.isNotEmpty || !_current(_epoch) || _snapshot().unconfirmed) {
      return;
    }
    await _release(updateSettings: true);
  }

  /// Root calls while the original session is still authenticated and always
  /// continues sign-out. A timeout is not proof of server or SDK revocation.
  Future<void> beforeSignOut() async {
    if (!_current(_epoch)) return;
    final existing = _releasing;
    if (existing == null) _invalidate();
    final expired = Completer<void>();
    final timer = Timer(const Duration(seconds: 15), expired.complete);
    try {
      await Future.any<void>([
        existing ?? _release(updateSettings: false),
        expired.future,
      ]);
    } finally {
      timer.cancel();
    }
  }

  void _scheduleRelease() {
    if (!_current(_epoch) ||
        _autoReleaseAttempted ||
        _boundSession == null ||
        !identical(_boundSession, _actor)) {
      return;
    }
    _autoReleaseAttempted = true;
    Future.microtask(() => _release(updateSettings: false));
  }

  Future<void> _release({required bool updateSettings}) {
    final existing = _releasing;
    if (existing != null) return existing;
    late Future<void> running;
    running = _releaseWork(updateSettings: updateSettings).whenComplete(() {
      if (identical(_releasing, running)) _releasing = null;
    });
    _releasing = running;
    return running;
  }

  Future<void> _releaseWork({required bool updateSettings}) async {
    if (!_current(_epoch)) return;
    final epoch = _epoch, action = Object();
    _actions.add(action);
    _grant = null;
    unawaited(_refreshes?.cancel());
    _refreshes = null;
    _failure = null;
    _show();
    try {
      final metadata = await _read(epoch);
      _guard(epoch);
      if (metadata == null) return;
      if (_unknownRegistrationRevision != null) {
        // An unchanged GET cannot prove an earlier unknown PUT will not commit.
        _failure = _unconfirmed;
      } else if (metadata.enabled &&
          metadata.installationRef == _installation) {
        final result = await _call(epoch, (token, abort) {
          _unknownRegistrationRevision = metadata.revision;
          _checkRequired = true;
          _rememberUnknown();
          return _registrations!.delete(
            token: token,
            abort: abort,
            expectedRevision: metadata.revision,
            installationRef: _installation!,
          );
        });
        _guard(epoch);
        if (result case Failure<ProactiveRegistration>(:final failure)) {
          if (_definite(failure)) {
            _unknownRegistrationRevision = null;
            _rememberUnknown();
          }
          _failure = failure;
        } else {
          final released = (result as Success<ProactiveRegistration>).value;
          if (released.enabled || released.revision != metadata.revision + 1) {
            throw const _Stopped(_unconfirmed);
          }
          _registration = released;
          _unknownRegistrationRevision = null;
          _rememberUnknown();
          _boundSession = null;
        }
      } else {
        _registration = metadata;
        _boundSession = null;
      }
      _guard(epoch);
      // Local deletion is scoped to the fixed installation just verified above.
      // The SDK port retains serialization until this Future actually settles.
      final local = await _sdk!.deleteToken();
      _guard(epoch);
      if (local case Failure<void>(:final failure)) _failure = failure;
      if (updateSettings && _unknownRegistrationRevision == null) {
        final settings = await _settings(epoch);
        _guard(epoch);
        if (settings != null && settings.pushEnabled) {
          await _changePush(epoch, settings, false);
        }
        _guard(epoch);
        await ref.read(proactiveControllerProvider.notifier).readSettings();
        _guard(epoch);
      }
      _checkRequired =
          _unknownRegistrationRevision != null ||
          _unknownSettingsRevision != null;
    } on _Stopped catch (error) {
      if (_current(epoch)) _failure = error.failure;
    } catch (_) {
      if (_current(epoch)) _failure = _notVerified;
    } finally {
      _actions.remove(action);
      _show();
    }
  }

  Future<void> _deleteLocalAfterLoss(Object epoch) async {
    if (_dead ||
        !ref.mounted ||
        !_configured ||
        !identical(epoch, _epoch) ||
        _actor is! AuthSessionUnauthenticated) {
      return;
    }
    final action = Object();
    _actions.add(action);
    _show();
    try {
      await _sdk!.deleteToken();
    } catch (_) {
      /* Backend release remains unconfirmed; never use a new owner. */
    } finally {
      _actions.remove(action);
      if (identical(epoch, _epoch) && _actor is AuthSessionUnauthenticated) {
        _checkRequired = true;
        _failure = _unconfirmed;
      }
      _show();
    }
  }

  void _listenRefresh(Object configuration) {
    if (!_configured ||
        _grant == null ||
        !identical(configuration, _configuration)) {
      return;
    }
    final epoch = _epoch;
    unawaited(_refreshes?.cancel());
    _refreshes = _sdk!.tokenRefreshes.listen(
      (value) {
        if (!_current(epoch) ||
            !identical(configuration, _configuration) ||
            _grant == null) {
          return;
        }
        if (_actions.isNotEmpty) {
          _grant = null;
          _checkRequired = true;
          _show();
          return;
        }
        unawaited(_refresh(value, configuration));
      },
      onError: (Object _) {
        if (!_current(epoch) || !identical(configuration, _configuration)) {
          return;
        }
        _grant = null;
        _checkRequired = true;
        _failure = _notVerified;
        _show();
      },
    );
  }

  Future<void> _refresh(String token, Object configuration) async {
    final grant = _grant, epoch = _epoch;
    if (grant == null ||
        !_current(epoch) ||
        !identical(configuration, _configuration) ||
        !identical(grant.actor, _actor)) {
      return;
    }
    final action = Object();
    _actions.add(action);
    _show();
    try {
      if (await _consent(epoch, expected: grant.consentRevision) == null) {
        return;
      }
      final settings = await _settings(epoch);
      _guard(epoch);
      if (settings?.revision != grant.settingsRevision ||
          settings?.pushEnabled != true ||
          settings?.allowsExplicitFollowUp != true) {
        throw const _Stopped(_notVerified);
      }
      final permission = _value(await _sdk!.permission());
      _guard(epoch);
      final channel = _value(await _sdk!.prepareChannel());
      _guard(epoch);
      if (permission != ProactiveNotificationPermission.granted || !channel) {
        throw const _Stopped(_permissionDenied);
      }
      final registration = await _read(epoch);
      _guard(epoch);
      if (registration == null ||
          registration.revision != grant.registrationRevision ||
          !registration.currentFor(
            _installation!,
            ref.read(proactiveNowProvider)(),
          )) {
        throw const _Stopped(_notVerified);
      }
      final updated = await _replace(epoch, registration.revision, token);
      _guard(epoch);
      _registration = updated;
      _grant = _Grant(
        grant.actor,
        grant.consentRevision,
        grant.settingsRevision,
        updated.revision,
      );
      _checkRequired = false;
    } on _Stopped catch (error) {
      if (_current(epoch)) {
        _grant = null;
        _checkRequired = true;
        _failure = error.failure;
      }
    } catch (_) {
      if (_current(epoch)) {
        _grant = null;
        _checkRequired = true;
        _failure = _notVerified;
      }
    } finally {
      _actions.remove(action);
      _show();
    }
  }

  void _startRouting(Object configuration) {
    if (_dead ||
        !ref.mounted ||
        !_configured ||
        !identical(configuration, _configuration)) {
      return;
    }
    _clicks = _sdk!.openedDeliveryRefs.listen(
      (value) {
        if (!_dead && ref.mounted && identical(configuration, _configuration)) {
          _receiveReference(value);
        }
      },
      onError: (Object _) {
        if (identical(configuration, _configuration)) {
          _failure = _notVerified;
          _show();
        }
      },
    );
    if (!identical(_initialConfiguration, configuration)) {
      _initialConfiguration = configuration;
      final owner = _actor is AuthSessionAuthenticated
          ? _actor as AuthSessionAuthenticated
          : null;
      unawaited(_initial(configuration, owner));
    }
    _maybeOpen();
  }

  Future<void> _initial(
    Object configuration,
    AuthSessionAuthenticated? owner,
  ) async {
    try {
      final result = await _sdk!.initialDeliveryRef();
      if (_dead ||
          !ref.mounted ||
          !_configured ||
          !identical(configuration, _configuration) ||
          owner != null && !identical(owner, _actor)) {
        return;
      }
      if (result case Success<String?>(:final value)) {
        if (value != null) _receiveReference(value);
      } else {
        _failure = (result as Failure<String?>).failure;
        _show();
      }
    } catch (_) {
      if (!_dead && ref.mounted && identical(configuration, _configuration)) {
        _failure = _notVerified;
        _show();
      }
    }
  }

  void _receiveReference(String value) {
    if (!_configured || !isProactiveUuid(value)) return;
    if (value == _lastDelivery && identical(_actor, _lastDeliveryOwner) ||
        value == _pendingDelivery) {
      return;
    }
    _pendingDelivery = value;
    _pendingOwner = _actor is AuthSessionAuthenticated
        ? _actor as AuthSessionAuthenticated
        : null;
    _attemptedDelivery = false;
    _failure = null;
    _show();
    _maybeOpen();
  }

  void _maybeOpen() {
    if (_pendingDelivery != null &&
        !_attemptedDelivery &&
        !_resolving &&
        _actions.isEmpty &&
        _current(_epoch)) {
      Future.microtask(() => openPendingDelivery(automatic: true));
    }
  }

  Future<void> openPendingDelivery({bool automatic = false}) async {
    if (!_current(_epoch) ||
        _resolving ||
        _pendingDelivery == null ||
        _actions.isNotEmpty ||
        automatic && _attemptedDelivery) {
      return;
    }
    final epoch = _epoch,
        reference = _pendingDelivery!,
        actor = _actor as AuthSessionAuthenticated;
    if (_pendingOwner != null && !identical(_pendingOwner, actor)) {
      _clearPending();
      _show();
      return;
    }
    _attemptedDelivery = true;
    _resolving = true;
    _failure = null;
    _show();
    try {
      // Read authority is the original source receipt, not the processor
      // selected for new requests in this app build.
      if (await _consent(epoch, processing: false) == null) return;
      _guard(epoch);
      final result = await _call(
        epoch,
        (token, abort) =>
            _resolver!(token: token, deliveryRef: reference, abort: abort),
        needsConsent: true,
      );
      _guardConsent(epoch, processing: false);
      if (_pendingDelivery != reference) return;
      final target = _value(result);
      if (!isProactiveUuid(target.conversationId) ||
          !isProactiveUuid(target.messageId)) {
        throw const _Stopped(_notVerified);
      }
      _handler!(actor, target); // Root separately rechecks this exact session.
      _lastDelivery = reference;
      _lastDeliveryOwner = actor;
      _clearPending();
    } on _Stopped catch (error) {
      if (_current(epoch)) _failure = error.failure;
    } catch (_) {
      if (_current(epoch)) _failure = _notVerified;
    } finally {
      if (identical(epoch, _epoch)) _resolving = false;
      _show();
      _maybeOpen();
    }
  }
}

final class _Stopped implements Exception {
  const _Stopped(this.failure);
  final AppFailure failure;
}

bool _definite(AppFailure failure) => const {
  AppFailureKind.authRequired,
  AppFailureKind.authForbidden,
  AppFailureKind.proactiveInputInvalid,
  AppFailureKind.proactiveRevisionPreconditionFailed,
  AppFailureKind.requestInvalid,
  AppFailureKind.requestTooLarge,
  AppFailureKind.aiAuthorityChanged,
  AppFailureKind.aiSourceUnavailable,
  AppFailureKind.aiOperationConflict,
}.contains(failure.kind);
bool _sameSettings(ProactiveSettings a, ProactiveSettings b) =>
    a.mode == b.mode &&
    a.categories.join(',') == b.categories.join(',') &&
    a.timeZone == b.timeZone &&
    a.pausedUntil == b.pausedUntil &&
    a.pushEnabled == b.pushEnabled &&
    a.preview == b.preview &&
    a.maximumInRolling24h == b.maximumInRolling24h &&
    a.cooldownMinutes == b.cooldownMinutes &&
    switch ((a.quiet, b.quiet)) {
      (ProactiveQuietDisabled(), ProactiveQuietDisabled()) => true,
      (
        ProactiveQuietWindow(startMinute: final a1, endMinute: final a2),
        ProactiveQuietWindow(startMinute: final b1, endMinute: final b2),
      ) =>
        a1 == b1 && a2 == b2,
      _ => false,
    };
const _notVerified = AppFailure(
  kind: AppFailureKind.aiUnavailable,
  message: 'Notification access could not be verified. Check again.',
);
const _unconfirmed = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'Notification changes are unconfirmed. Check current status before continuing.',
);
const _permissionDenied = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'System notifications or this channel are unavailable. Follow-ups remain available in the app.',
);
const _followUpsOff = AppFailure(
  kind: AppFailureKind.proactiveInputInvalid,
  message: 'Turn on explicit follow-ups before enabling system notifications.',
);
