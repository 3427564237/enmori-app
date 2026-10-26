import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_browse/presentation/activity_page.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _Details implements EventDetailRepository {
  final reads = <String>[];
  final first = Completer<Result<EventDetail>>();
  bool holdFirst = false;
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads.add(id);
    if (holdFirst && id == 'A') return first.future;
    return Success(
      EventDetail(
        eventId: id,
        title: 'Event $id',
        startAt: DateTime.utc(2026, 12),
        externalSourceUrl: 'https://ticketmaster.sg/event/$id',
      ),
    );
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

final class _Activities implements ActivityRepository {
  final reads = <String?>[];
  @override
  Future<Result<ActivityRead>> read(String? id) async {
    reads.add(id);
    return Success(
      ActivityDetail(
        summary: ActivitySummary(
          browseId: id!,
          title: 'Activity $id',
          startAt: '2026-12-01T00:00:00Z',
        ),
        sourceUrl: Uri.parse('https://ticketmaster.sg/event/synthetic'),
      ),
    );
  }
}

void main() {
  for (final holdFirst in [false, true]) {
    testWidgets(
      'retained Event details reads the new identity, late old result stays hidden: hold=$holdFirst',
      (tester) async {
        final repo = _Details()..holdFirst = holdFirst;
        final selected = ValueNotifier('A');
        addTearDown(selected.dispose);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              currentAuthSubjectProvider.overrideWithValue('synthetic'),
              authSessionProvider.overrideWith(
                (_) => Stream.value(
                  const AuthSessionAuthenticated(subject: 'synthetic'),
                ),
              ),
              eventDetailRepositoryProvider.overrideWithValue(repo),
            ],
            child: MaterialApp(
              theme: ThemeData(splashFactory: NoSplash.splashFactory),
              home: ValueListenableBuilder(
                valueListenable: selected,
                builder: (_, id, _) => EventDetailPage(
                  key: const Key('retained-page'),
                  eventId: id,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final element = tester.element(find.byType(EventDetailPage));
        expect(repo.reads, ['A']);
        selected.value = 'B';
        await tester.pumpAndSettle();
        expect(tester.element(find.byType(EventDetailPage)), same(element));
        expect(repo.reads, ['A', 'B']);
        expect(find.text('Event B'), findsOneWidget);
        if (holdFirst) {
          repo.first.complete(
            Success(
              EventDetail(
                eventId: 'A',
                title: 'LATE OLD',
                startAt: DateTime.utc(2026, 12),
                externalSourceUrl: 'https://ticketmaster.sg/event/A',
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('LATE OLD'), findsNothing);
          expect(find.text('Event B'), findsOneWidget);
        }
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'retained browse Detail reads new locator without manual Reload',
    (tester) async {
      final repo = _Activities(), selected = ValueNotifier('tm_YQ');
      addTearDown(selected.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData<AuthSession>(
                AuthSessionAuthenticated(subject: 'synthetic'),
              ),
            ),
            activityRepositoryProvider.overrideWithValue(repo),
          ],
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: ValueListenableBuilder(
              valueListenable: selected,
              builder: (_, id, _) =>
                  ActivityPage(key: const Key('retained-page'), browseId: id),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final element = tester.element(find.byType(ActivityPage));
      expect(repo.reads, ['tm_YQ']);
      selected.value = 'tm_Yg';
      await tester.pumpAndSettle();
      expect(tester.element(find.byType(ActivityPage)), same(element));
      expect(repo.reads, ['tm_YQ', 'tm_Yg']);
      expect(find.text('Activity tm_Yg'), findsOneWidget);
      expect(find.text('Activity tm_YQ'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
