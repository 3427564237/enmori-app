import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../domain/social_repository.dart';
import '../social_providers.dart';
import 'my_friends_controller.dart';

enum SocialTab { profile, records, calendar, map }

final class SocialState {
  const SocialState({
    this.tab = SocialTab.profile,
    this.busy = false,
    this.profile,
    this.records,
    this.month,
    this.failure,
    this.removed = false,
  });
  final SocialTab tab;
  final bool busy, removed;
  final SocialProfile? profile;
  final CheckInHistoryPage? records;
  final SocialMonth? month;
  final AppFailure? failure;
}

final socialProfileControllerProvider = NotifierProvider.autoDispose
    .family<SocialProfileController, SocialState, String>(
      SocialProfileController.new,
    );

final class SocialProfileController extends Notifier<SocialState> {
  SocialProfileController(this.username);
  final String username;
  late SocialRepository _repository;
  int _epoch = 0;
  int get epoch => _epoch;
  @override
  SocialState build() {
    ref.watch(currentAuthSubjectProvider);
    ref.watch(
      authSessionProvider.select(
        (v) => v.asData?.value is AuthSessionAuthenticated
            ? v.asData?.value
            : null,
      ),
    );
    _repository = ref.watch(socialRepositoryProvider);
    _epoch++;
    ref.onDispose(() => _epoch++);
    return const SocialState();
  }

  void clear() {
    _epoch++;
    state = SocialState(tab: state.tab);
  }

  Future<void> load(
    SocialTab tab, {
    required String date,
    required String timeZone,
    bool next = false,
  }) async {
    if (state.busy) return;
    final cursor = next ? state.records?.nextCursor : null;
    if (next && cursor == null) return;
    final epoch = ++_epoch;
    state = SocialState(tab: tab, busy: true);
    try {
      final Result<Object?> result = switch (tab) {
        SocialTab.profile => await _repository.profile(username),
        SocialTab.records => await _repository.records(
          username,
          date: date,
          timeZone: timeZone,
          cursor: cursor,
        ),
        SocialTab.calendar || SocialTab.map => await _repository.month(
          username,
          month: date.substring(0, 7),
          timeZone: timeZone,
        ),
      };
      if (!ref.mounted || epoch != _epoch) return;
      state = switch (result) {
        Failure<Object?>(:final failure) => SocialState(
          tab: tab,
          failure: failure,
        ),
        Success<Object?>(value: final SocialProfile profile) => SocialState(
          tab: tab,
          profile: profile,
        ),
        Success<Object?>(value: final CheckInHistoryPage records) =>
          SocialState(tab: tab, records: records),
        Success<Object?>(value: final SocialMonth month) => SocialState(
          tab: tab,
          month: month,
        ),
        _ => SocialState(tab: tab, failure: _unavailable),
      };
    } catch (_) {
      if (ref.mounted && epoch == _epoch) {
        state = SocialState(tab: tab, failure: _unavailable);
      }
    }
  }

  Future<void> care(bool enabled, {required int expectedEpoch}) async {
    final profile = state.profile;
    if (state.busy ||
        expectedEpoch != _epoch ||
        profile?.relationship != SocialRelationship.friend) {
      return;
    }
    final epoch = ++_epoch;
    state = const SocialState(busy: true);
    final result = await _repository.care(
      username,
      specialCare: enabled,
      expectedRevision: profile!.friendshipRevision,
    );
    if (!ref.mounted || epoch != _epoch) return;
    if (result case Failure<FriendCare>(:final failure)) {
      state = SocialState(failure: failure);
      return;
    }
    // Fresh profile read, no reconstruction from an old view after a mutation.
    state = const SocialState();
    await load(SocialTab.profile, date: '', timeZone: '');
  }

  Future<void> record(String checkInId) async {
    if (state.busy) return;
    final epoch = ++_epoch;
    state = const SocialState(tab: SocialTab.records, busy: true);
    final result = await _repository.record(username, checkInId);
    if (!ref.mounted || epoch != _epoch) return;
    state = switch (result) {
      Success<CheckIn>(:final value) => SocialState(
        tab: SocialTab.records,
        records: CheckInHistoryPage(checkIns: [value], nextCursor: null),
      ),
      Failure<CheckIn>(:final failure) => SocialState(
        tab: SocialTab.records,
        failure: failure,
      ),
    };
  }

  Future<void> remove({required int expectedEpoch}) async {
    final profile = state.profile;
    if (state.busy ||
        expectedEpoch != _epoch ||
        profile?.relationship != SocialRelationship.friend) {
      return;
    }
    final epoch = ++_epoch;
    state = const SocialState(busy: true);
    final result = await _repository.remove(
      username,
      expectedRevision: profile!.friendshipRevision,
    );
    if (!ref.mounted || epoch != _epoch) return;
    ref.invalidate(myFriendsControllerProvider);
    state = switch (result) {
      Success<void>() => const SocialState(removed: true),
      Failure<void>(:final failure) => SocialState(failure: failure),
    };
  }
}

const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'This view is unavailable. Reload to check current access.',
);
