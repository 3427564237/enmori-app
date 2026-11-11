import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import '../account/account_preferences_providers.dart';
import '../account/domain/account_repository.dart';
import '../account/domain/cloud_ai_consent.dart';
import '../account/content_access.dart';
import 'data/method_channel_follow_up_time.dart';
import 'data/secure_intent_id.dart';
import 'domain/proactive.dart';
import 'domain/proactive_repository.dart';
import 'presentation/proactive_state.dart';

export 'domain/proactive.dart';
export 'domain/proactive_repository.dart';
export 'presentation/proactive_state.dart';

final proactiveRepositoryProvider = Provider<ProactiveRepository?>(
  (ref) => null,
);
// Only new processing effects use this gate. Existing reads, cancellation and
// off retain their own authority checks, including legacy local occurrences.
final proactiveProcessingAllowedProvider = Provider<bool>((ref) {
  final processing = ref.watch(aiClientProcessingProvider);
  final settings = ref.watch(accountSettingsSnapshotProvider);
  return settings?.consent == OptionalProcessingConsent.accepted &&
      processing != AiClientProcessing.groqCloud &&
      processing.allowsCloudConsent(settings?.cloudAiConsent);
});
final followUpTimePortProvider = Provider<FollowUpTimePort>(
  (ref) => const MethodChannelFollowUpTimePort(),
);
final proactiveIntentIdsProvider = Provider<ProactiveIntentIdPort>(
  (ref) => SecureProactiveIntentIds(),
);
final proactiveNowProvider = Provider<DateTime Function()>(
  (ref) =>
      () => DateTime.now().toUtc(),
);
final proactiveControllerProvider =
    NotifierProvider<ProactiveController, ProactiveState>(
      ProactiveController.new,
    );

class ProactiveController extends Notifier<ProactiveState> {
  late AuthRepository _auth;
  late AiClientProcessing _processing;
  ProactiveRepository? _repository;
  AuthSession? _actor;
  Object _epoch = Object();
  final _requests = <ProactiveAbortSignal>{};
  late ProactiveIntentIdPort _ids;
  late DateTime Function() _now;
  ({String conversationId, String messageId, FollowUpTime time})? _review;

  @override
  ProactiveState build() {
    _abortAll();
    _review = null;
    _epoch = Object();
    _actor = ref.watch(authSessionProvider).asData?.value;
    _auth = ref.watch(authRepositoryProvider);
    _processing = ref.watch(aiClientProcessingProvider);
    _repository = ref.watch(proactiveRepositoryProvider);
    _ids = ref.watch(proactiveIntentIdsProvider);
    _now = ref.watch(proactiveNowProvider);
    ref.onDispose(_abortAll);
    ref.listen(contentAccessProvider, (_, _) => _invalidateLocal());
    ref.listen(accountSettingsSnapshotProvider, (_, next) {
      if (next?.consent == OptionalProcessingConsent.rejected ||
          _processing.cloudProvider != null &&
              !_processing.allowsCloudConsent(next?.cloudAiConsent)) {
        _invalidateLocal(failure: _consent);
      }
    });
    return ProactiveState(
      sessionKey: Object(),
      authenticated: _actor is AuthSessionAuthenticated,
    );
  }

  void _abortAll() {
    for (final signal in _requests.toList()) {
      signal.abort();
    }
    _requests.clear();
  }

  void _invalidateLocal({AppFailure failure = _unavailable}) {
    _review = null;
    _epoch = Object();
    _abortAll();
    state = state.copy(
      settingsBusy: false,
      intentsBusy: false,
      settingsStale: true,
      clearIntents: true,
      sourceUnavailable: true,
      failure: failure,
    );
  }

