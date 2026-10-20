import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/data/backend_friend_activity_repository.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/presentation/check_in_points_map.dart';
import 'package:enmori/features/weather/domain/weather.dart';

import '../support/fakes.dart';

const failure = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Activity is unavailable.',
);
void main() {
  test('recommendation result and pending count have independent failures; replacement session discards late result', () async {
    final auth = FakeAuthRepository(),
        repo = DiscoveryFake(),
        container = ProviderContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(auth),
            friendDiscoveryRepositoryProvider.overrideWithValue(repo),
          ],
        );
    addTearDown(auth.close);
    addTearDown(container.dispose);
    container.listen(authSessionProvider, (_, _) {});
    auth.emit(AuthSessionAuthenticated(subject: 'same'));
    await container.read(authSessionProvider.future);
    final provider = friendDiscoveryControllerProvider(true);
    container.listen(provider, (_, _) {});
    final controller = container.read(provider.notifier);
    await controller.load();
    expect(container.read(provider).loaded, isTrue);
    expect(container.read(provider).pendingCount, isNull);
    expect(container.read(provider).countFailure, failure);
    final pending = Completer<Result<List<FriendSuggestion>>>();
    repo.pending = pending;
    final call = controller.load();
    auth.emit(AuthSessionAuthenticated(subject: 'same'));
    await container.pump();
    pending.complete(const Success([]));
    await call;
    expect(container.read(provider).loaded, isFalse);
    expect(container.read(provider).suggestions, isEmpty);
  });
  test('Activity client rejects unapproved content and wrong category, while keeping Backend order', () async {
    final row = {
      'type': 'check_in_created',
      'sourceRecordId': 'check1',
      'occurredAt': '2026-10-20T00:00:00.000Z',
      'username': 'member_a',
      'displayName': 'A',
      'checkIn': {'note': 'Authorized note', 'mood': 'Calm'},
    };
    for (final data in [
      row,
      {...row, 'note': 'private content'},
      {...row, 'type': 'event_going'},
    ]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('fixture'),
        httpClient: MockClient((request) async {
          expect(request.url.queryParameters, {
            'view': 'home',
            'category': 'check_in_created',
          });
          return http.Response(
            jsonEncode({
              'activities': [data],
            }),
            200,
          );
        }),
      );
      final result = await BackendFriendActivityRepository(client)
          .read(home: true, category: FriendActivityType.checkIn);
      client.close();
      expect(
        result,
        identical(data, row)
            ? isA<Success<List<FriendActivityItem>>>()
            : isA<Failure<List<FriendActivityItem>>>(),
      );
    }
  });
  testWidgets(
    'Activity clears old items before category wait and shows unavailable separately from empty',
    (tester) async {
      final repo = ActivityFake();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            friendActivityRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWith(
              (ref) =>
                  Stream.value(AuthSessionAuthenticated(subject: 'fixture')),
            ),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: FriendActivityPanel(
                  home: false,
                  onOpenProfile: (_) async {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Visible friend'), findsOneWidget);
      repo.result = const Failure(failure);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Created a Check-in'));
      await tester.pumpAndSettle();
      expect(find.text('Visible friend'), findsNothing);
      expect(find.text(failure.message), findsOneWidget);
      expect(find.text('No friends activity to show.'), findsNothing);
    },
  );
  testWidgets(
    'map retains visible attribution and accessible exact-record fallback without tile traffic',
    (tester) async {
      final point = CheckInMapPoint(
        checkInId: 'exact-record',
        createdAt: DateTime.utc(2026, 10, 20),
        location: const GeoPoint(1.3521, 103.8198),
      );
      CheckInMapPoint? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: CheckInPointsMap(
                points: [point],
                onSelect: (p) => selected = p,
                openAttribution: (_) async => false,
                tileLayerBuilder: () => const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(TextButton, '© OpenStreetMap contributors'),
        findsOneWidget,
      );
      expect(find.text('Check-in point connections'), findsOneWidget);
      final button = find.byType(ListTile);
      expect(button, findsOneWidget);
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pump();
      expect(selected, point);
      expect(tester.takeException(), isNull);
    },
  );
}

class DiscoveryFake implements FriendDiscoveryRepository {
  Completer<Result<List<FriendSuggestion>>>? pending;
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({required bool home}) =>
      pending?.future ?? Future.value(const Success([]));
  @override
  Future<Result<int>> pendingCount() async => const Failure(failure);
}

class ActivityFake implements FriendActivityRepository {
  Result<List<FriendActivityItem>> result = Success([
    FriendActivityItem(
      type: FriendActivityType.checkIn,
      sourceRecordId: 'a',
      occurredAt: DateTime.utc(2026, 10, 20),
      username: 'member_a',
      displayName: 'Visible friend',
    ),
  ]);
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async => result;
}
