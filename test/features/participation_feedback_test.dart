import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/event_recommendation_card.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_controls.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets(
    'plan buttons toggle off and switch directly with fresh revisions',
    (tester) async {
      final peer = _Peer()..status = 'none';
      await _pump(
        tester,
        peer,
        const ParticipationControls(eventId: 'event-a'),
      );
      for (final step in [
        ('Interested', 'interested'),
        ('Interested', 'none'),
        ('Going', 'going'),
        ('Going', 'none'),
        ('Interested', 'interested'),
        ('Going', 'going'),
        ('Interested', 'interested'),
      ]) {
        final revision = peer.revision;
        await tester.tap(find.text(step.$1));
        // A second stale tap cannot submit the same rendered revision again.
        await tester.tap(find.text(step.$1));
        await tester.pumpAndSettle();
        expect(peer.writes.last, {
          'status': step.$2,
          'ignored': false,
          'expectedRevision': revision,
        });
        expect(peer.writes.length, revision);
        if (step.$2 != 'none') {
          expect(
            find.ancestor(
              of: find.text(step.$1),
              matching: find.byWidgetPredicate(
                (w) => w is Semantics && w.properties.selected == true,
              ),
            ),
            findsOneWidget,
          );
        }
      }
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Home production card groups plans and hides only after confirmed ignore',
    (tester) async {
      final peer = _Peer();
      await _pump(
        tester,
        peer,
        ConnectedRecommendationCard(
          event: EventRecommendation(
            eventId: 'event-a',
            title: 'An evening of music at the gardens',
            startAt: DateTime.utc(2026, 10, 24),
            matchedInterests: const [
              MatchedInterest(interestTagId: 'music', displayName: 'Music'),
            ],
            reasonCode: 'interest_match',
          ),
          onOpen: (_) {},
        ),
      );
      expect(find.text('Interested'), findsOneWidget);
      expect(find.text('Going'), findsOneWidget);
      expect(find.text('Read participation'), findsNothing);
      expect(find.text('Cancel participation'), findsNothing);
      expect(
        find.descendant(
          of: find.byType(Card),
          matching: find.byType(ParticipationControls),
        ),
        findsOneWidget,
      );
      await tester.tap(find.byTooltip('More event options'));
      await tester.pumpAndSettle();
      expect(find.text('Cancel participation'), findsOneWidget);
      await tester.tap(find.text('Ignore recommendation'));
      await tester.pumpAndSettle();
      expect(peer.writes.single, {
        'status': 'going',
        'ignored': true,
        'expectedRevision': 1,
      });
      expect(find.byType(Card), findsNothing);
    },
  );

  testWidgets(
    'unknown participation exposes a read and never repeats the write',
    (tester) async {
      final peer = _Peer()..failWrite = true;
      await _pump(
        tester,
        peer,
        const ParticipationControls(eventId: 'event-a'),
      );
      await tester.tap(find.text('Interested'));
      await tester.pumpAndSettle();
      expect(peer.writes, hasLength(1));
      expect(find.text('Check current plans'), findsOneWidget);
      expect(
        tester
            .widget<OutlinedButton>(
              find.widgetWithText(OutlinedButton, 'Interested'),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<PopupMenuButton<VoidCallback>>(
              find.byType(PopupMenuButton<VoidCallback>),
            )
            .enabled,
        isFalse,
      );
      peer.pendingRead = Completer<http.Response>();
      await tester.tap(find.text('Check current plans'));
      await tester.pump();
      expect(find.text('Checking your participation…'), findsOneWidget);
      expect(find.text('Check current plans'), findsNothing);
      expect(peer.writes, hasLength(1));
      peer.pendingRead!.complete(peer.response());
      await tester.pumpAndSettle();
      expect(find.text('Check current plans'), findsNothing);
      expect(peer.writes, hasLength(1));
      expect(peer.reads, 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('detail options retain cancel and restore at large text', (
    tester,
  ) async {
    final peer = _Peer()..ignored = true;
    await _pump(
      tester,
      peer,
      const ParticipationControls(eventId: 'event-a'),
      scale: 2,
    );
    expect(find.text('Hidden from recommendations'), findsOneWidget);
    await tester.tap(find.byTooltip('More event options'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Restore recommendation'));
    await tester.pumpAndSettle();
    expect(peer.writes.single, {
      'status': 'going',
      'ignored': false,
      'expectedRevision': 1,
    });
    await tester.tap(find.byTooltip('More event options'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel participation'));
    await tester.pumpAndSettle();
    expect(peer.writes.last, {
      'status': 'none',
      'ignored': false,
      'expectedRevision': 2,
    });
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester,
  _Peer peer,
  Widget child, {
  double scale = 1,
}) async {
  tester.view.physicalSize = const Size(375, 812);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final client = BackendApiClient(
    Uri.https('preview.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient(peer.handle),
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
        theme: enmoriTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _Peer {
  String status = 'going';
  bool ignored = false, failWrite = false;
  int revision = 1, reads = 0;
  Completer<http.Response>? pendingRead;
  final writes = <Map<String, dynamic>>[];
  http.Response response() => http.Response(
    jsonEncode({
      'participation': {
        'eventId': 'event-a',
        'status': status,
        'ignored': ignored,
        'revision': revision,
        'updatedAt': '2026-10-21T09:00:00.000Z',
      },
    }),
    200,
    headers: {'content-type': 'application/json'},
  );
  Future<http.Response> handle(http.Request request) async {
    if (request.method == 'PUT') {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      writes.add(body);
      if (failWrite) return http.Response('{}', 503);
      status = body['status'] as String;
      ignored = body['ignored'] as bool;
      revision++;
    } else {
      reads++;
      if (pendingRead != null) return pendingRead!.future;
    }
    return response();
  }
}
