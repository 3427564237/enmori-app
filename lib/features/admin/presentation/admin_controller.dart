import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../interests/admin_interest_providers.dart';
import '../domain/admin_repository.dart';

final adminRepositoryProvider = Provider<AdminRepository>(
  (ref) => const _Unavailable(),
);
final adminControllerProvider =
    NotifierProvider.family<AdminController, AdminState, String>(
      AdminController.new,
    );

final class AdminState {
  const AdminState({
    this.allowed = false,
    this.busy = false,
    this.categories = const [],
    this.status,
    this.records = const [],
    this.nextCursor,
    this.classification,
    this.failure,
    this.notice,
    this.writeUncertain = false,
  });
  final bool allowed, busy, writeUncertain;
  final List<AdminCategory> categories;
  final AdminStatus? status;
  final List<AdminOperationRecord> records;
  final String? nextCursor, notice;
  final AdminClassification? classification;
  final AppFailure? failure;
}

final class AdminController extends Notifier<AdminState> {
  AdminController(this.pageKey);
  final String pageKey;
  late AdminRepository _repository;
  AuthSessionAuthenticated? _session;
  int _epoch = 0;
  bool _requiresRead = false;
  @override
  AdminState build() {
    _repository = ref.watch(adminRepositoryProvider);
    final previousSession = _session;
    _session = switch (ref.watch(authSessionProvider).asData?.value) {
      final AuthSessionAuthenticated s => s,
      _ => null,
    };
    if (!identical(previousSession, _session)) _requiresRead = false;
    final allowed =
        _session != null &&
        ref.watch(adminInterestCapabilityProvider).asData?.value == true;
    _epoch++;
    ref.onDispose(() => _epoch++);
    return AdminState(allowed: allowed, writeUncertain: _requiresRead);
  }

  bool _current(int epoch, AuthSessionAuthenticated? session) =>
      ref.mounted &&
      epoch == _epoch &&
      session != null &&
      identical(session, _session) &&
      identical(ref.read(authSessionProvider).asData?.value, session) &&
      ref.read(adminInterestCapabilityProvider).asData?.value == true;
  AdminState _state({
    bool busy = false,
    List<AdminCategory>? categories,
    AdminStatus? status,
    List<AdminOperationRecord>? records,
    String? nextCursor,
    AdminClassification? classification,
    AppFailure? failure,
    String? notice,
    bool? uncertain,
  }) {
    if (uncertain != null) _requiresRead = uncertain;
    return AdminState(
      allowed: state.allowed,
      busy: busy,
      categories: categories ?? state.categories,
      status: status ?? state.status,
      records: records ?? state.records,
      nextCursor: nextCursor,
      classification: classification ?? state.classification,
      failure: failure,
      notice: notice,
      writeUncertain: _requiresRead,
    );
  }

  void _fail(AppFailure failure, {bool? uncertain}) {
    if (failure.kind == AppFailureKind.authForbidden ||
        failure.kind == AppFailureKind.authRequired) {
      ref.read(adminInterestCapabilityProvider.notifier).revoke();
      state = const AdminState();
      return;
    }
    state = _state(failure: failure, uncertain: uncertain);
  }

  Future<void> load(String page, {String? eventId, bool more = false}) async {
    if (!state.allowed || state.busy) return;
    final session = _session, epoch = ++_epoch, old = state;
    state = _state(busy: true);
    bool current() => _current(epoch, session);
    if (page == 'status') {
      final r = await _repository.status(current);
      if (!current()) return;
      switch (r) {
        case Success<AdminStatus>(:final value):
          state = _state(status: value);
        case Failure<AdminStatus>(:final failure):
          _fail(failure);
      }
    } else if (page == 'records') {
      final r = await _repository.records(
        more ? old.nextCursor : null,
        current,
      );
      if (!current()) return;
      switch (r) {
        case Success<AdminRecordPage>(:final value):
          final values = <String, AdminOperationRecord>{
            if (more)
              for (final row in old.records) row.id: row,
            for (final row in value.records) row.id: row,
          };
          state = _state(
            records: List.unmodifiable(values.values),
            nextCursor: value.nextCursor,
          );
        case Failure<AdminRecordPage>(:final failure):
          _fail(failure);
      }
    } else {
      final r = await _repository.categories(current);
      if (!current()) return;
      if (r case Failure<List<AdminCategory>>(:final failure)) {
        _fail(failure);
        return;
      }
      final categories = (r as Success<List<AdminCategory>>).value;
      if (eventId != null) {
        final c = await _repository.classification(eventId, current);
        if (!current()) return;
        if (c case Failure<AdminClassification>(:final failure)) {
          _fail(failure);
          return;
        }
        state = _state(
          categories: categories,
          classification: (c as Success<AdminClassification>).value,
          uncertain: false,
          notice: old.writeUncertain ? 'review' : null,
        );
      } else {
        state = _state(
          categories: categories,
          uncertain: false,
          notice: old.writeUncertain ? 'review' : null,
        );
      }
    }
  }

