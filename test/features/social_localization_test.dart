import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_participation/presentation/external_registration_action.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/presentation/friend_page.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' show Opener;

final class Friends implements FriendRepository {
  final lookups = <({String username, bool send})>[];
  bool accepted = false;
  @override
  Future<Result<FriendTarget>> lookup(
    String username, {
    bool send = false,
  }) async {
    lookups.add((username: username, send: send));
    return Success(
      FriendTarget(
        username: username,
        displayName: 'Original Display Name',
        relationship: send
            ? RelationshipState.outgoingRequestPending
            : RelationshipState.canSendRequest,
      ),
    );
  }

  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) async => Success(
    FriendInbox(
      requests: accepted
          ? []
          : [
              const FriendRequest(
                username: 'member_b',
                displayName: 'Going',
                requestRef: 'request-b',
              ),
            ],
    ),
  );
  @override
  Future<Result<String>> act(String requestRef, {required bool accept}) async {
    accepted = accept;
    return const Success('accepted');
  }

  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async => const Success(MyFriendsPage(friends: []));
}

Widget localized(Widget child, {Locale locale = const Locale('zh')}) =>
    ProviderScope(
      child: MaterialApp(
        locale: locale,
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: enmoriTheme(),
        home: child,
      ),
    );

void main() {
  testWidgets(
    'Chinese exact Username lookup sends unchanged identity and localizes request feedback',
    (tester) async {
      final repo = Friends();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            friendRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'a')),
            ),
          ],
          child: localized(const FriendPage()),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Going'),
        findsOneWidget,
      ); // User display name is not translated.
      await tester.enterText(
        find.byKey(const Key('friend-username')),
        'member_a',
      );
      await tester.tap(find.text('查找用户'));
      await tester.pumpAndSettle();
      expect(repo.lookups.single, (username: 'member_a', send: false));
      expect(find.text('Original Display Name'), findsOneWidget);
      await tester.ensureVisible(find.text('发送请求'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('发送请求'));
      await tester.pumpAndSettle();
      expect(repo.lookups.last, (username: 'member_a', send: true));
      expect(find.text('请求已发送'), findsOneWidget);
      await tester.ensureVisible(find.text('接受'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('接受'));
      await tester.pumpAndSettle();
      expect(find.text('已接受好友请求。'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Chinese activity labels preserve friend name, Mood and source title',
    (tester) async {
      await tester.pumpWidget(
        localized(
          Scaffold(
            body: Column(
              children: [
                FriendActivityContent(
                  item: FriendActivityItem(
                    type: FriendActivityType.going,
                    sourceRecordId: 'source',
                    occurredAt: DateTime.utc(2026),
                    username: 'member_a',
                    displayName: 'Interested',
                    eventId: 'event_a',
                    eventTitle: 'Going',
                  ),
                ),
                FriendActivityContent(
                  item: FriendActivityItem(
                    type: FriendActivityType.checkIn,
                    sourceRecordId: 'note',
                    occurredAt: DateTime.utc(2026),
                    username: 'member_a',
                    displayName: null,
                    note: 'Original note',
                    mood: 'Calm',
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      expect(find.text('Interested'), findsOneWidget);
      expect(find.text('Going'), findsOneWidget);
      final goingContent = find.byWidgetPredicate(
        (widget) =>
            widget is FriendActivityContent &&
            widget.item.type == FriendActivityType.going,
      );
      expect(goingContent, findsOneWidget);
      expect(
        find.descendant(of: goingContent, matching: find.text('@member_a')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: goingContent, matching: find.text('将参加活动')),
        findsOneWidget,
      );
      expect(find.text('Original note'), findsOneWidget);
      expect(find.text('这次签到的心情：Calm'), findsOneWidget);
    },
  );

  testWidgets(
    'Chinese third-party disclosure keeps cancellation a no-write action',
    (tester) async {
      var saves = 0;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'a')),
            ),
          ],
          child: localized(
            Scaffold(
              body: ExternalRegistrationAction(
                eventId: 'event-a',
                sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
                opener: Opener(),
                confirmGoing: (_) async {
                  saves++;
                  return const Success(null);
                },
                readGoing: (_) async => const Success(false),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('官网报名／购票'));
      await tester.pumpAndSettle();
      expect(find.text('前往官网报名／购票？'), findsOneWidget);
      expect(find.textContaining('打开网页不会自动标记为将参加'), findsOneWidget);
      await tester.tap(find.text('取消'));
      await tester.pumpAndSettle();
      expect(saves, 0);
      expect(find.text('官网报名／购票'), findsOneWidget);
    },
  );
}