  bool _current(Object epoch) =>
      ref.mounted &&
      identical(epoch, _epoch) &&
      identical(ref.read(authSessionProvider).asData?.value, _actor) &&
      _actor is AuthSessionAuthenticated &&
      ref.read(contentAccessProvider).foreground;
  bool get _consentAllowed =>
      _purposeAllowed &&
      _processing != AiClientProcessing.groqCloud &&
      _processing.allowsCloudConsent(
        ref.read(accountSettingsSnapshotProvider)?.cloudAiConsent,
      );
  bool get _purposeAllowed =>
      ref.read(accountSettingsSnapshotProvider)?.consent ==
      OptionalProcessingConsent.accepted;

  Future<Result<T>> _call<T>(
    Future<Result<T>> Function(String, ProactiveAbortSignal) run, {
    bool needsConsent = false,
    bool needsPurposeConsent = false,
    void Function()? admitted,
  }) async {
    final epoch = _epoch;
    if (!_current(epoch)) return const Failure(_authRequired);
    if (_repository == null) return const Failure(_configuration);
    final signal = ProactiveAbortSignal();
    _requests.add(signal);
    final timer = Timer(const Duration(seconds: 15), signal.abort);
    try {
      final token = await Future.any<Result<String>?>([
        _auth.getIdToken(),
        signal.whenAborted.then((_) => null),
      ]);
      if (!_current(epoch) || signal.isAborted || token == null) {
        return const Failure(_unavailable);
      }
      if (token case Failure<String>(:final failure)) return Failure(failure);
      if (needsConsent && !_consentAllowed) return const Failure(_consent);
      if (needsPurposeConsent && !_purposeAllowed) {
        return const Failure(_consent);
      }
      admitted?.call();
      final result = await Future.any<Result<T>?>([
        run((token as Success<String>).value, signal),
        signal.whenAborted.then((_) => null),
      ]);
      return signal.isAborted || result == null
          ? const Failure(_unknown)
          : result;
    } catch (_) {
      return const Failure(_unknown);
    } finally {
      timer.cancel();
      signal.abort();
      _requests.remove(signal);
    }
  }

  Future<void> load() async {
    await readSettings();
    if (ref.mounted && state.authenticated) await readActive();
  }

  /// A new explicit entry from a currently visible saved-message snapshot.
  /// This clears local display retirement only, never grants Backend authority
  /// or releases an uncertain original command.
  void beginSourceReview() {
    if (state.authenticated &&
        _consentAllowed &&
        ref.read(contentAccessProvider).foreground) {
      state = state.copy(sourceUnavailable: false, clearFailure: true);
    }
  }

  void keepSourceReview(SavedFollowUpSource source, FollowUpTime time) {
    if (_current(_epoch) && _consentAllowed) {
      _review = (
        conversationId: source.conversationId,
        messageId: source.messageId,
        time: time,
      );
    }
  }

  FollowUpTime? reviewForSource(SavedFollowUpSource source) {
    if (!_current(_epoch) || !_consentAllowed) return null;
    final command = state.pendingIntent?.command;
    if (command != null &&
        command.conversationId == source.conversationId &&
        command.sourceMessageId == source.messageId) {
      return command.time;
    }
    final review = _review;
    return review != null &&
            review.conversationId == source.conversationId &&
            review.messageId == source.messageId
        ? review.time
        : null;
  }

  Future<void> readSettings() async {
    if (!state.authenticated || state.settingsBusy) return;
    final epoch = _epoch;
    state = state.copy(settingsBusy: true, clearFailure: true);
    final result = await _call(
      (token, abort) => _repository!.readSettings(token: token, abort: abort),
    );
    if (!_current(epoch)) return;
    state = switch (result) {
      Success<ProactiveSettings>(:final value) => state.copy(
        settings: value,
        settingsBusy: false,
        settingsUnconfirmed: false,
        settingsStale: false,
        clearFailure: true,
      ),
      Failure<ProactiveSettings>(:final failure) => _failed(
        state.copy(settingsBusy: false),
        failure,
      ),
    };
  }

