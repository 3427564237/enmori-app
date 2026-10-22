import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/data/backend_friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';

final checkIn = <String, Object?>{
  'type': 'check_in_created',
  'sourceRecordId': 'check_a',
  'username': 'member_a',
  'displayName': 'Visible friend',
  'occurredAt': '2026-10-20T00:00:00.000Z',
  'checkIn': {'note': 'A shared walk', 'mood': 'Calm'},
};
final event = <String, Object?>{
  'type': 'event_interested',
  'sourceRecordId': 'participation_a',
  'username': 'member_a',
  'displayName': 'Visible friend',
  'occurredAt': '2026-10-20T00:00:00.000Z',
  'event': {'eventId': 'event_a', 'title': 'Current Event'},
};
void main() {
  for (final entry in <String, Map<String, Object?>>{
    'check-in': checkIn,
    'event': event,
    'mixed': {...checkIn, 'event': event['event']},
    'location': {
      ...checkIn,
      'checkIn': {
        'note': 'A shared walk',
        'location': {'latitude': 1, 'longitude': 2},
      },
    },
    'null mood': {
      ...checkIn,
      'checkIn': {'note': 'A shared walk', 'mood': null},
    },
    'legacy browse ID': {
      ...event,
      'event': {'eventId': 'tm_opaque', 'title': 'Invalid'},
    },
    'noncanonical timestamp': {
      ...checkIn,
      'occurredAt': '2026-10-20T00:00:00Z',
    },
    'unknown content': {
      ...event,
      'event': {
        'eventId': 'event_a',
        'title': 'Event',
        'privateNote': 'denied',
      },
    },
  }.entries) {
    test('strict display projection ${entry.key}', () async {
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'activities': [entry.value],
            }),
            200,
          ),
        ),
      );
      addTearDown(client.close);
      final result = await BackendFriendActivityRepository(client)
          .read(home: true);
      expect(
        result,
        entry.key == 'check-in' || entry.key == 'event'
            ? isA<Success<List<FriendActivityItem>>>()
            : isA<Failure<List<FriendActivityItem>>>(),
      );
    });
  }
  testWidgets(
    'Home and exact activity Detail re-read current content; revoke removes old Note and Mood at 2x text',
    (tester) async {
      final h = Harness();
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget(textScale: 2));
      await tester.pumpAndSettle();
      expect(find.text('A shared walk'), findsOneWidget);
      expect(find.text('Mood at this Check-in: Calm'), findsOneWidget);
      expect(h.requests.single['view'], 'home');
      h.rows = [
        {
          ...checkIn,
          'checkIn': {'note': 'Fresh authorized note', 'mood': 'Hopeful'},
        },
      ];
      await tester.ensureVisible(find.text('View activity'));
      await tester.tap(find.text('View activity'));
      await tester.pumpAndSettle();
      expect(h.requests.last, {'view': 'all', 'category': 'check_in_created'});
      expect(find.text('A shared walk'), findsNothing);
      expect(find.text('Fresh authorized note'), findsOneWidget);
      h.rows = [];
      await tester.ensureVisible(find.byTooltip('Reload activity'));
      await tester.tap(find.byTooltip('Reload activity'));
      await tester.pumpAndSettle();
      expect(find.text('Fresh authorized note'), findsNothing);
      expect(find.textContaining('Hopeful'), findsNothing);
      expect(
        find.text('This activity is no longer available under current access.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'Event callback carries stable ID only after fresh source read; revoked source cannot open',
    (tester) async {
      final h = Harness()..rows = [event];
      addTearDown(h.dispose);
      await tester.pumpWidget(
        h.widget(
          source: const FriendActivityLocator(
            'member_a',
            FriendActivityType.interested,
            'participation_a',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Current Event'), findsOneWidget);
      await tester.ensureVisible(find.text('Open event'));
      await tester.tap(find.text('Open event'));
      await tester.pumpAndSettle();
      expect(h.opened, ['event_a']);
      h.rows = [];
      await tester.tap(find.text('Open event'));
      await tester.pumpAndSettle();
      expect(h.opened, ['event_a']);
      expect(find.text('Current Event'), findsNothing);
    },
  );
  testWidgets(
    'late response after same UID session replacement cannot restore content',
    (tester) async {
      final h = Harness();
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      final pending = Completer<http.Response>();
      h.pending = pending;
      await tester.ensureVisible(find.byTooltip('Reload activity'));
      await tester.tap(find.byTooltip('Reload activity'));
      await tester.pump();
      expect(find.text('A shared walk'), findsNothing);
      h.rows = [];
      h.sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
      await tester.pump();
      pending.complete(
        http.Response(
          jsonEncode({
            'activities': [checkIn],
          }),
          200,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('A shared walk'), findsNothing);
    },
  );
  testWidgets(
    'old visible activity callback cannot navigate across session before repaint',
    (tester) async {
      final h = Harness();
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      final calls = h.requests.length;
      await tester.runAsync(() async {
        h.sessions.add(AuthSessionAuthenticated(subject: 'replacement'));
        await Future<void>.delayed(Duration.zero);
      });
      await tester.ensureVisible(find.text('View activity'));
      await tester.tap(find.text('View activity'));
      await tester.pumpAndSettle();
      expect(h.requests.skip(calls).every((q) => q['view'] == 'home'), isTrue);
      expect(find.byType(BackButton), findsNothing);
    },
  );
  testWidgets(
    'background and unavailable read clear content; empty is a different state',
    (tester) async {
      final h = Harness();
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      expect(find.text('A shared walk'), findsNothing);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      h.status = 503;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.text('No friends activity to show.'), findsNothing);
      expect(find.text('A shared walk'), findsNothing);
      h.status = 200;
      h.rows = [];
      await tester.tap(find.byTooltip('Reload activity'));
      await tester.pumpAndSettle();
      expect(find.text('No friends activity to show.'), findsOneWidget);
    },
  );
}

class Harness {
  final sessions = StreamController<AuthSession>();
  final requests = <Map<String, String>>[], opened = <String>[];
  List<Map<String, Object?>> rows = [checkIn];
  int status = 200;
  Completer<http.Response>? pending;
  late final client = BackendApiClient(
    Uri.https('controlled.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient((request) async {
      requests.add(request.url.queryParameters);
      final held = pending;
      pending = null;
      return held?.future ??
          http.Response(
            jsonEncode(
              status == 200
                  ? {'activities': rows}
                  : {
                      'error': {
                        'code': 'SERVICE_UNAVAILABLE',
                        'message': 'Unavailable',
                        'requestId': 'synthetic',
                      },
                    },
            ),
            status,
          );
    }),
  );
  late final container = ProviderContainer(
    overrides: [
      authSessionProvider.overrideWith((ref) async* {
        yield AuthSessionAuthenticated(subject: 'synthetic');
        yield* sessions.stream;
      }),
      friendActivityRepositoryProvider.overrideWithValue(
        BackendFriendActivityRepository(client),
      ),
    ],
  );
  Widget widget({double textScale = 1, FriendActivityLocator? source}) =>
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: ThemeData(splashFactory: NoSplash.splashFactory),
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
            child: Scaffold(
              body: SingleChildScrollView(
                child: FriendActivityPanel(
                  home: source == null,
                  source: source,
                  onOpenProfile: (_) async {},
                  onOpenEvent: (id) async {
                    opened.add(id);
                  },
                  onSeeAll: () async {},
                ),
              ),
            ),
          ),
        ),
      );
  Future<void> dispose() async {
    container.dispose();
    client.close();
    await sessions.close();
  }
}
