import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../account/account_preferences_providers.dart';
import '../account/content_access.dart';
import '../account/domain/account_repository.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import '../check_in/check_in_providers.dart';
import '../check_in/domain/check_in_repository.dart';
import 'ai_conversation_providers.dart';
import 'domain/ai_selected_reply.dart';

/// This projection deliberately has no location, weather or visibility fields.
/// A readable record is not itself permission to use it in a model request.
final class AiSelectedCheckIn {
  const AiSelectedCheckIn({
    required this.id,
    required this.note,
    required this.occurredAt,
    required this.revision,
    this.mood,
    this.activity,
  });
  factory AiSelectedCheckIn.fromRecord(CheckIn record) => AiSelectedCheckIn(
    id: record.checkInId,
    note: record.note,
    occurredAt: record.createdAt.toUtc(),
    revision: record.revision,
    mood: record.mood,
    activity: record.activity,
  );
  final String id, note;
  final String? mood, activity;
  final DateTime occurredAt;
  final int revision;
  bool sameVersion(AiSelectedCheckIn other) =>
      id == other.id &&
      revision == other.revision &&
      note == other.note &&
      mood == other.mood &&
      activity == other.activity &&
      occurredAt == other.occurredAt;
}

enum AiReferenceMode { manual, today, off }

/// Root composition enables the approved automatic-day contract explicitly.
/// A missing repository capability then fails closed instead of using history.
final aiTodayReferencesEnabledProvider = Provider<bool>((ref) => false);

final aiTodayTimeZoneProvider = Provider<Future<Result<String>> Function()>(
  (ref) =>
      () async => const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'The current IANA time zone could not be verified.',
        ),
      ),
);

enum AiSelectionNotice {
  none,
  limit,
  recheck,
  changed,
  unavailable,
  unknown,
  conflict,
  expired,
  pastPairsChanged,
}

final class AiSelectedSourcesState {
  AiSelectedSourcesState({
    required this.sessionKey,
    required this.conversationId,
    required this.permitted,
    Iterable<AiSelectedCheckIn> records = const [],
    Iterable<String> selectedIds = const [],
    Map<String, String> cursors = const {},
    Iterable<String> failedDates = const [],
    this.loaded = false,
    this.busy = false,
    this.active = false,
    this.confirmed = false,
    this.sending = false,
    this.review,
    Iterable<String> excludedHistoryKeys = const [],
    this.notice = AiSelectionNotice.none,
    this.mode = AiReferenceMode.manual,
    this.automaticAvailable = false,
    this.today,
    this.reviewRequired = false,
    Iterable<String> excludedCheckInIds = const [],
    Iterable<String> automaticIds = const [],
  }) : records = List.unmodifiable(records),
       selectedIds = Set.unmodifiable(selectedIds),
       cursors = Map.unmodifiable(cursors),
       failedDates = Set.unmodifiable(failedDates),
       excludedHistoryKeys = Set.unmodifiable(excludedHistoryKeys),
       excludedCheckInIds = Set.unmodifiable(excludedCheckInIds),
       automaticIds = Set.unmodifiable(automaticIds);
  final Object sessionKey;
  final String? conversationId;
  final bool permitted, loaded, busy, active, confirmed, sending;
  final List<AiSelectedCheckIn> records;
  final Set<String> selectedIds, failedDates, excludedHistoryKeys;
  final Map<String, String> cursors;
  // Sanitized prepare metadata, never the operation key or original auth token.
  final AiPreparedReplySelection? review;
  final AiSelectionNotice notice;
  final AiReferenceMode mode;
  final bool automaticAvailable, reviewRequired;
  final AiTodayContext? today;
  final Set<String> excludedCheckInIds, automaticIds;
}

final aiSelectedSourcesControllerProvider =
    NotifierProvider<AiSelectedSourcesController, AiSelectedSourcesState>(
      AiSelectedSourcesController.new,
    );