  Future<void> readActive() async {
    if (!state.authenticated || state.intentsBusy) return;
    final epoch = _epoch;
    state = state.copy(intentsBusy: true);
    final result = await _call(
      (token, abort) =>
          _repository!.readActiveIntents(token: token, abort: abort),
    );
    if (!_current(epoch)) return;
    state = switch (result) {
      Success<List<FollowUpIntent>>(:final value) => state.copy(
        intents: value,
        intentsBusy: false,
        clearFailure: true,
      ),
      Failure<List<FollowUpIntent>>(:final failure) => _failed(
        state.copy(intentsBusy: false),
        failure,
      ),
    };
  }

  Future<void> changeMode(ProactiveMode mode, {String? confirmedZone}) async {
    if (!state.canChangeSettings) return;
    final current = state.settings!;
    final zone = confirmedZone ?? current.timeZone;
    if (zone.isEmpty ||
        (mode != ProactiveMode.off && !_purposeAllowed) ||
        (mode == ProactiveMode.on && !_consentAllowed)) {
      state = state.copy(failure: _consent);
      return;
    }
    final requested = ProactiveSettings(
      revision: current.revision,
      mode: mode,
      categories: mode == ProactiveMode.on
          ? const ['explicit_follow_up']
          : current.categories,
      timeZone: zone,
      quiet: current.quiet,
      maximumInRolling24h: 1,
      cooldownMinutes: 480,
      pushEnabled: current.pushEnabled,
      preview: current.preview,
    );
    final epoch = _epoch;
    state = state.copy(settingsBusy: true, clearFailure: true);
    final result = await _call(
      (token, abort) => _repository!.saveSettings(
        token: token,
        abort: abort,
        settings: requested,
        expectedRevision: current.revision,
      ),
      needsConsent: mode == ProactiveMode.on,
      needsPurposeConsent: mode != ProactiveMode.off,
      admitted: () => state = state.copy(settingsUnconfirmed: true),
    );
    if (!_current(epoch)) return;
    state = switch (result) {
      Success<ProactiveSettings>(:final value) => state.copy(
        settings: value,
        settingsBusy: false,
        settingsUnconfirmed: false,
        settingsStale: false,
        clearFailure: true,
      ),
      Failure<ProactiveSettings>(:final failure) => _failed(
        state.copy(
          settingsBusy: false,
          settingsUnconfirmed:
              state.settingsUnconfirmed && !_definiteRejection(failure),
          settingsStale:
              failure.kind ==
              AppFailureKind.proactiveRevisionPreconditionFailed,
        ),
        failure,
      ),
    };
    if (result is Success<ProactiveSettings>) {
      state = state.copy(clearIntents: true);
      unawaited(readActive());
    }
  }

  Future<FollowUpIntent?> schedule(
    SavedFollowUpSource source,
    FollowUpTime time,
  ) async {
    if (!state.canSchedule ||
        !_consentAllowed ||
        !time.dueAt.isUtc ||
        !time.dueAt.isAfter(_now()) ||
        time.timeZone != state.settings!.timeZone) {
      return null;
    }
    final command = CreateFollowUp(
      intentId: _ids.nextId(),
      conversationId: source.conversationId,
      sourceMessageId: source.messageId,
      time: time,
      expectedSettingsRevision: state.settings!.revision,
    );
    final epoch = _epoch;
    state = state.copy(intentsBusy: true, clearFailure: true);
    final result = await _call(
      (token, abort) => _repository!.createIntent(
        token: token,
        abort: abort,
        command: command,
      ),
      needsConsent: true,
      admitted: () => state = state.copy(
        pendingIntent: PendingFollowUp(
          intentId: command.intentId,
          command: command,
        ),
      ),
    );
    if (!_current(epoch)) return null;
    if (result case Success<FollowUpIntent>(:final value)) {
      _acceptIntent(value);
      return value;
    }
    final failure = (result as Failure<FollowUpIntent>).failure;
    state = _failed(
      state.copy(
        intentsBusy: false,
        clearPending: _definiteRejection(failure),
        settingsStale:
            failure.kind == AppFailureKind.proactiveRevisionPreconditionFailed,
      ),
      failure,
    );
    return null;
  }

