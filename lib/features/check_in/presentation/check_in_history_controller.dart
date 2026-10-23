import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';
import '../history_device_port.dart';

enum CheckInHistoryPhase { signedOut, loading, ready, failed }

final class CheckInHistoryEntry {
  const CheckInHistoryEntry({required this.checkIn, required this.localTime});

  final CheckIn checkIn;
  final String localTime;
}

final class CheckInHistoryState {
  const CheckInHistoryState({
    this.phase = CheckInHistoryPhase.loading,
    this.selectedDate,
    this.latestDate,
    this.ianaZone,
    this.entries = const [],
    this.nextCursor,
    this.failure,
    this.isLoadingNext = false,
    this.nextPageFailure,
  });

  final CheckInHistoryPhase phase;
  final DateTime? selectedDate;
  final DateTime? latestDate;
  final String? ianaZone;
  final List<CheckInHistoryEntry> entries;
  final String? nextCursor;
  final AppFailure? failure;
  final bool isLoadingNext;
  final AppFailure? nextPageFailure;
}

final checkInHistoryControllerProvider =
    NotifierProvider.autoDispose<CheckInHistoryController, CheckInHistoryState>(
      CheckInHistoryController.new,
    );

final class CheckInHistoryController extends Notifier<CheckInHistoryState> {
  late CheckInRepository _repository;
  late HistoryDevicePort _device;
  String? _subject;
  int _session = 0;
  int _request = 0;

  @override
  CheckInHistoryState build() {
    final auth = ref.watch(authSessionProvider);
    _repository = ref.watch(checkInRepositoryProvider);
    _device = ref.watch(historyDevicePortProvider);
    ref.listen(contentAccessProvider, (before, after) {
      _request++;
      final old = state;
      state = CheckInHistoryState(
        selectedDate: old.selectedDate,
        latestDate: old.latestDate,
        ianaZone: old.ianaZone,
      );
      if (after.foreground) unawaited(reload());
    });
    _session++;
    _request++;
    final session = switch (auth) {
      AsyncData<AuthSession>(value: AuthSessionAuthenticated(:final subject)) =>
        subject,
      _ => null,
    };
    _subject = session;
    final sessionToken = _session;
    ref.onDispose(() {
      _session++;
      _request++;
    });
    if (session == null || !ref.read(contentAccessProvider).foreground) {
      return const CheckInHistoryState(phase: CheckInHistoryPhase.signedOut);
    }
    scheduleMicrotask(() {
      if (ref.mounted && sessionToken == _session) unawaited(initialize());
    });
    return const CheckInHistoryState();
  }

  Future<void> initialize() async {
    if (!ref.read(contentAccessProvider).foreground) return;
    final subject = _subject;
    if (!ref.mounted || subject == null) return;
    final session = _session;
    final request = ++_request;
    state = const CheckInHistoryState(phase: CheckInHistoryPhase.loading);
    try {
      final zone = await _device.captureIanaZone();
      if (!_isCurrent(session, request, subject)) return;
      final today = await _device.todayInZone(zone);
      if (!_isCurrent(session, request, subject)) return;
      await _readPage(
        session: session,
        request: request,
        subject: subject,
        date: today,
        today: today,
        zone: zone,
        cursor: null,
      );
    } on Object {
      if (!_isCurrent(session, request, subject)) return;
      state = const CheckInHistoryState(phase: CheckInHistoryPhase.failed);
    }
  }

  Future<void> selectDate(DateTime date) async {
    if (!ref.read(contentAccessProvider).foreground) return;
    final current = state;
    final subject = _subject;
    final zone = current.ianaZone;
    final today = current.latestDate;
    if (!ref.mounted || subject == null || zone == null || today == null) {
      return;
    }
    final selected = _dateOnly(date);
    if (selected.isAfter(today) ||
        _dateOnly(current.selectedDate ?? today) == selected) {
      return;
    }
    final session = _session;
    final request = ++_request;
    state = CheckInHistoryState(
      phase: CheckInHistoryPhase.loading,
      selectedDate: selected,
      latestDate: today,
      ianaZone: zone,
    );
    await _readPage(
      session: session,
      request: request,
      subject: subject,
      date: selected,
      today: today,
      zone: zone,
      cursor: null,
    );
  }

  Future<void> reload() async {
    if (!ref.read(contentAccessProvider).foreground) return;
    final current = state;
    final subject = _subject;
    final date = current.selectedDate;
    final today = current.latestDate;
    final zone = current.ianaZone;
    if (!ref.mounted ||
        subject == null ||
        date == null ||
        today == null ||
        zone == null) {
      await initialize();
      return;
    }
    final session = _session;
    final request = ++_request;
    state = CheckInHistoryState(
      phase: CheckInHistoryPhase.loading,
      selectedDate: date,
      latestDate: today,
      ianaZone: zone,
    );
    await _readPage(
      session: session,
      request: request,
      subject: subject,
      date: date,
      today: today,
      zone: zone,
      cursor: null,
    );
  }