class AiSelectedSourcesController extends Notifier<AiSelectedSourcesState> {
  late CheckInRepository _repository;
  late AiConversationController _conversation;
  late DateTime Function() _now;
  late Future<Result<String>> Function() _readTimeZone;
  bool _automaticAvailable = false,
      _topicUsesToday = true,
      _reviewRequired = false;
  AiReferenceMode _mode = AiReferenceMode.manual;
  AiTodayContext? _today;
  final _automaticIds = <String>{}, _excludedCheckIns = <String>{};
  late Object _session;
  Object? _scope;
  String? _topic;
  Object _epoch = Object();
  int _command = 0;
  bool _loaded = false,
      _busy = false,
      _active = false,
      _confirmed = false,
      _sending = false,
      _recoveringSelected = false;
  final _records = <String, AiSelectedCheckIn>{};
  final _selected = <String>{}, _failedDates = <String>{};
  final _cursors = <String, String>{};
  final _usedCursors = <String, Set<String>>{};
  AiPreparedReplySelection? _review;
  Set<String> _excludedHistory = {};
  List<_HistoryIdentity> _excludedHistoryIntent = const [];
  AiSelectionNotice _notice = AiSelectionNotice.none;

  @override
  AiSelectedSourcesState build() {
    _epoch = Object();
    _command++;
    _repository = ref.watch(checkInRepositoryProvider);
    _now = ref.watch(aiConversationUtcNowProvider);
    _readTimeZone = ref.watch(aiTodayTimeZoneProvider);
    _automaticAvailable =
        ref.watch(aiTodayReferencesEnabledProvider) &&
        ref.watch(aiCompanionReferencesEnabledProvider);
    _conversation = ref.read(aiConversationControllerProvider.notifier);
    final ai = ref.read(aiConversationControllerProvider);
    _session = ai.sessionKey;
    _scope = ai.contextScopeKey;
    _topic = ai.conversationId;
    _reset();
    ref.listen(aiConversationControllerProvider, (before, after) {
      if (_privateViewHidden(after.phase)) {
        _epoch = Object();
        _command++;
        _reset();
        _emit();
        return;
      }
      if (after.sessionKey != _session || after.contextScopeKey != _scope) {
        _epoch = Object();
        _command++;
        _session = after.sessionKey;
        _scope = after.contextScopeKey;
        _topic = after.conversationId;
        _reset();
        _emit();
        return;
      }
      if (after.conversationId != _topic) {
        final expectedOperation = _sending || _recoveringSelected;
        _topic = after.conversationId;
        if (!expectedOperation) {
          _epoch = Object();
          _command++;
          _reset();
          _emit();
          return;
        }
      }
      if (_recoveringSelected &&
          after.phase == AiConversationPhase.success &&
          !after.canCancel &&
          !after.canLeaveWithoutRetrying) {
        _clearAccepted();
        _emit();
        return;
      }
      if (!_sending &&
          _review != null &&
          after.selectedPreparationRevision != _review!.selectionRevision) {
        _review = null;
        _confirmed = false;
        _excludedHistory = {};
        _notice = AiSelectionNotice.expired;
        _emit();
      }
    });
    ref.listen(contentAccessProvider, (_, _) {
      _epoch = Object();
      _command++;
      _records.clear();
      _today = null;
      _automaticIds.clear();
      _cursors.clear();
      _usedCursors.clear();
      _failedDates.clear();
      _loaded = false;
      _busy = false;
      // The retiring await cannot update this epoch. Original-operation
      // recovery remains owned by the AI controller and _recoveringSelected.
      _sending = false;
      _retireReview();
      _notice = AiSelectionNotice.recheck;
      _emit();
    });
    ref.listen(accountSettingsSnapshotProvider, (_, next) {
      if (next?.consent != OptionalProcessingConsent.accepted) {
        _epoch = Object();
        _command++;
        _reset();
        _conversation.discardSelectedPreparation();
        _emit();
      } else {
        _emit();
      }
    });
    ref.onDispose(() {
      _epoch = Object();
      _command++;
    });
    return _snapshot();
  }

