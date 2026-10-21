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
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/external_registration_action.dart';
import 'package:enmori/features/event_participation/presentation/participation_controls.dart';
import 'package:enmori/features/event_participation/presentation/participants_page.dart';

final class _Opener implements ExternalActivityOpener {
  @override
  Future<bool> open(Uri sourceUrl, {required bool Function() current}) async =>
      current();
}

ThemeData get _theme => ThemeData(splashFactory: NoSplash.splashFactory);
void main() {
  testWidgets(
    'ordinary parent rebuild with fresh callbacks preserves in-flight browser return',
    (tester) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      late StateSetter rebuild;
      var version = 0;
      final writes = <int>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
          ],
          child: MaterialApp(
            theme: _theme,
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) {
                  rebuild = setState;
                  return ExternalRegistrationAction(
                    eventId: 'event-a',
                    sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
                    opener: _Opener(),
                    confirmGoing: (_) async {
                      writes.add(version);
                      return const Success(null);
                    },
                    readGoing: (_) async => const Success(true),
                  );
                },
              ),
            ),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic-member'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Register on organiser website'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open website'));
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      rebuild(() => version = 1);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.text('Did you complete registration?'), findsOneWidget);
      await tester.tap(find.text('Yes, mark Going'));
      await tester.pumpAndSettle();
      expect(writes, [1]);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(writes, [1]);
      expect(find.text('Did you complete registration?'), findsNothing);
    },
  );
  testWidgets(
    'two surfaces share committed participation with one pending write',
    (tester) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      var status = 'none', revision = 0, writes = 0;
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((req) async {
          if (req.method == 'PUT') {
            writes++;
            final body = jsonDecode(req.body) as Map<String, dynamic>;
            status = body['status'] as String;
            revision++;
          }
          return http.Response(
            jsonEncode({
              'participation': {
                'eventId': 'event-a',
                'status': status,
                'ignored': false,
                'revision': revision,
                if (revision > 0) 'updatedAt': '2026-10-20T00:00:00.000Z',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
            participationRepositoryProvider.overrideWithValue(
              BackendParticipationRepository(client),
            ),
          ],
          child: MaterialApp(
            theme: _theme,
            home: const Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    ParticipationControls(eventId: 'event-a'),
                    ParticipationControls(eventId: 'event-a'),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic-member'));
      await tester.pumpAndSettle();
      // Auth observation arrives after first post-frame load, so explicitly read.
      await tester.tap(find.text('Read participation').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Going').first);
      await tester.pumpAndSettle();
      expect(writes, 1);
      expect(find.text('Your participation: going'), findsNWidgets(2));
    },
  );
  testWidgets(
    'sparse page Next retries same cursor and profile callback carries Username',
    (tester) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final seen = <String?>[];
      var failed = false;
      String? profile;
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((req) async {
          final cursor = req.url.queryParameters['cursor'];
          seen.add(cursor);
          if (cursor != null && !failed) {
            failed = true;
            return http.Response(
              jsonEncode({
                'error': {
                  'code': 'SERVICE_UNAVAILABLE',
                  'message': 'Try again',
                  'requestId': 'fixture',
                },
              }),
              503,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode(
              cursor == null
                  ? {
                      'items': [],
                      'countState': 'exact',
                      'visibleCount': 1,
                      'nextCursor': 'opaque_next',
                    }
                  : {
                      'items': [
                        {'username': 'member_b'},
                      ],
                      'countState': 'exact',
                      'visibleCount': 1,
                    },
            ),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
            participationRepositoryProvider.overrideWithValue(
              BackendParticipationRepository(client),
            ),
          ],
          child: MaterialApp(
            theme: _theme,
            home: EventParticipantsPage(
              selection: (
                eventId: 'event-a',
                status: ParticipationStatus.going,
                group: ParticipantGroup.others,
              ),
              onProfile: (name) => profile = name,
            ),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic-member'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reload participants'));
      await tester.pumpAndSettle();
      expect(find.text('Next page'), findsOneWidget);
      await tester.tap(find.text('Next page'));
      await tester.pumpAndSettle();
      expect(find.text('Retry same page'), findsOneWidget);
      await tester.tap(find.text('Retry same page'));
      await tester.pumpAndSettle();
      expect(seen.where((s) => s == 'opaque_next').length, 2);
      await tester.tap(find.text('member_b'));
      await tester.pump();
      expect(profile, 'member_b');
    },
  );
}
