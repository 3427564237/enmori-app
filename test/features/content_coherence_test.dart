import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_mutations.dart';
import 'package:enmori/features/check_in/domain/check_in_calendar_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_edit_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_calendar_page.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:enmori/features/friends/presentation/social_profile_controller.dart';

final record = CheckIn(
  checkInId: 'synthetic-record',
  note: 'Shared synthetic note',
  createdAt: DateTime.utc(2026, 10, 22),
  checkInVisibility: CheckInVisibility.friendsOnly,
);

void main() {
  test('saved privacy change clears another retained social view', () async {
    final sessions = StreamController<AuthSession>();
    final repository = Records();
    final c = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((ref) => sessions.stream),
        checkInRepositoryProvider.overrideWithValue(repository),
        socialRepositoryProvider.overrideWithValue(Social()),
      ],
    );
    addTearDown(() async {
      c.dispose();
      await sessions.close();
    });
    final profile = socialProfileControllerProvider('friend');
    c.listen(profile, (_, _) {});
    c.listen(checkInEditControllerProvider, (_, _) {});
    sessions.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
    await c.pump();
    await c
        .read(profile.notifier)
        .load(SocialTab.records, date: '2026-10-22', timeZone: 'UTC');
    expect(c.read(profile).records!.checkIns.single.note, record.note);
    await c
        .read(checkInEditControllerProvider.notifier)
        .save(record, record.note, CheckInVisibility.private);
    await c.pump();
    expect(c.read(checkInEditControllerProvider).saved, isNotNull);
    expect(c.read(profile).records, isNull);
  });

  test('same UID replacement retires the retained calendar result', () async {
    final sessions = StreamController<AuthSession>();
    final repository = Records();
    final c = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((ref) => sessions.stream),
        checkInRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(() async {
      c.dispose();
      await sessions.close();
    });
    final month = checkInMonthProvider((month: '2026-10', zone: 'UTC'));
    sessions.add(AuthSessionAuthenticated(subject: 'same-owner'));
    c.listen(authSessionProvider, (_, _) {});
    await c.pump();
    c.listen(month, (_, _) {});
    await c.read(month.future);
    final reads = repository.monthReads;
    sessions.add(AuthSessionAuthenticated(subject: 'same-owner'));
    await c.pump();
    await c.read(month.future);
    expect(repository.monthReads, greaterThan(reads));
  });
}

class Records
    implements CheckInRepository, CheckInMutations, CheckInCalendarRepository {
  int monthReads = 0;
  @override
  Future<Result<CheckIn>> update({
    bool Function()? isEligible,
    required String checkInId,
    required String note,
    required CheckInVisibility visibility,
    required int expectedRevision,
    String? mood,
    String? activity,
    String? locationLabel,
  }) async => Success(
    CheckIn(
      checkInId: checkInId,
      note: note,
      createdAt: record.createdAt,
      revision: 2,
      checkInVisibility: visibility,
    ),
  );
  @override
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  }) async {
    monthReads++;
    return Success(
      CheckInMonth(
        month: month,
        timeZone: timeZone,
        counts: const {'2026-10-22': 1},
      ),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected fixture call ${invocation.memberName}');
}

class Social implements SocialRepository {
  @override
  Future<Result<CheckInHistoryPage>> records(
    String username, {
    required String date,
    required String timeZone,
    String? cursor,
  }) async => Success(CheckInHistoryPage(checkIns: [record], nextCursor: null));
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected fixture call ${invocation.memberName}');
}
