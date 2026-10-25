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
  }) : records = List.unmodifiable(records),
       selectedIds = Set.unmodifiable(selectedIds),
       cursors = Map.unmodifiable(cursors),
       failedDates = Set.unmodifiable(failedDates),
       excludedHistoryKeys = Set.unmodifiable(excludedHistoryKeys);
  final Object sessionKey;
  final String? conversationId;
  final bool permitted, loaded, busy, active, confirmed, sending;
  final List<AiSelectedCheckIn> records;
  final Set<String> selectedIds, failedDates, excludedHistoryKeys;
  final Map<String, String> cursors;
  // Sanitized prepare metadata, never the operation key or original auth token.
  final AiPreparedReplySelection? review;
  final AiSelectionNotice notice;
}

final aiSelectedSourcesControllerProvider =
    NotifierProvider<AiSelectedSourcesController, AiSelectedSourcesState>(
      AiSelectedSourcesController.new,
    );

class AiSelectedSourcesController extends Notifier<AiSelectedSourcesState> {
  late CheckInRepository _repository;
  late AiConversationController _conversation;
  late DateTime Function() _now;
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
  AiSelectionNotice _notice = AiSelectionNotice.none;

  @override
  AiSelectedSourcesState build() {
    _epoch = Object();
    _command++;
    _repository = ref.watch(checkInRepositoryProvider);
    _now = ref.watch(aiConversationUtcNowProvider);
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
        return time == 0 ? a.id.compareTo(b.id) : time;
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
    _active = false;
    _confirmed = false;
    _sending = false;
    _recoveringSelected = false;
    _review = null;
    _excludedHistory = {};
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
    _active = false;
    _confirmed = false;
    _review = null;
    _excludedHistory = {};
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
    List<String> ids,
  ) async {
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
          when _eligible(value, _now().toUtc())) {
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
    final oldPairs = excludeDisplayedHistory ? _review?.historyPairs : null;
    if (excludeDisplayedHistory && (oldPairs == null || oldPairs.isEmpty)) {
      return;
    }
    _busy = true;
    _active = true;
    _retireReview();
    _emit();
    final epoch = _epoch, command = ++_command, ids = _selected.toList();
    final before = await _readSelected(epoch, command, ids);
    if (!_current(epoch, command)) return;
    if (before == null) {
      _busy = false;
      _emit();
      return;
    }
    final result = await _conversation.prepareSelectedSources(ids);
    if (!_current(epoch, command)) return;
    if (result case Failure<AiPreparedReplySelection>(:final failure)) {
      _busy = false;
      _notice = failure.kind == AppFailureKind.aiContextSelectionConflict
          ? AiSelectionNotice.conflict
          : AiSelectionNotice.unknown;
      _emit();
      return;
    }
    final prepared = (result as Success<AiPreparedReplySelection>).value;
    final after = await _readSelected(epoch, command, ids);
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
      _emit();
      return;
    }
    _review = prepared;
    _confirmed = false;
    if (oldPairs != null && _samePairs(oldPairs, prepared.historyPairs)) {
      _excludedHistory = prepared.historyPairs
          .map((pair) => pair.historyKey)
          .toSet();
      _notice = AiSelectionNotice.recheck;
    } else {
      _excludedHistory = {};
      _notice = oldPairs == null
          ? AiSelectionNotice.none
          : AiSelectionNotice.pastPairsChanged;
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
    _confirmed = true;
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

  Future<void> send(String text) async {
    final ai = ref.read(aiConversationControllerProvider);
    if (!canSend || (!ai.canSend && !ai.canRetry)) return;
    final review = _review!,
        ids = _selected.toList(),
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

bool _samePairs(List<AiPreparedHistoryPair> a, List<AiPreparedHistoryPair> b) =>
    a.length == b.length &&
    List.generate(
      a.length,
      (i) =>
          a[i].userMessageId == b[i].userMessageId &&
          a[i].assistantMessageId == b[i].assistantMessageId &&
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
