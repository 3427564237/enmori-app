import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_edit_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_edit_page.dart';
import 'package:enmori/features/check_in/presentation/located_check_in_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controller.dart';
import 'package:enmori/features/check_in/domain/check_in_place_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/presentation/social_profile_controller.dart';
import 'package:enmori/features/friends/social_providers.dart';

import 'content_coherence_test.dart' show Records, Social, record;

const denied = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Unconfirmed',
);
final profile = socialProfileControllerProvider('peer');

class Harness {
  Harness({
    Records? records,
    Social? social,
    AccountPreferencesRepository? preferences,
    CheckInPlaceRepository? place,
    FriendActivityRepository? activities,
  }) {
    c = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((_) => sessions.stream),
        checkInRepositoryProvider.overrideWithValue(records ?? Records()),
        socialRepositoryProvider.overrideWithValue(social ?? Social()),
        if (place != null)
          checkInPlaceRepositoryProvider.overrideWithValue(place),
        if (activities != null)
          friendActivityRepositoryProvider.overrideWithValue(activities),
        if (preferences != null)
          accountPreferencesRepositoryProvider.overrideWithValue(preferences),
      ],
    );
    c.listen(authSessionProvider, (_, _) {});
    c.listen(contentAccessProvider, (_, _) {});
    c.listen(profile, (_, _) {});
    edit = c.listen(checkInEditControllerProvider, (_, _) {});
  }
  final sessions = StreamController<AuthSession>();
  late ProviderContainer c;
  late ProviderSubscription edit;
  Future<void> start() async {
    sessions.add(AuthSessionAuthenticated(subject: 'owner'));
    await c.pump();
  }

  Future<void> load() => c
      .read(profile.notifier)
      .load(SocialTab.records, date: '2026-10-22', timeZone: 'UTC');
  Future<void> close() async {
    c.dispose();
    await sessions.close();
  }
}

