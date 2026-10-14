import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/harness/social/offline_social_store.dart';

void main() {
  late OfflineSocialStore store;
  setUp(() => store = OfflineSocialStore());
  tearDown(() => store.dispose());
  test(
    'History pages stay bounded and date-bound when a new Note is inserted',
    () async {
      final repo = OfflineCheckInRepository(store);
      for (var i = 0; i < 22; i++) {
        await repo.create(note: 'Moment $i', idempotencyKey: 'page-$i');
      }
      final date = offlineDate(
        DateTime.now().toUtc().add(const Duration(hours: 8)),
      );
      final first = (await repo.readOwnForDate(
        date: date,
        timeZone: 'Asia/Singapore',
      ) as Success<CheckInHistoryPage>).value;
      expect(first.checkIns, hasLength(20));
      await repo.create(
        note: 'Inserted after first page',
        idempotencyKey: 'later',
      );
      final next = (await repo.readOwnForDate(
        date: date,
        timeZone: 'Asia/Singapore',
        cursor: first.nextCursor,
      ) as Success<CheckInHistoryPage>).value;
      expect(next.checkIns, hasLength(3));
      expect(
        [...first.checkIns, ...next.checkIns].map((n) => n.checkInId).toSet(),
        hasLength(23),
      );
      expect(
        await repo.readOwnForDate(
          date: '1900-01-01',
          timeZone: 'Asia/Singapore',
          cursor: first.nextCursor,
        ),
        isA<Failure<CheckInHistoryPage>>(),
      );
    },
  );

  test('profile and settings reject stale updates without overwriting current data', () async {
    final repo = OfflinePreferencesRepository(store);
    expect(
      await repo.saveProfile(
        displayName: 'New name',
        visibility: ProfileVisibility.friendsOnly,
        expectedRevision: 0,
      ),
      isA<Success<OwnProfile>>(),
    );
    expect(
      await repo.saveProfile(
        displayName: 'Stale name',
        visibility: ProfileVisibility.public,
        expectedRevision: 0,
      ),
      isA<Failure<OwnProfile>>(),
    );
    expect(store.profile.displayName, 'New name');
    expect(store.profile.username, 'offline_member');
    await repo.saveSettings(
      visibility: CheckInVisibility.friendsOnly,
      consent: OptionalProcessingConsent.accepted,
      expectedRevision: 0,
    );
    expect(
      await repo.saveSettings(
        visibility: CheckInVisibility.public,
        consent: OptionalProcessingConsent.rejected,
        expectedRevision: 0,
      ),
      isA<Failure<OwnSettings>>(),
    );
    expect(store.settings.checkInVisibility, CheckInVisibility.friendsOnly);
  });

  test(
    'Note validation and repeated request prevent duplicate or changed effects',
    () async {
      final repo = OfflineCheckInRepository(store);
      final before = store.notes.length;
      expect(
        await repo.create(note: '  ', idempotencyKey: 'empty'),
        isA<Failure<CheckIn>>(),
      );
      expect(
        await repo.create(note: 'x' * 501, idempotencyKey: 'long'),
        isA<Failure<CheckIn>>(),
      );
      final first = await repo.create(
        note: 'A new moment',
        idempotencyKey: 'same',
      );
      final repeated = await repo.create(
        note: 'A new moment',
        idempotencyKey: 'same',
      );
      expect(
        (first as Success<CheckIn>).value.checkInId,
        (repeated as Success<CheckIn>).value.checkInId,
      );
      expect(
        await repo.create(note: 'Changed', idempotencyKey: 'same'),
        isA<Failure<CheckIn>>(),
      );
      expect(store.notes.length, before + 1);
      expect(
        await repo.readOwned(checkInId: 'someone-elses-note'),
        isA<Failure<CheckIn>>(),
      );
      expect(
        await repo.readOwnForDate(
          date: '2026-10-14',
          timeZone: 'Europe/London',
        ),
        isA<Failure<CheckInHistoryPage>>(),
      );
    },
  );

  test(
    'accept and decline sample requests do not create duplicate friendships',
    () async {
      final repo = OfflineFriendRepository(store);
      final request = store.requests.single;
      await repo.act(request.requestRef, accept: true);
      expect(
        store.friends.where((f) => f.username == request.username),
        hasLength(1),
      );
      expect(
        await repo.act(request.requestRef, accept: true),
        isA<Failure<String>>(),
      );
      expect(
        store.friends.where((f) => f.username == request.username),
        hasLength(1),
      );
      expect(store.requests, isEmpty);
      final other = OfflineSocialStore();
      addTearDown(other.dispose);
      await OfflineFriendRepository(other)
          .act(other.requests.single.requestRef, accept: false);
      expect(other.friends.where((f) => f.username == 'riley_sample'), isEmpty);
    },
  );

  test(
    'Persona session eligibility and revision barriers precede mutation',
    () async {
      final repo = OfflinePersonaRepository(store);
      final item = store.personas.single;
      expect(
        await repo.delete(
          item.personaId,
          expectedRevision: 0,
          expectedStateRevision: 0,
          isEligible: () => false,
        ),
        isA<Failure<void>>(),
      );
      expect(store.personas, hasLength(1));
      expect(
        await repo.edit(
          item.personaId,
          fields: item.fields,
          expectedRevision: 8,
          expectedStateRevision: 0,
        ),
        isA<Failure<PersonaMutation>>(),
      );
      expect(store.personaStateRevision, 0);
      await repo.delete(
        item.personaId,
        expectedRevision: 0,
        expectedStateRevision: 0,
      );
      expect(store.activePersonaId, isNull);
      expect(store.personas, isEmpty);
      expect(store.personaStateRevision, 1);
    },
  );

  test('changing interests updates the same offline profile state with conflict guard', () async {
    final repo = OfflineInterestRepository(store);
    await repo.replaceOwn(interestTagIds: ['music'], expectedRevision: 0);
    expect(store.interestIds, ['music']);
    await repo.replaceOwn(interestTagIds: ['art'], expectedRevision: 0);
    expect(store.interestIds, ['music']);
    await repo.replaceOwn(
      interestTagIds: ['unapproved-field'],
      expectedRevision: 1,
    );
    expect(store.interestIds, ['music']);
  });
}
