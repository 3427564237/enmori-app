import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';
import '../history_device_port.dart';

enum CheckInSearchPhase { idle, searching, stopped, failed, complete }

final class CheckInSearchMatch {
  const CheckInSearchMatch(this.record, this.localTime, [this.civilDate]);
  final CheckIn record;
  final String localTime;
  final String? civilDate;
}

final class CheckInSearchState {
  const CheckInSearchState({
    this.phase = CheckInSearchPhase.idle,
    this.matches = const [],
    this.daysRead = 0,
    this.totalDays = 0,
    this.recordsRead = 0,
    this.zone,
    this.failure,
  });
  final CheckInSearchPhase phase;
  final List<CheckInSearchMatch> matches;
  final int daysRead, totalDays, recordsRead;
  final String? zone;
  final AppFailure? failure;
}

final checkInSearchProvider =
    NotifierProvider.autoDispose<CheckInSearchController, CheckInSearchState>(
      CheckInSearchController.new,
    );

final class CheckInSearchController extends Notifier<CheckInSearchState> {
  late CheckInRepository _repository;
  late HistoryDevicePort _device;
  int _generation = 0;
  DateTime? _first, _day;
  String? _zone, _cursor;
  String _query = '';
  bool _allRecords = false;
  final _seenCursors = <String>{};
  bool _canResume = false;

  @override
  CheckInSearchState build() {
    ref.watch(authSessionProvider);
    ref.watch(contentAccessProvider);
    _repository = ref.watch(checkInRepositoryProvider);
    _device = ref.watch(historyDevicePortProvider);
    _generation++;
    _canResume = false;
    _first = _day = null;
    _zone = _cursor = null;
    _seenCursors.clear();
    ref.onDispose(() => _generation++);
    return const CheckInSearchState();
  }

  bool get canResume => _canResume;
  bool _current(int generation) =>
      ref.mounted &&
      generation == _generation &&
      ref.read(currentAuthSubjectProvider) != null &&
      ref.read(contentAccessProvider).foreground;

  void clear() {
    _generation++;
    _canResume = false;
    state = const CheckInSearchState();
  }

  void stop() {
    if (state.phase != CheckInSearchPhase.searching) return;
    _generation++;
    _publish(CheckInSearchPhase.stopped);
  }

  void _publish(
    CheckInSearchPhase phase, {
    List<CheckInSearchMatch>? matches,
    int? days,
    int? records,
    AppFailure? failure,
  }) {
    state = CheckInSearchState(
      phase: phase,
      matches: matches ?? state.matches,
      daysRead: days ?? state.daysRead,
      totalDays: state.totalDays,
      recordsRead: records ?? state.recordsRead,
      zone: _zone,
      failure: failure,
    );
  }

  Future<void> start(
    String query,
    DateTime first,
    DateTime last, {
    bool allRecords = false,
    String? capturedZone,
  }) async {
    _allRecords = allRecords;
    final generation = ++_generation;
    _canResume = false;
    _first = DateTime.utc(first.year, first.month, first.day);
    _day = DateTime.utc(last.year, last.month, last.day);
    _query = query.trim().toLowerCase();
    _cursor = _zone = null;
    _seenCursors.clear();
    if (!_current(generation)) {
      state = const CheckInSearchState();
      return;
    }
    if ((!_allRecords && _query.isEmpty) || _day!.isBefore(_first!)) return;
    state = CheckInSearchState(
      phase: CheckInSearchPhase.searching,
      totalDays: _day!.difference(_first!).inDays + 1,
    );
    try {
      final zone = capturedZone ?? await _device.captureIanaZone();
      if (!_current(generation)) return;
      final today = await _device.todayInZone(zone);
      if (!_current(generation)) return;
      if (_day!.isAfter(DateTime.utc(today.year, today.month, today.day))) {
        throw const FormatException('Future date');
      }
      _zone = zone;
      _canResume = true;
      await _scan(generation);
    } catch (_) {
      if (_current(generation)) _publish(CheckInSearchPhase.failed);
    }
  }

  Future<void> resume() async {
    if (!_canResume || state.phase == CheckInSearchPhase.searching) return;
    final generation = ++_generation;
    if (!_current(generation)) return;
    _publish(CheckInSearchPhase.searching);
    await _scan(generation);
  }

  Future<void> _scan(int generation) async {
    while (_current(generation) && _day != null && !_day!.isBefore(_first!)) {
      try {
        final date = _day!.toIso8601String().substring(0, 10);
        final result = await _repository.readOwnForDate(
          date: date,
          timeZone: _zone!,
          cursor: _cursor,
        );
        if (!_current(generation)) return;
        if (result case Failure<CheckInHistoryPage>(:final failure)) {
          const revoked = {
            AppFailureKind.authRequired,
            AppFailureKind.authForbidden,
            AppFailureKind.authenticationInvalid,
            AppFailureKind.onboardingRequired,
            AppFailureKind.checkInUnavailable,
          };
          if (revoked.contains(failure.kind)) {
            _canResume = false;
            _publish(
              CheckInSearchPhase.failed,
              matches: const [],
              records: 0,
              days: 0,
              failure: failure,
            );
          } else {
            _publish(CheckInSearchPhase.failed, failure: failure);
          }
          return;
        }
        final page = (result as Success<CheckInHistoryPage>).value;
        final next = page.nextCursor;
        if (next != null && (next == _cursor || _seenCursors.contains(next))) {
          throw const FormatException('Repeated history cursor');
        }
        final matching = page.checkIns
            .where(
              (record) =>
                  _allRecords ||
                  [
                    record.note,
                    record.activity ?? '',
                    record.locationLabel ?? '',
                  ].any((text) => text.toLowerCase().contains(_query)),
            )
            .toList();
        final times = await _device.formatInstants(
          matching.map((record) => record.createdAt).toList(),
          _zone!,
        );
        if (!_current(generation)) return;
        if (times.length != matching.length) {
          throw const FormatException('Invalid local times');
        }
        final merged = {
          for (final entry in state.matches) entry.record.checkInId: entry,
          for (var i = 0; i < matching.length; i++)
            matching[i].checkInId: CheckInSearchMatch(
              matching[i],
              times[i],
              date,
            ),
        };
        if (_cursor != null) _seenCursors.add(_cursor!);
        _cursor = next;
        var days = state.daysRead;
        if (next == null) {
          days++;
          _day = _day!.subtract(const Duration(days: 1));
          _seenCursors.clear();
        }
        _publish(
          CheckInSearchPhase.searching,
          matches: List.unmodifiable(merged.values),
          days: days,
          records: state.recordsRead + page.checkIns.length,
        );
        // Give Stop and session changes a chance between even synchronous pages.
        await Future<void>.delayed(Duration.zero);
      } catch (_) {
        if (_current(generation)) _publish(CheckInSearchPhase.failed);
        return;
      }
    }
    if (_current(generation)) {
      _canResume = false;
      _publish(CheckInSearchPhase.complete);
    }
  }
}
