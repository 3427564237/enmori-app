import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' show PlansRepo, Opener, pauseApp, resumeApp;

final class _QueuedDetails implements EventDetailRepository {
  final reads = <Completer<Result<EventDetail>>>[];

  @override
  Future<Result<EventDetail>> read(String eventId) {
    final read = Completer<Result<EventDetail>>();
    reads.add(read);
    return read.future;
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

EventDetail _event(String title) => EventDetail(
  eventId: 'a',
  title: title,
  startAt: DateTime.utc(2027),
  externalSourceUrl: 'https://www.ticketmaster.sg/event/synthetic',
);

const _failure = Failure<EventDetail>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Synthetic source temporarily unavailable.',
  ),
);

Future<void> _pump(
  WidgetTester tester,
  _QueuedDetails details, {
  Stream<AuthSession>? sessions,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        if (sessions == null)
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
          )
        else
          authSessionProvider.overrideWith((ref) => sessions),
        participationRepositoryProvider.overrideWithValue(PlansRepo()),
        eventDetailRepositoryProvider.overrideWithValue(details),
      ],
      child: MaterialApp(
        home: Consumer(
          builder: (context, ref, _) {
            // The real router resolves authentication before mounting this page.
            if (ref.watch(authSessionProvider).asData?.value
                is! AuthSessionAuthenticated) {
              return const SizedBox.shrink();
            }
            return ParticipationEventPage(
              eventId: 'a',
              opener: Opener(),
              onParticipants: (_) {},
              detailBuilder: (context, event, plans) =>
                  Column(children: [Text(event.title), plans]),
            );
          },
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  for (final success in [true, false]) {
    testWidgets(
      'previous detail expiry cannot retire a newer pending refresh (success=$success)',
      (tester) async {
        final details = _QueuedDetails();
        await _pump(tester, details);
        details.reads.single.complete(Success(_event('Original details')));
        await tester.pumpAndSettle();
        expect(find.text('Original details'), findsOneWidget);

        await tester.pump(const Duration(minutes: 4, seconds: 59));
        await tester.tap(find.byTooltip('Reload Event information'));
        await tester.pump();
        expect(details.reads, hasLength(2));
        expect(find.text('Original details'), findsNothing);
        await tester.pump(const Duration(seconds: 2));
        final remainedLoading =
            find.text('Loading Event information…').evaluate().length == 1;

        details.reads.last.complete(
          success ? Success(_event('Refreshed details')) : _failure,
        );
        await tester.pumpAndSettle();
        expect(find.text('Loading Event information…'), findsNothing);
        expect(
          find.text(
            success
                ? 'Refreshed details'
                : 'Synthetic source temporarily unavailable.',
          ),
          findsOneWidget,
        );
        expect(remainedLoading, isTrue);
        expect(details.reads, hasLength(2));
        if (success) {
          // The replacement still expires; repairing the old timer must not
          // retain content beyond the replacement's own five-minute lifetime.
          await tester.pump(const Duration(minutes: 5, seconds: 1));
          expect(find.text('Refreshed details'), findsNothing);
          expect(find.byTooltip('Reload Event information'), findsOneWidget);
          expect(details.reads, hasLength(2));
        }
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }

  testWidgets(
    'failed detail is reread and repeated refresh admits one request',
    (tester) async {
      final details = _QueuedDetails();
      await _pump(tester, details);
      details.reads.single.complete(_failure);
      await tester.pumpAndSettle();
      expect(
        find.text('Synthetic source temporarily unavailable.'),
        findsOneWidget,
      );
      final refresh = find.byTooltip('Reload Event information');
      await tester.tap(refresh);
      await tester.tap(refresh);
      await tester.pump();
      expect(details.reads, hasLength(2));
      details.reads.last.complete(Success(_event('Recovered details')));
      await tester.pumpAndSettle();
      expect(find.text('Recovered details'), findsOneWidget);
      expect(
        find.text('Synthetic source temporarily unavailable.'),
        findsNothing,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'foreground retry ignores a detail result retired on background',
    (tester) async {
      final details = _QueuedDetails();
      await _pump(tester, details);
      final retired = details.reads.single;
      pauseApp(tester);
      await tester.pump();
      resumeApp(tester);
      await tester.pumpAndSettle();
      expect(details.reads, hasLength(2));
      details.reads.last.complete(Success(_event('Foreground details')));
      await tester.pumpAndSettle();
      retired.complete(Success(_event('Retired details')));
      await tester.pumpAndSettle();
      expect(find.text('Foreground details'), findsOneWidget);
      expect(find.text('Retired details'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('same-subject replacement rejects the prior detail completion', (
    tester,
  ) async {
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    final details = _QueuedDetails();
    sessions.add(AuthSessionAuthenticated(subject: 'owner'));
    await _pump(tester, details, sessions: sessions.stream);
    final retired = details.reads.single;
    sessions.add(AuthSessionAuthenticated(subject: 'owner'));
    await tester.pumpAndSettle();
    retired.complete(Success(_event('Prior session details')));
    await tester.pumpAndSettle();
    expect(find.text('Prior session details'), findsNothing);
    await tester.tap(find.byTooltip('Reload Event information'));
    await tester.pump();
    expect(details.reads, hasLength(2));
    details.reads.last.complete(Success(_event('New session details')));
    await tester.pumpAndSettle();
    expect(find.text('New session details'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
