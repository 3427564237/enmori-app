import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/presentation/participant_preview.dart';
import 'package:enmori/features/event_participation/presentation/participants_page.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response page({String? name, String? cursor}) => http.Response(
  jsonEncode({
    'items': [
      if (name != null) {'username': name},
    ],
    'countState': 'unavailable',
    'nextCursor': ?cursor,
  }),
  200,
  headers: {'content-type': 'application/json'},
);

void main() {
  for (final sparse in [false, true]) {
    testWidgets(
      'preview only falls back after an exhausted empty friends page: sparse=$sparse',
      (tester) async {
        final groups = <String>[];
        ParticipantSelection? opened;
        final client = BackendApiClient(
          Uri.https('controlled.invalid'),
          () async => const Success('synthetic'),
          httpClient: MockClient((request) async {
            final group = request.url.queryParameters['group']!;
            groups.add(group);
            return group == 'friends'
                ? page(cursor: sparse ? 'opaque_next' : null)
                : page(name: 'visible_person');
          }),
        );
        addTearDown(client.close);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'synthetic')),
              ),
              participationRepositoryProvider.overrideWithValue(
                BackendParticipationRepository(client),
              ),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: ParticipantPreview(
                  eventId: 'event-a',
                  onSeeAll: (selection) => opened = selection,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(groups, sparse ? ['friends'] : ['friends', 'friends', 'others']);
        expect(
          find.text('visible_person'),
          sparse ? findsNothing : findsOneWidget,
        );
        expect(find.textContaining('0 participants'), findsNothing);
        await tester.tap(find.text('See all participants'));
        expect(opened?.status, ParticipationStatus.going);
        expect(
          opened?.group,
          sparse ? ParticipantGroup.friends : ParticipantGroup.others,
        );
      },
    );
  }
  testWidgets(
    'participant filter switch drops late rows from the previous group',
    (tester) async {
      final old = Completer<http.Response>();
      final queries = <String>[];
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) {
          final group = request.url.queryParameters['group']!;
          queries.add(group);
          return group == 'friends'
              ? old.future
              : Future.value(page(name: 'current_person'));
        }),
      );
      addTearDown(client.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'synthetic')),
            ),
            participationRepositoryProvider.overrideWithValue(
              BackendParticipationRepository(client),
            ),
          ],
          child: MaterialApp(
            home: EventParticipantsPage(
              selection: (
                eventId: 'event-a',
                status: ParticipationStatus.going,
                group: ParticipantGroup.friends,
              ),
              onProfile: (_) {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.text('Others'));
      await tester.pumpAndSettle();
      old.complete(page(name: 'stale_person'));
      await tester.pumpAndSettle();
      expect(queries, ['friends', 'others']);
      expect(find.text('current_person'), findsOneWidget);
      expect(find.text('stale_person'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
