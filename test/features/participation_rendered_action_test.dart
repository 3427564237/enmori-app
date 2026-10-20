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
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_controls.dart';

void main() {
  for (final replacement in [
    'other-uid',
    'same-uid',
    'same-session-new-facts',
  ]) {
    for (final label in [
      'Interested',
      'Going',
      'Cancel participation',
      'Ignore recommendation',
    ]) {
      testWidgets(
        'old $label cannot adopt $replacement session/facts before repaint',
        (tester) async {
          final sessions = StreamController<AuthSession>();
          addTearDown(sessions.close);
          var ignored = false, revision = 1;
          final writes = <Map<String, dynamic>>[];
          final client = BackendApiClient(
            Uri.https('controlled.invalid'),
            () async => const Success('synthetic'),
            httpClient: MockClient((req) async {
              if (req.method == 'PUT') {
                writes.add(jsonDecode(req.body) as Map<String, dynamic>);
              }
              return http.Response(
                jsonEncode({
                  'participation': {
                    'eventId': 'event-a',
                    'status': 'going',
                    'ignored': ignored,
                    'revision': revision,
                    'updatedAt': '2026-10-20T00:00:00.000Z',
                  },
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }),
          );
          addTearDown(client.close);
          final container = ProviderContainer(
            overrides: [
              authSessionProvider.overrideWith((ref) => sessions.stream),
              participationRepositoryProvider.overrideWithValue(
                BackendParticipationRepository(client),
              ),
            ],
          );
          addTearDown(container.dispose);
          await tester.pumpWidget(
            UncontrolledProviderScope(
              container: container,
              child: MaterialApp(
                theme: ThemeData(splashFactory: NoSplash.splashFactory),
                home: const Scaffold(
                  body: ParticipationControls(eventId: 'event-a'),
                ),
              ),
            ),
          );
          sessions.add(AuthSessionAuthenticated(subject: 'synthetic-a'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('Read participation'));
          await tester.pumpAndSettle();
          expect(find.text('Ignore recommendation'), findsOneWidget);
          await tester.runAsync(() async {
            if (replacement != 'same-session-new-facts') {
              sessions.add(
                AuthSessionAuthenticated(
                  subject: replacement == 'other-uid'
                      ? 'synthetic-b'
                      : 'synthetic-a',
                ),
              );
              await Future<void>.delayed(Duration.zero);
            }
            ignored = true;
            revision = 7;
            // Read current provider state, deliberately without pumping a Flutter frame.
            await container
                .read(participationControllerProvider.notifier)
                .load('event-a');
          });
          expect(
            container
                .read(participationControllerProvider)['event-a']!
                .value!
                .revision,
            7,
          );
          // Actual still-rendered button hit, not direct invocation of a discarded closure.
          await tester.tap(find.text(label));
          expect(writes, isEmpty);
          await tester.pumpAndSettle();
          await tester.tap(find.text('Cancel participation'));
          await tester.pumpAndSettle();
          expect(writes.single, {
            'status': 'none',
            'ignored': true,
            'expectedRevision': 7,
          });
          await tester.pumpWidget(const SizedBox());
        },
      );
    }
  }
}
