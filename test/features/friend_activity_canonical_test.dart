import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/friends/data/backend_friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';

import 'friend_activity_display_test.dart' show Harness, event;

void main() {
  final canonical = 'tm_event_${'a' * 64}';
  for (final type in [
    FriendActivityType.interested,
    FriendActivityType.going,
  ]) {
    testWidgets(
      'canonical ${type.name} opens exact source ID after reread and clears on revoke',
      (tester) async {
        final h = Harness()
          ..rows = [
            {
              ...event,
              'type': type.wire,
              'event': {'eventId': canonical, 'title': 'Canonical title'},
            },
          ];
        addTearDown(h.dispose);
        await tester.pumpWidget(
          h.widget(
            source: FriendActivityLocator('member_a', type, 'participation_a'),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Canonical title'), findsOneWidget);
        await tester.ensureVisible(find.text('Open event'));
        await tester.tap(find.text('Open event'));
        await tester.pumpAndSettle();
        expect(h.opened, [canonical]);
        h.rows = [];
        await tester.tap(find.text('Open event'));
        await tester.pumpAndSettle();
        expect(h.opened, [canonical]);
        expect(find.text('Canonical title'), findsNothing);
      },
    );
  }
  for (final invalid in [
    'tm_opaque',
    'tm_event_${'A' * 64}',
    'tm_event_${'a' * 63}',
    'tm_event_${'a' * 64}\n',
  ]) {
    test('opaque/malformed ID rejected: ${jsonEncode(invalid)}', () async {
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'activities': [
                {
                  ...event,
                  'event': {'eventId': invalid, 'title': 'Invalid'},
                },
              ],
            }),
            200,
          ),
        ),
      );
      addTearDown(client.close);
      expect(
        await BackendFriendActivityRepository(client).read(home: true),
        isA<Failure<List<FriendActivityItem>>>(),
      );
    });
  }
}