void main() {
  test('unknown delete clears other views but retains recoverable failure, never deleted success', () async {
    final h = Harness(records: DeletingRecords(const Failure(denied)));
    addTearDown(h.close);
    await h.start();
    await h.load();
    await h.c.read(checkInEditControllerProvider.notifier).remove(record);
    expect(h.c.read(profile).records, isNull);
    expect(h.c.read(checkInEditControllerProvider).deleted, isFalse);
    expect(h.c.read(checkInEditControllerProvider).failure, denied);
    await h.load(); // Fresh read may legitimately still contain the record.
    expect(
      h.c.read(profile).records!.checkIns.single.checkInId,
      record.checkInId,
    );
  });
  test('late pre-delete shared read cannot restore revoked content', () async {
    final social = PendingSocial();
    final h = Harness(
      records: DeletingRecords(const Success(null)),
      social: social,
    );
    addTearDown(h.close);
    await h.start();
    final reading = h.load();
    await h.c.read(checkInEditControllerProvider.notifier).remove(record);
    social.pending.complete(
      Success(CheckInHistoryPage(checkIns: [record], nextCursor: null)),
    );
    await reading;
    expect(h.c.read(profile).records, isNull);
    expect(h.c.read(checkInEditControllerProvider).deleted, isTrue);
  });
  test(
    'settlement still invalidates readers after initiating editor was disposed',
    () async {
      final records = PendingDelete();
      final h = Harness(records: records);
      addTearDown(h.close);
      await h.start();
      await h.load();
      final deleting = h.c
          .read(checkInEditControllerProvider.notifier)
          .remove(record);
      h.edit.close();
      await h.c.pump();
      records.pending.complete(const Success(null));
      await deleting;
      expect(h.c.read(profile).records, isNull);
    },
  );
  test(
    'old-session settlement does not clear freshly read new-session content',
    () async {
      final records = PendingDelete();
      final h = Harness(records: records);
      addTearDown(h.close);
      await h.start();
      final deleting = h.c
          .read(checkInEditControllerProvider.notifier)
          .remove(record);
      h.sessions.add(AuthSessionAuthenticated(subject: 'owner'));
      await h.c.pump();
      await h.load();
      final revision = h.c.read(contentAccessProvider).revision;
      records.pending.complete(const Success(null));
      await deleting;
      expect(h.c.read(contentAccessProvider).revision, revision);
      expect(h.c.read(profile).records, isNotNull);
      expect(h.c.read(checkInEditControllerProvider).deleted, isFalse);
    },
  );
  test('covered profile clears on background; late read stays cleared until fresh foreground read', () async {
    final social = PendingSocial();
    final h = Harness(social: social);
    addTearDown(h.close);
    await h.start();
    final reading = h.load();
    h.c.read(contentAccessProvider.notifier).setForeground(false);
    social.pending.complete(
      Success(CheckInHistoryPage(checkIns: [record], nextCursor: null)),
    );
    await reading;
    await h.load();
    expect(social.calls, 1);
    expect(h.c.read(profile).records, isNull);
    h.c.read(contentAccessProvider.notifier).setForeground(true);
    expect(h.c.read(profile).records, isNull);
    await h.load();
    expect(social.calls, 2);
    expect(h.c.read(profile).records, isNotNull);
  });
  test('map sharing save clears retained profile and independently rereads saved settings', () async {
    final prefs = Preferences();
    final h = Harness(preferences: prefs);
    addTearDown(h.close);
    await h.start();
    await h.load();
    final p = accountPreferencesControllerProvider(PreferencesView.settings);
    h.c.listen(p, (_, _) {});
    await h.c.pump();
    await h.c
        .read(p.notifier)
        .saveSettings(
          CheckInVisibility.private,
          OptionalProcessingConsent.rejected,
          fieldPrivacy: const FieldPrivacy(mapSharedWithFriends: false),
        );
    expect(h.c.read(profile).records, isNull);
    expect(prefs.reads, greaterThanOrEqualTo(2));
    expect(h.c.read(p).saved, isTrue);
    expect(h.c.read(p).settings!.fieldPrivacy.mapSharedWithFriends, isFalse);
  });
  for (final success in [true, false]) {
    test(
      'unfriend success=$success clears another retained profile without inventing success',
      () async {
        final social = RemovingSocial(success);
        final h = Harness(social: social);
        addTearDown(h.close);
        await h.start();
        await h.load();
        final p = socialProfileControllerProvider('removed-peer');
        h.c.listen(p, (_, _) {});
        final controller = h.c.read(p.notifier);
        await controller.load(SocialTab.profile, date: '', timeZone: '');
        await controller.remove(expectedEpoch: controller.epoch);
        expect(h.c.read(profile).records, isNull);
        expect(h.c.read(p).removed, success);
        expect(h.c.read(p).failure != null, !success);
      },
    );
  }
  test('location removal invalidates retained map projection', () async {
    final h = Harness(place: RemovingPlace());
    addTearDown(h.close);
    await h.start();
    await h.load();
    final p = locatedCheckInControllerProvider('detail');
    h.c.listen(p, (_, _) {});
    final ctl = h.c.read(p.notifier);
    ctl.useSavedRecord(record, expectedEpoch: ctl.epoch);
    await ctl.remove(location: true, expectedEpoch: ctl.epoch);
    expect(h.c.read(profile).records, isNull);
    expect(h.c.read(p).value, isNotNull);
  });
  for (final remove in [true, false]) {
    test(
      'pending token for ${remove ? 'delete' : 'edit'} cannot dispatch after same-UID replacement',
      () async {
        final token = Completer<Result<String>>();
        var dispatched = 0;
        final client = MockClient((_) async {
          dispatched++;
          return http.Response('{}', 500);
        });
        addTearDown(client.close);
        final sessions = StreamController<AuthSession>();
        final c = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWith((_) => sessions.stream),
            checkInRepositoryProvider.overrideWithValue(
              BackendCheckInRepository(
                BackendApiClient(
                  Uri.parse('https://fixture.invalid'),
                  () => token.future,
                  httpClient: client,
                ),
              ),
            ),
          ],
        );
        addTearDown(() async {
          c.dispose();
          await sessions.close();
        });
        c.listen(checkInEditControllerProvider, (_, _) {});
        sessions.add(AuthSessionAuthenticated(subject: 'owner'));
        await c.pump();
        final ctl = c.read(checkInEditControllerProvider.notifier);
        final action = remove
            ? ctl.remove(record, expectedEpoch: ctl.epoch)
            : ctl.save(
                record,
                record.note,
                CheckInVisibility.private,
                expectedEpoch: ctl.epoch,
              );
        sessions.add(AuthSessionAuthenticated(subject: 'owner'));
        await c.pump();
        token.complete(const Success('synthetic-token'));
        await action;
        expect(dispatched, 0);
        expect(c.read(checkInEditControllerProvider).saved, isNull);
      },
    );
  }
  testWidgets('editor hides old note on same-UID session replacement', (
    tester,
  ) async {
    final h = Harness();
    addTearDown(h.close);
    await h.start();
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: h.c,
        child: MaterialApp(home: CheckInEditPage(checkIn: record)),
      ),
    );
    await tester.pump();
    expect(find.text(record.note), findsOneWidget);
    h.sessions.add(AuthSessionAuthenticated(subject: 'owner'));
    await tester.pump();
    await tester.pump();
    expect(find.text(record.note), findsNothing);
    expect(find.textContaining('Session changed.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
  testWidgets(
    'Home and See all drop old activity and use a fresh read after deletion',
    (tester) async {
      final activities = Activities();
      final h = Harness(
        records: DeletingRecords(const Success(null)),
        activities: activities,
      );
      addTearDown(h.close);
      await h.start();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: h.c,
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    FriendActivityPanel(
                      home: true,
                      onOpenProfile: (_) async {},
                    ),
                    FriendActivityPanel(
                      home: false,
                      onOpenProfile: (_) async {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Visible fixture note'), findsNWidgets(2));
      activities.visible = false;
      await h.c.read(checkInEditControllerProvider.notifier).remove(record);
      await tester.pumpAndSettle();
      expect(find.text('Visible fixture note'), findsNothing);
      expect(activities.reads, 4);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    },
  );
}

class DeletingRecords extends Records {
  DeletingRecords(this.result);
  final Result<void> result;
  @override
  Future<Result<void>> remove({
    required String checkInId,
    required int expectedRevision,
    bool Function()? isEligible,
  }) async => result;
}

class PendingDelete extends Records {
  final pending = Completer<Result<void>>();
  @override
  Future<Result<void>> remove({
    required String checkInId,
    required int expectedRevision,
    bool Function()? isEligible,
  }) => pending.future;
}

class PendingSocial extends Social {
  final pending = Completer<Result<CheckInHistoryPage>>();
  int calls = 0;
  @override
  Future<Result<CheckInHistoryPage>> records(
    String username, {
    required String date,
    required String timeZone,
    String? cursor,
  }) {
    calls++;
    return pending.future;
  }
}

class RemovingSocial extends Social {
  RemovingSocial(this.success);
  final bool success;
  @override
  Future<Result<SocialProfile>> profile(String username) async => Success(
    SocialProfile(
      username: username,
      displayName: null,
      details: const ProfileDetails(),
      relationship: SocialRelationship.friend,
      specialCare: false,
      friendshipRevision: 1,
      interests: [],
      mapAvailable: true,
      participationAvailable: false,
    ),
  );
  @override
  Future<Result<void>> remove(
    String username, {
    required int expectedRevision,
    bool Function()? isEligible,
  }) async => success ? const Success(null) : const Failure(denied);
}

class RemovingPlace implements CheckInPlaceRepository {
  @override
  Future<Result<CheckIn>> removeLocation({
    required CheckIn checkIn,
    bool Function()? isEligible,
  }) async => Success(record);
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected ${invocation.memberName}');
}

class Preferences implements AccountPreferencesRepository {
  int reads = 0;
  OwnSettings value = const OwnSettings(
    checkInVisibility: CheckInVisibility.private,
    consent: OptionalProcessingConsent.rejected,
    revision: 1,
    fieldPrivacy: FieldPrivacy(mapSharedWithFriends: true),
  );
  @override
  Future<Result<OwnSettings>> readSettings() async {
    reads++;
    return Success(value);
  }

  @override
  Future<Result<OwnSettings>> saveSettings({
    CloudAiConsent? cloudAiConsent,
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async {
    value = OwnSettings(
      checkInVisibility: visibility,
      consent: consent,
      revision: expectedRevision + 1,
      fieldPrivacy: fieldPrivacy!,
    );
    return Success(value);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected ${invocation.memberName}');
}

class Activities implements FriendActivityRepository {
  bool visible = true;
  int reads = 0;
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async {
    reads++;
    return Success(
      visible
          ? [
              FriendActivityItem(
                type: FriendActivityType.checkIn,
                sourceRecordId: 'record',
                occurredAt: record.createdAt,
                username: 'peer',
                displayName: null,
                note: 'Visible fixture note',
              ),
            ]
          : [],
    );
  }
}