  Future<void> loadNext() async {
    if (!ref.read(contentAccessProvider).foreground) return;
    final current = state;
    final subject = _subject;
    final date = current.selectedDate;
    final today = current.latestDate;
    final zone = current.ianaZone;
    final cursor = current.nextCursor;
    if (!ref.mounted ||
        subject == null ||
        date == null ||
        today == null ||
        zone == null ||
        cursor == null ||
        current.phase != CheckInHistoryPhase.ready ||
        current.isLoadingNext) {
      return;
    }
    final session = _session;
    final request = ++_request;
    state = CheckInHistoryState(
      phase: CheckInHistoryPhase.ready,
      selectedDate: date,
      latestDate: today,
      ianaZone: zone,
      entries: current.entries,
      nextCursor: cursor,
      isLoadingNext: true,
    );
    await _readPage(
      session: session,
      request: request,
      subject: subject,
      date: date,
      today: today,
      zone: zone,
      cursor: cursor,
      existingEntries: current.entries,
    );
  }

  Future<void> _readPage({
    required int session,
    required int request,
    required String subject,
    required DateTime date,
    required DateTime today,
    required String zone,
    required String? cursor,
    List<CheckInHistoryEntry>? existingEntries,
  }) async {
    try {
      final result = await _repository.readOwnForDate(
        date: _formatDate(date),
        timeZone: zone,
        cursor: cursor,
      );
      if (!_isCurrent(session, request, subject)) return;
      if (result case Failure<CheckInHistoryPage>()) {
        if (existingEntries != null &&
            result.failure.kind != AppFailureKind.authRequired &&
            result.failure.kind != AppFailureKind.authForbidden &&
            result.failure.kind != AppFailureKind.authenticationInvalid &&
            result.failure.kind != AppFailureKind.onboardingRequired &&
            result.failure.kind != AppFailureKind.checkInUnavailable) {
          state = CheckInHistoryState(
            phase: CheckInHistoryPhase.ready,
            selectedDate: date,
            latestDate: today,
            ianaZone: zone,
            entries: existingEntries,
            nextCursor: cursor,
            nextPageFailure: result.failure,
          );
          return;
        }
        state = CheckInHistoryState(
          phase: CheckInHistoryPhase.failed,
          selectedDate: date,
          latestDate: today,
          ianaZone: zone,
          failure: result.failure,
        );
        return;
      }
      final page = (result as Success<CheckInHistoryPage>).value;
      final times = await _device.formatInstants(
        page.checkIns.map((checkIn) => checkIn.createdAt).toList(),
        zone,
      );
      if (!_isCurrent(session, request, subject)) return;
      state = CheckInHistoryState(
        phase: CheckInHistoryPhase.ready,
        selectedDate: date,
        latestDate: today,
        ianaZone: zone,
        entries: List.unmodifiable(
          {
            for (final entry in existingEntries ?? <CheckInHistoryEntry>[])
              entry.checkIn.checkInId: entry,
            for (var index = 0; index < page.checkIns.length; index++)
              page.checkIns[index].checkInId: CheckInHistoryEntry(
                checkIn: page.checkIns[index],
                localTime: times[index],
              ),
          }.values,
        ),
        nextCursor: page.nextCursor,
      );
    } on Object {
      if (!_isCurrent(session, request, subject)) return;
      if (existingEntries != null) {
        state = CheckInHistoryState(
          phase: CheckInHistoryPhase.ready,
          selectedDate: date,
          latestDate: today,
          ianaZone: zone,
          entries: existingEntries,
          nextCursor: cursor,
          nextPageFailure: const AppFailure(
            kind: AppFailureKind.unexpected,
            message: 'The next page could not be loaded.',
          ),
        );
        return;
      }
      state = CheckInHistoryState(
        phase: CheckInHistoryPhase.failed,
        selectedDate: date,
        latestDate: today,
        ianaZone: zone,
        failure: const AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'History could not be formatted.',
        ),
      );
    }
  }

  bool _isCurrent(int session, int request, String subject) =>
      ref.mounted &&
      session == _session &&
      request == _request &&
      subject == _subject;

  static DateTime _dateOnly(DateTime value) =>
      DateTime.utc(value.year, value.month, value.day);

  static String _formatDate(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-'
      '${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';
}