  bool get _permitted =>
      ref.read(aiCompanionReferencesEnabledProvider) &&
      !_privateViewHidden(ref.read(aiConversationControllerProvider).phase) &&
      ref.read(authSessionProvider).asData?.value is AuthSessionAuthenticated &&
      ref.read(contentAccessProvider).foreground &&
      ref.read(accountSettingsSnapshotProvider)?.consent ==
          OptionalProcessingConsent.accepted;
  bool _current(Object epoch, int command) =>
      ref.mounted &&
      identical(_epoch, epoch) &&
      _command == command &&
      _permitted &&
      ref.read(aiConversationControllerProvider).sessionKey == _session;
  bool _eligible(AiSelectedCheckIn record, DateTime now) =>
      !record.occurredAt.isBefore(now.subtract(const Duration(days: 7))) &&
      !record.occurredAt.isAfter(now);
  AiSelectedSourcesState _snapshot() {
    final records = _records.values.toList()
      ..sort((a, b) {
        final time = b.occurredAt.compareTo(a.occurredAt);
        return time == 0
            ? (_mode == AiReferenceMode.today
                  ? b.id.compareTo(a.id)
                  : a.id.compareTo(b.id))
            : time;
      });
    return AiSelectedSourcesState(
      sessionKey: _session,
      conversationId: _topic,
      permitted: _permitted,
      records: records,
      selectedIds: _selected,
      cursors: _cursors,
      failedDates: _failedDates,
      loaded: _loaded,
      busy: _busy,
      active: _active,
      confirmed: _confirmed,
      sending: _sending,
      review: _review,
      excludedHistoryKeys: _excludedHistory,
      notice: _notice,
      mode: _mode,
      automaticAvailable: _automaticAvailable,
      today: _today,
      excludedCheckInIds: _excludedCheckIns,
      automaticIds: _automaticIds,
      reviewRequired: _reviewRequired,
    );
  }

  void _emit() {
    if (ref.mounted) state = _snapshot();
  }

  void _reset() {
    _records.clear();
    _selected.clear();
    _cursors.clear();
    _usedCursors.clear();
    _failedDates.clear();
    _loaded = false;
    _busy = false;
    _topicUsesToday = true;
    _mode = _automaticAvailable
        ? AiReferenceMode.today
        : AiReferenceMode.manual;
    _active = _automaticAvailable;
    _today = null;
    _automaticIds.clear();
    _excludedCheckIns.clear();
    _confirmed = false;
    _sending = false;
    _recoveringSelected = false;
    _review = null;
    _excludedHistory = {};
    _excludedHistoryIntent = const [];
    _reviewRequired = false;
    _notice = AiSelectionNotice.none;
  }

  void _retireReview() {
    _review = null;
    _confirmed = false;
    _excludedHistory = {};
    _conversation.discardSelectedPreparation();
  }

  void _clearAccepted() {
    _selected.clear();
    _active = _automaticAvailable;
    _mode = _automaticAvailable
        ? (_topicUsesToday ? AiReferenceMode.today : AiReferenceMode.off)
        : AiReferenceMode.manual;
    _today = null;
    _automaticIds.clear();
    if (_automaticAvailable) _records.clear();
    _confirmed = false;
    _review = null;
    _excludedHistory = {};
    _excludedHistoryIntent = const [];
    _reviewRequired = false;
    _sending = false;
    _recoveringSelected = false;
    _notice = AiSelectionNotice.none;
  }

  bool _retireAuthFailure(AppFailure failure) {
    if (!{
      AppFailureKind.authRequired,
      AppFailureKind.authForbidden,
      AppFailureKind.aiContextNotPermitted,
    }.contains(failure.kind)) {
      return false;
    }
    _epoch = Object();
    _command++;
    _reset();
    _conversation.referenceAuthFailed(failure);
    _emit();
    return true;
  }

