import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/friends/data/backend_social_repository.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/presentation/social_profile_controller.dart';
import 'package:enmori/features/friends/presentation/social_profile_page.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fakes.dart';

const sharedProfile = SocialProfile(
  username: 'member_b',
  displayName: 'Member B',
  details: ProfileDetails(bio: 'Shared biography'),
  relationship: SocialRelationship.friend,
  specialCare: false,
  friendshipRevision: 4,
  interests: [],
  mapAvailable: true,
  participationAvailable: false,
);
const denied = AppFailure(
  kind: AppFailureKind.addFriendTargetUnavailable,
  message: 'This profile is unavailable.',
);
final provider = socialProfileControllerProvider('member_b');
void main() {
  test('changing tabs clears all previous details before waiting and rejection leaves no stale data', () async {
    final h = await harness();
    await h.controller.load(
      SocialTab.profile,
      date: '2026-10-20',
      timeZone: 'Asia/Singapore',
    );
    expect(h.state.profile, sharedProfile);
    final pending = Completer<Result<CheckInHistoryPage>>();
    h.repository.pendingRecords = pending;
    final call = h.controller.load(
      SocialTab.records,
      date: '2026-10-20',
      timeZone: 'Asia/Singapore',
    );
    expect(h.state.profile, isNull);
    expect(h.state.records, isNull);
    expect(h.state.busy, isTrue);
    pending.complete(const Failure(denied));
    await call;
    expect(h.state.profile, isNull);
    expect(h.state.failure, denied);
  });
  test('same UID replacement invalidates in-flight profile and old confirmation epoch', () async {
    final h = await harness(), pending = Completer<Result<SocialProfile>>();
    h.repository.pendingProfile = pending;
    final call = h.controller.load(
          SocialTab.profile,
          date: '2026-10-20',
          timeZone: 'UTC',
        ),
        epoch = h.controller.epoch;
    h.auth.emit(AuthSessionAuthenticated(subject: 'same'));
    await h.container.pump();
    pending.complete(const Success(sharedProfile));
    await call;
    expect(h.state.profile, isNull);
    await h.controller.remove(expectedEpoch: epoch);
    expect(h.repository.removes, 0);
  });
  test('double remove dispatches once; successful removal clears every visible projection', () async {
    final h = await harness();
    await h.controller.load(
      SocialTab.profile,
      date: '2026-10-20',
      timeZone: 'UTC',
    );
    final epoch = h.controller.epoch, pending = Completer<Result<void>>();
    h.repository.pendingRemove = pending;
    final first = h.controller.remove(expectedEpoch: epoch);
    await h.controller.remove(expectedEpoch: epoch);
    expect(h.repository.removes, 1);
    expect(h.state.profile, isNull);
    pending.complete(const Success(null));
    await first;
    expect(h.state.removed, isTrue);
    expect(h.state.records, isNull);
    expect(h.state.month, isNull);
  });
  test('clearing a backgrounded view discards a late reply', () async {
    final h = await harness(), pending = Completer<Result<SocialProfile>>();
    h.repository.pendingProfile = pending;
    final call = h.controller.load(
      SocialTab.profile,
      date: '2026-10-20',
      timeZone: 'UTC',
    );
    h.controller.clear();
    pending.complete(const Success(sharedProfile));
    await call;
    expect(h.state.profile, isNull);
    expect(h.state.busy, isFalse);
  });
  test('exact point selection rereads the selected ID, not a guessed local calendar day', () async {
    final h = await harness();
    await h.controller.record('point-at-zone-boundary');
    expect(h.repository.readIds, ['point-at-zone-boundary']);
    expect(
      h.state.records!.checkIns.single.checkInId,
      'point-at-zone-boundary',
    );
  });
  test('HTTP parser rejects another identity, unapproved fields and malformed projection', () async {
    final body = <String, Object?>{
      'username': 'member_b',
      'displayName': 'Member B',
      'details': {
        'bio': null,
        'affiliationType': null,
        'affiliationName': null,
        'region': null,
      },
      'relationship': 'friend',
      'specialCare': false,
      'friendshipRevision': 0,
      'interests': [],
      'mapAvailable': false,
      'participationAvailable': false,
    };
    for (final response in [
      body,
      {...body, 'ownerAccountId': 'hidden'},
      {...body, 'username': 'other'},
      {...body, 'friendshipRevision': -1},
    ]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('fixture'),
        httpClient: MockClient((r) async {
          expect(r.url.path, '/v1/people/member_b');
          expect(r.headers['authorization'], 'Bearer fixture');
          return http.Response(jsonEncode(response), 200);
        }),
      );
      final result = await BackendSocialRepository(client).profile('member_b');
      client.close();
      expect(
        result,
        identical(response, body)
            ? isA<Success<SocialProfile>>()
            : isA<Failure<SocialProfile>>(),
      );
    }
  });
  testWidgets(
    'profile tabs, explicit remove confirmation and recovery remain usable at 2x text',
    (tester) async {
      final repository = SocialFake();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [socialRepositoryProvider.overrideWithValue(repository)],
          child: MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: SocialProfilePage(
              username: 'member_b',
              initialDate: '2026-10-20',
              timeZone: 'UTC',
              openAttribution: (_) async => true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Shared biography'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Remove friend'));
      await tester.tap(find.text('Remove friend'));
      await tester.pumpAndSettle();
      expect(repository.removes, 0);
      await tester.tap(find.text('Keep friend'));
      await tester.pumpAndSettle();
      expect(repository.removes, 0);
      await tester.ensureVisible(find.text('Remove friend'));
      await tester.tap(find.text('Remove friend'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Remove friend'));
      await tester.pumpAndSettle();
      expect(repository.removes, 1);
      expect(find.text('Shared biography'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}

class SocialFake implements SocialRepository {
  Completer<Result<SocialProfile>>? pendingProfile;
  Completer<Result<CheckInHistoryPage>>? pendingRecords;
  Completer<Result<void>>? pendingRemove;
  int removes = 0;
  final readIds = <String>[];
  @override
  Future<Result<SocialProfile>> profile(String username) =>
      pendingProfile?.future ?? Future.value(const Success(sharedProfile));
  @override
  Future<Result<CheckInHistoryPage>> records(
    String username, {
    required String date,
    required String timeZone,
    String? cursor,
  }) =>
      pendingRecords?.future ??
      Future.value(
        const Success(CheckInHistoryPage(checkIns: [], nextCursor: null)),
      );
  @override
  Future<Result<CheckIn>> record(String username, String id) async {
    readIds.add(id);
    return Success(
      CheckIn(
        checkInId: id,
        note: 'Point',
        createdAt: DateTime.utc(2026, 10, 20),
      ),
    );
  }

  @override
  Future<Result<SocialMonth>> month(
    String username, {
    required String month,
    required String timeZone,
  }) async => Success(
    SocialMonth(month: month, timeZone: timeZone, counts: {}, points: []),
  );
  @override
  Future<Result<FriendCare>> care(
    String username, {
    required bool specialCare,
    required int expectedRevision,
  }) async => Success(FriendCare(specialCare, expectedRevision + 1));
  @override
  Future<Result<void>> remove(
    String username, {
    required int expectedRevision,
  }) {
    removes++;
    return pendingRemove?.future ?? Future.value(const Success(null));
  }
}

Future<
  ({
    ProviderContainer container,
    FakeAuthRepository auth,
    SocialFake repository,
    SocialProfileController controller,
    SocialState Function() read,
  })
>
rawHarness() async {
  final auth = FakeAuthRepository(),
      repository = SocialFake(),
      container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          socialRepositoryProvider.overrideWithValue(repository),
        ],
      );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'same'));
  await container.read(authSessionProvider.future);
  container.listen(provider, (_, _) {});
  return (
    container: container,
    auth: auth,
    repository: repository,
    controller: container.read(provider.notifier),
    read: () => container.read(provider),
  );
}

final class Harness {
  Harness(this.container, this.auth, this.repository, this.controller);
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final SocialFake repository;
  final SocialProfileController controller;
  SocialState get state => container.read(provider);
}

Future<Harness> harness() async {
  final h = await rawHarness();
  return Harness(h.container, h.auth, h.repository, h.controller);
}