  Future<FollowUpIntent?> checkPendingIntent() async {
    final pending = state.pendingIntent;
    if (pending == null || state.intentsBusy) return null;
    final epoch = _epoch;
    state = state.copy(intentsBusy: true, clearFailure: true);
    final result = await _call(
      (token, abort) => _repository!.readIntent(
        token: token,
        abort: abort,
        intentId: pending.intentId,
      ),
    );
    if (!_current(epoch)) return null;
    if (result case Success<FollowUpIntent>(:final value)) {
      if (value.intentId != pending.intentId ||
          (pending.command != null &&
              (value.conversationId != pending.command!.conversationId ||
                  value.dueAt != pending.command!.time.dueAt))) {
        state = state.copy(intentsBusy: false, failure: _unknown);
        return null;
      }
      _acceptIntent(value);
      return value;
    }
    state = _failed(
      state.copy(intentsBusy: false),
      (result as Failure<FollowUpIntent>).failure,
    );
    return null;
  }

  Future<void> cancel(FollowUpIntent intent) async {
    if (!state.authenticated ||
        state.intentsBusy ||
        state.pendingIntent != null ||
        state.intents == null ||
        !state.intents!.any(
          (v) => v.intentId == intent.intentId && v.revision == intent.revision,
        )) {
      return;
    }
    final epoch = _epoch;
    state = state.copy(intentsBusy: true, clearFailure: true);
    final result = await _call(
      (token, abort) => _repository!.cancelIntent(
        token: token,
        abort: abort,
        intentId: intent.intentId,
        expectedRevision: intent.revision,
      ),
      admitted: () => state = state.copy(
        pendingIntent: PendingFollowUp(intentId: intent.intentId),
      ),
    );
    if (!_current(epoch)) return;
    if (result case Success<FollowUpIntent>(:final value)) {
      _acceptIntent(value);
      return;
    }
    final failure = (result as Failure<FollowUpIntent>).failure;
    state = _failed(
      state.copy(intentsBusy: false, clearPending: _definiteRejection(failure)),
      failure,
    );
  }

  void _acceptIntent(FollowUpIntent value) {
    _review = null;
    state = state.copy(
      clearIntents: true,
      lastIntent: value,
      intentsBusy: false,
      clearPending: true,
      clearFailure: true,
    );
    unawaited(readActive());
  }

  ProactiveState _failed(ProactiveState next, AppFailure failure) {
    if ({
      AppFailureKind.authRequired,
      AppFailureKind.authForbidden,
    }.contains(failure.kind)) {
      _review = null;
      return ProactiveState(
        sessionKey: next.sessionKey,
        authenticated: false,
        pendingIntent: next.pendingIntent,
        settingsUnconfirmed: next.settingsUnconfirmed,
        failure: failure,
        sourceUnavailable: true,
      );
    }
    final lost = {
      AppFailureKind.authRequired,
      AppFailureKind.authForbidden,
      AppFailureKind.aiContextNotPermitted,
      AppFailureKind.aiSourceUnavailable,
      AppFailureKind.aiAuthorityChanged,
    }.contains(failure.kind);
    return next.copy(
      failure: failure,
      sourceUnavailable: next.sourceUnavailable || lost,
    );
  }
}

bool _definiteRejection(AppFailure f) => {
  AppFailureKind.requestInvalid,
  AppFailureKind.proactiveInputInvalid,
  AppFailureKind.proactiveRevisionPreconditionFailed,
  AppFailureKind.aiSourceUnavailable,
  AppFailureKind.aiContextNotPermitted,
  AppFailureKind.authRequired,
  AppFailureKind.authForbidden,
}.contains(f.kind);
const _authRequired = AppFailure(
  kind: AppFailureKind.authRequired,
  message: 'Sign in again.',
);
const _configuration = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'Follow-ups are not configured.',
);
const _unknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'The result is not confirmed. Check the original request.',
);
const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Follow-ups could not be checked.',
);
const _consent = AppFailure(
  kind: AppFailureKind.aiContextNotPermitted,
  message: 'Check AI data-use permission before continuing.',
);