  Future<Result<CheckInHistoryPage>> _readDate(
    String date,
    String? cursor,
  ) async {
    try {
      return await _repository
          .readOwnForDate(date: date, timeZone: 'UTC', cursor: cursor)
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () => const Failure(_readUnknown),
          );
    } catch (_) {
      return const Failure(_readUnknown);
    }
  }

  Future<Result<AiSelectedCheckIn>> _readOne(String id) async {
    try {
      final result = await _repository
          .readOwned(checkInId: id)
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () => const Failure(_readUnknown),
          );
      return switch (result) {
        Success<CheckIn>(:final value) when value.checkInId == id => Success(
          AiSelectedCheckIn.fromRecord(value),
        ),
        Failure<CheckIn>(:final failure) => Failure(failure),
        _ => const Failure(_readUnknown),
      };
    } catch (_) {
      return const Failure(_readUnknown);
    }
  }

  /// UTC day partitions are a retrieval bound, not a chosen user time zone.
  /// Eight first pages cover an inclusive rolling seven-day interval.
  Future<void> loadRecent({bool refresh = false}) async {
    if (!_permitted || _busy || _sending || (_loaded && !refresh)) return;
    _busy = true;
    _retireReview();
    _emit();
    final epoch = _epoch, command = ++_command, now = _now().toUtc();
    final today = DateTime.utc(now.year, now.month, now.day);
    final dates = [
      for (var day = 0; day <= 7; day++)
        today.subtract(Duration(days: day)).toIso8601String().substring(0, 10),
    ];
    final results = await Future.wait([
      for (final date in dates) _readDate(date, null),
    ]);
    if (!_current(epoch, command)) return;
    for (final result in results) {
      if (result is Failure<CheckInHistoryPage> &&
          _retireAuthFailure(result.failure)) {
        return;
      }
    }
    _records.clear();
    _cursors.clear();
    _usedCursors.clear();
    _failedDates.clear();
    for (var i = 0; i < dates.length; i++) {
      _acceptPage(dates[i], null, results[i], now);
    }
    _loaded = true;
    _busy = false;
    _notice = _failedDates.isEmpty
        ? AiSelectionNotice.none
        : AiSelectionNotice.unknown;
    _emit();
  }

  void _acceptPage(
    String date,
    String? cursor,
    Result<CheckInHistoryPage> result,
    DateTime now,
  ) {
    switch (result) {
      case Failure<CheckInHistoryPage>():
        _failedDates.add(date);
      case Success<CheckInHistoryPage>(:final value):
        if (value.nextCursor != null &&
            (value.nextCursor == cursor ||
                (_usedCursors[date]?.contains(value.nextCursor) ?? false))) {
          _failedDates.add(date);
          return;
        }
        for (final raw in value.checkIns) {
          final record = AiSelectedCheckIn.fromRecord(raw);
          if (_eligible(record, now)) _records[record.id] = record;
        }
        if (cursor != null) (_usedCursors[date] ??= <String>{}).add(cursor);
        _failedDates.remove(date);
        if (value.nextCursor == null) {
          _cursors.remove(date);
        } else {
          _cursors[date] = value.nextCursor!;
        }
    }
  }

  Future<void> loadMore(String date) async {
    final cursor = _cursors[date];
    if (!_permitted || _busy || _sending || cursor == null) return;
    _busy = true;
    _retireReview();
    _emit();
    final epoch = _epoch, command = ++_command;
    final result = await _readDate(date, cursor);
    if (!_current(epoch, command)) return;
    if (result is Failure<CheckInHistoryPage> &&
        _retireAuthFailure(result.failure)) {
      return;
    }
    _acceptPage(date, cursor, result, _now().toUtc());
    _busy = false;
    _notice = _failedDates.isEmpty
        ? AiSelectionNotice.none
        : AiSelectionNotice.unknown;
    _emit();
  }

  void toggle(String id) {
    if (!_permitted || _busy || _sending) return;
    if (_selected.contains(id)) {
      _selected.remove(id);
    } else {
      final record = _records[id];
      if (record == null || !_eligible(record, _now().toUtc())) return;
      if (_selected.length >= 5) {
        _notice = AiSelectionNotice.limit;
        _emit();
        return;
      }
      _selected.add(id);
    }
    _active = true;
    _mode = AiReferenceMode.manual;
    _retireReview();
    _notice = AiSelectionNotice.recheck;
    _emit();
  }

  /// Only an explicit owned-record action may seed one ID, after exact read.
  Future<void> chooseOwned(String id) async {
    if (!_permitted || _busy || _sending || _selected.contains(id)) return;
    if (_selected.length >= 5) {
      _notice = AiSelectionNotice.limit;
      _emit();
      return;
    }
    _busy = true;
    _retireReview();
    _emit();
    final epoch = _epoch, command = ++_command;
    final result = await _readOne(id);
    if (!_current(epoch, command)) return;
    if (result is Failure<AiSelectedCheckIn> &&
        _retireAuthFailure(result.failure)) {
      return;
    }
    _busy = false;
    if (result case Success<AiSelectedCheckIn>(:final value)
        when _eligible(value, _now().toUtc())) {
      _records[id] = value;
      _selected.add(id);
      _active = true;
      _mode = AiReferenceMode.manual;
      _notice = AiSelectionNotice.recheck;
    } else {
      _records.remove(id);
      _notice =
          result is Failure<AiSelectedCheckIn> &&
              result.failure.kind != AppFailureKind.checkInUnavailable
          ? AiSelectionNotice.unknown
          : AiSelectionNotice.unavailable;
    }
    _emit();
  }

  Future<Map<String, AiSelectedCheckIn>?> _readSelected(
    Object epoch,
    int command,
    List<String> ids, {
    bool enforceWindow = true,
  }) async {
    final results = await Future.wait([for (final id in ids) _readOne(id)]);
    if (!_current(epoch, command)) return null;
    for (final result in results) {
      if (result is Failure<AiSelectedCheckIn> &&
          _retireAuthFailure(result.failure)) {
        return null;
      }
    }
    final current = <String, AiSelectedCheckIn>{};
    var failed = false, unknown = false;
    for (var i = 0; i < ids.length; i++) {
      if (results[i] case Success<AiSelectedCheckIn>(:final value)
          when !enforceWindow || _eligible(value, _now().toUtc())) {
        current[ids[i]] = value;
        _records[ids[i]] = value;
      } else {
        _records.remove(ids[i]);
        failed = true;
        final result = results[i];
        if (result is Failure<AiSelectedCheckIn> &&
            result.failure.kind != AppFailureKind.checkInUnavailable) {
          unknown = true;
        }
      }
    }
    if (failed) {
      _notice = unknown
          ? AiSelectionNotice.unknown
          : AiSelectionNotice.unavailable;
      return null;
    }
    return current;
  }

  Future<void> review({
    bool excludeDisplayedHistory = false,
    String? expectedRevision,
  }) async {
    if (expectedRevision != null &&
        _review?.selectionRevision != expectedRevision) {
      return;
    }
    final ai = ref.read(aiConversationControllerProvider);
    if (!_permitted || _busy || _sending || (!ai.canSend && !ai.canRetry)) {
      return;
    }
    final oldPairs = excludeDisplayedHistory
        ? _review?.historyPairs.map(_historyIdentity).toList()
        : _excludedHistoryIntent;
    if (excludeDisplayedHistory && (oldPairs == null || oldPairs.isEmpty)) {
      return;
    }
    if (excludeDisplayedHistory) {
      _excludedHistoryIntent = List.unmodifiable(oldPairs!);
    }
    _busy = true;
    _active = true;
    _retireReview();
    _emit();
    final epoch = _epoch, command = ++_command;
    final ids = _mode == AiReferenceMode.manual
        ? _selected.toList()
        : <String>[];
    final before = _mode == AiReferenceMode.manual
        ? await _readSelected(epoch, command, ids)
        : <String, AiSelectedCheckIn>{};
    if (!_current(epoch, command)) return;
    if (before == null) {
      _busy = false;
      _emit();
      return;
    }
    Result<AiPreparedReplySelection> result;
    if (_mode == AiReferenceMode.today) {
      _today = null;
      _automaticIds.clear();
      _records.clear();
      Result<String> zone;
      try {
        zone = await _readTimeZone().timeout(const Duration(seconds: 15));
      } catch (_) {
        zone = const Failure(_readUnknown);
      }
      if (!_current(epoch, command)) return;
      if (zone case Failure<String>()) {
        _busy = false;
        _notice = AiSelectionNotice.unknown;
        _emit();
        return;
      }
      result = await _conversation.prepareTodaySources(
        (zone as Success<String>).value,
      );
    } else {
      result = await _conversation.prepareSelectedSources(ids);
    }
    if (!_current(epoch, command)) return;
    if (result case Failure<AiPreparedReplySelection>(:final failure)) {
      _busy = false;
      if (failure.kind == AppFailureKind.aiContextSelectionConflict) {
        _reviewRequired = true;
      }
      _notice = failure.kind == AppFailureKind.aiContextSelectionConflict
          ? AiSelectionNotice.conflict
          : AiSelectionNotice.unknown;
      _emit();
      return;
    }
    final prepared = (result as Success<AiPreparedReplySelection>).value;
    final after = _mode == AiReferenceMode.manual
        ? await _readSelected(epoch, command, ids)
        : <String, AiSelectedCheckIn>{};
    if (!_current(epoch, command)) return;
    _busy = false;
    if (after == null ||
        !_conversation.hasSelectedPreparation(prepared.selectionRevision)) {
      _retireReview();
      if (after != null) _notice = AiSelectionNotice.expired;
      _emit();
      return;
    }
    if (ids.any((id) => !before[id]!.sameVersion(after[id]!))) {
      _retireReview();
      _notice = AiSelectionNotice.changed;
      _reviewRequired = true;
      _emit();
      return;
    }
    _review = prepared;
    _today = prepared.today;
    if (prepared.today != null) {
      _automaticIds
        ..clear()
        ..addAll(prepared.sourceCards.map((card) => card.checkInId!));
    }
    _confirmed = false;
    if (oldPairs != null &&
        oldPairs.isNotEmpty &&
        _sameHistoryIntent(oldPairs, prepared.historyPairs)) {
      _excludedHistory = prepared.historyPairs
          .map((pair) => pair.historyKey)
          .toSet();
      _notice = AiSelectionNotice.recheck;
    } else {
      _excludedHistory = {};
      _notice = oldPairs == null || oldPairs.isEmpty
          ? AiSelectionNotice.none
          : AiSelectionNotice.pastPairsChanged;
      if (_notice == AiSelectionNotice.pastPairsChanged) _reviewRequired = true;
    }
    _emit();
  }

  void confirm(String expectedRevision) {
    final review = _review;
    if (!_permitted ||
        _busy ||
        _sending ||
        review == null ||
        review.selectionRevision != expectedRevision ||
        !_conversation.hasSelectedPreparation(review.selectionRevision)) {
      return;
    }
    if (_notice == AiSelectionNotice.pastPairsChanged) {
      _excludedHistoryIntent = const [];
    }
    _confirmed = true;
    _reviewRequired = false;
    _notice = AiSelectionNotice.none;
    _emit();
  }

  void editSelection() {
    if (_sending) return;
    // Leaving a read/review abandons only its local result, never a Send.
    _command++;
    _busy = false;
    _retireReview();
    _notice = AiSelectionNotice.recheck;
    _emit();
  }

  void setTodayEnabled(bool enabled) {
    if (!_automaticAvailable || !_permitted || _busy || _sending) return;
    _topicUsesToday = enabled;
    _mode = enabled ? AiReferenceMode.today : AiReferenceMode.off;
    _selected.clear();
    _active = true;
    _today = null;
    _automaticIds.clear();
    _records.clear();
    _retireReview();
    _notice = AiSelectionNotice.none;
    _emit();
  }

  void toggleTodaySource(String id) {
    if (!_permitted ||
        _busy ||
        _sending ||
        _mode != AiReferenceMode.today ||
        (!_automaticIds.contains(id) && !_excludedCheckIns.contains(id))) {
      return;
    }
    if (!_excludedCheckIns.remove(id)) _excludedCheckIns.add(id);
    _retireReview();
    _notice = AiSelectionNotice.none;
    _emit();
  }

  Future<void> previewToday() async {
    if (_mode != AiReferenceMode.today || !canSubmit) return;
    await review();
    final prepared = _review;
    if (!ref.mounted ||
        prepared?.today == null ||
        _busy ||
        _sending ||
        !_permitted) {
      return;
    }
    _busy = true;
    _emit();
    final epoch = _epoch, command = ++_command;
    final ids = prepared!.sourceCards.map((card) => card.checkInId!).toList();
    await _readSelected(epoch, command, ids, enforceWindow: false);
    if (!_current(epoch, command)) return;
    _busy = false;
    _emit();
  }

  bool get canSend {
    final review = _review;
    return _permitted &&
        !_busy &&
        !_sending &&
        _confirmed &&
        review != null &&
        _conversation.hasSelectedPreparation(review.selectionRevision) &&
        _selected.every(
          (id) =>
              _records[id] != null && _eligible(_records[id]!, _now().toUtc()),
        );
  }

  /// Button availability describes an explicit Send action, not whether a
  /// short-lived preparation was completed in a separate reference screen.
  bool get canSubmit => _permitted && !_busy && !_sending;

  Future<void> submit(String text) async {
    if (!canSubmit || !_conversation.validateSelectedInput(text)) return;
    if (_mode != AiReferenceMode.manual || !canSend) {
      final epoch = _epoch;
      await review();
      if (!ref.mounted ||
          !identical(epoch, _epoch) ||
          !canSubmit ||
          _review == null ||
          _reviewRequired ||
          _notice == AiSelectionNotice.pastPairsChanged) {
        return;
      }
      confirm(_review!.selectionRevision);
    }
    await send(text);
  }

  Future<void> send(String text) async {
    final ai = ref.read(aiConversationControllerProvider);
    if (!canSend || (!ai.canSend && !ai.canRetry)) return;
    final review = _review!,
        ids = _review!.today != null
            ? _review!.sourceCards.map((card) => card.checkInId!).toList()
            : (_mode == AiReferenceMode.off ? <String>[] : _selected.toList()),
        excluded = _excludedHistory.toList();
    _sending = true;
    _recoveringSelected = true;
    _confirmed = false;
    _emit();
    final sent = _conversation.sendSelected(
      text,
      selectionRevision: review.selectionRevision,
      sourceIds: ids,
      excludedHistoryKeys: excluded,
      excludedSourceIds: review.today == null
          ? const []
          : ids.where(_excludedCheckIns.contains).toList(),
    );
    final admitted = ref.read(aiConversationControllerProvider).canCancel;
    _review = null;
    _excludedHistory = {};
    if (!admitted) {
      _conversation.discardSelectedPreparation();
      _sending = false;
      _recoveringSelected = false;
      _notice = AiSelectionNotice.recheck;
      _emit();
      return;
    }
    final epoch = _epoch;
    await sent;
    if (!ref.mounted || !identical(epoch, _epoch)) return;
    _sending = false;
    final after = ref.read(aiConversationControllerProvider);
    if (after.phase == AiConversationPhase.success) {
      _clearAccepted();
    } else {
      if ({
        AppFailureKind.aiSourceUnavailable,
        AppFailureKind.aiAuthorityChanged,
        AppFailureKind.aiContextSelectionConflict,
      }.contains(after.failureKind)) {
        _reviewRequired = true;
        _records.clear();
        _loaded = false;
      }
      _notice = after.failureKind == AppFailureKind.aiContextSelectionConflict
          ? AiSelectionNotice.conflict
          : AiSelectionNotice.unknown;
    }
    _emit();
  }
}

typedef _HistoryIdentity = ({
  String userId,
  String assistantId,
  int userSequence,
  int assistantSequence,
});
_HistoryIdentity _historyIdentity(AiPreparedHistoryPair pair) => (
  userId: pair.userMessageId,
  assistantId: pair.assistantMessageId,
  userSequence: pair.userSequence,
  assistantSequence: pair.assistantSequence,
);
bool _sameHistoryIntent(
  List<_HistoryIdentity> a,
  List<AiPreparedHistoryPair> b,
) =>
    a.length == b.length &&
    List.generate(
      a.length,
      (i) =>
          a[i].userId == b[i].userMessageId &&
          a[i].assistantId == b[i].assistantMessageId &&
          a[i].userSequence == b[i].userSequence &&
          a[i].assistantSequence == b[i].assistantSequence,
    ).every((same) => same);

const _readUnknown = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The selected source could not be verified.',
);

bool _privateViewHidden(AiConversationPhase phase) => {
  AiConversationPhase.unauthenticated,
  AiConversationPhase.limited,
  AiConversationPhase.authorityChanged,
  AiConversationPhase.deleting,
  AiConversationPhase.deleteUnknown,
  AiConversationPhase.deleted,
}.contains(phase);