  Future<bool> save({
    AdminCategory? expected,
    String? name,
    bool? active,
  }) async {
    if (!state.allowed || state.busy || state.writeUncertain) return false;
    final session = _session, epoch = ++_epoch;
    state = _state(busy: true);
    bool current() => _current(epoch, session);
    _requiresRead = true;
    final Result<AdminCategory> result = expected == null
        ? await _repository.create(name ?? '', current)
        : name != null
        ? await _repository.rename(expected, name, current)
        : await _repository.lifecycle(
            expected,
            active ?? expected.active,
            current,
          );
    if (!current()) return false;
    if (result case Failure<AdminCategory>(:final failure)) {
      _fail(failure, uncertain: true);
      return false;
    }
    final saved = (result as Success<AdminCategory>).value;
    final read = await _repository.categories(current);
    if (!current()) return false;
    if (read case Failure<List<AdminCategory>>(:final failure)) {
      _fail(failure, uncertain: true);
      return false;
    }
    final values = (read as Success<List<AdminCategory>>).value;
    if (!values.any(saved.sameVersion)) {
      _fail(_unconfirmed, uncertain: true);
      return false;
    }
    state = _state(
      categories: values,
      records: const [],
      notice: 'saved',
      uncertain: false,
    );
    return true;
  }

  Future<bool> assign(String? categoryId) async {
    final expected = state.classification;
    if (!state.allowed ||
        state.busy ||
        state.writeUncertain ||
        expected == null) {
      return false;
    }
    final session = _session, epoch = ++_epoch;
    state = _state(busy: true);
    bool current() => _current(epoch, session);
    _requiresRead = true;
    final result = await _repository.assign(expected, categoryId, current);
    if (!current()) return false;
    if (result case Failure<AdminClassification>(:final failure)) {
      _fail(failure, uncertain: true);
      return false;
    }
    final saved = (result as Success<AdminClassification>).value;
    final read = await _repository.classification(expected.eventId, current);
    if (!current()) return false;
    if (read case Failure<AdminClassification>(:final failure)) {
      _fail(failure, uncertain: true);
      return false;
    }
    final value = (read as Success<AdminClassification>).value;
    if (value.revision != saved.revision ||
        value.category?.id != saved.category?.id ||
        value.category?.name != saved.category?.name ||
        value.category?.active != saved.category?.active) {
      _fail(_unconfirmed, uncertain: true);
      return false;
    }
    state = _state(
      classification: value,
      records: const [],
      notice: 'saved',
      uncertain: false,
    );
    return true;
  }
}

const _unconfirmed = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The change could not be independently confirmed. Reload and check before another change.',
);

final class _Unavailable implements AdminRepository {
  const _Unavailable();
  @override
  Future<Result<AdminStatus>> status(bool Function() c) async =>
      const Failure(_unconfirmed);
  @override
  Future<Result<List<AdminCategory>>> categories(bool Function() c) async =>
      const Failure(_unconfirmed);
  @override
  Future<Result<AdminCategory>> create(String n, bool Function() c) async =>
      const Failure(_unconfirmed);
  @override
  Future<Result<AdminCategory>> rename(
    AdminCategory e,
    String n,
    bool Function() c,
  ) async => const Failure(_unconfirmed);
  @override
  Future<Result<AdminCategory>> lifecycle(
    AdminCategory e,
    bool a,
    bool Function() c,
  ) async => const Failure(_unconfirmed);
  @override
  Future<Result<AdminRecordPage>> records(String? q, bool Function() c) async =>
      const Failure(_unconfirmed);
  @override
  Future<Result<AdminClassification>> classification(
    String id,
    bool Function() c,
  ) async => const Failure(_unconfirmed);
  @override
  Future<Result<AdminClassification>> assign(
    AdminClassification e,
    String? id,
    bool Function() c,
  ) async => const Failure(_unconfirmed);
}
