import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/friends/presentation/friend_module_page.dart';
import 'package:enmori/features/friends/social_providers.dart';

import '../features/social_profile_flow_test.dart' show SocialFake;

import 'package:enmori/app/providers.dart';
import 'package:enmori/app/remote_social_composition.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  for (final entry in ['home', 'all', 'friends']) {
    for (final detail in [false, true]) {
      testWidgets(
        'Activity profile opens and returns: entry=$entry detail=$detail',
        (tester) async {
          final router = GoRouter(
            initialLocation: entry == 'friends' ? '/friends' : '/',
            routes: [
              GoRoute(
                path: '/',
                builder: (_, _) => const Scaffold(
                  body: SingleChildScrollView(child: GroupHomeSocial()),
                ),
              ),
              GoRoute(
                path: '/people/:username',
                builder: (_, state) => ConnectedSocialProfile(
                  username: state.pathParameters['username']!,
                ),
              ),
              GoRoute(
                path: '/friends',
                builder: (_, _) =>
                    FriendModulePage(openAttribution: (_) async => false),
              ),
            ],
          );
          final activity = _Activity();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                authSessionProvider.overrideWithValue(
                  const AsyncData(AuthSessionAuthenticated(subject: 'viewer')),
                ),
                routerGateProvider.overrideWithValue(
                  RouterGateState.authenticated,
                ),
                friendActivityRepositoryProvider.overrideWithValue(activity),
                socialRepositoryProvider.overrideWithValue(SocialFake()),
                historyDevicePortProvider.overrideWithValue(_Device()),
                friendDiscoveryRepositoryProvider.overrideWithValue(
                  _Discovery(),
                ),
              ],
              child: MaterialApp.router(routerConfig: router),
            ),
          );
          await tester.pumpAndSettle();
          if (entry == 'friends') {
            await tester.tap(find.widgetWithText(Tab, 'Activity'));
            await tester.pumpAndSettle();
          }
          if (entry == 'all') {
            await tester.ensureVisible(find.text('See all activity'));
            await tester.tap(find.text('See all activity'));
            await tester.pumpAndSettle();
          }
          if (detail) {
            await tester.ensureVisible(find.text('View activity'));
            await tester.tap(find.text('View activity'));
            await tester.pumpAndSettle();
          }
          await tester.ensureVisible(find.text('View Profile'));
          await tester.tap(find.text('View Profile'));
          await tester.pumpAndSettle();
          expect(find.text('Shared biography'), findsOneWidget);
          await tester.pageBack();
          await tester.pumpAndSettle();
          expect(find.text('View Profile'), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          router.dispose();
        },
      );
    }
  }
}

class _Activity implements FriendActivityRepository {
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async => Success([
    FriendActivityItem(
      username: 'member_b',
      displayName: 'Friend One',
      type: FriendActivityType.checkIn,
      sourceRecordId: 'record-one',
      occurredAt: DateTime.utc(2026, 11, 16),
      note: 'A walk by the water',
    ),
  ]);
}

class _Discovery implements FriendDiscoveryRepository {
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => const Success([]);
}

class _Device implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String zone) async => DateTime.utc(2026, 11, 16);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String zone,
  ) async => instants.map((v) => v.toString()).toList();
}
