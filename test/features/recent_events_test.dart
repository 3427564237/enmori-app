import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/recent_events_page.dart';
import 'package:flutter/material.dart';

import 'dart:async';

import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/recent_events_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Events implements EventDetailRepository {
  final reads = <String>[];
  bool unavailable = false;
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads.add(id);
    if (unavailable) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Unavailable',
        ),
      );
    }
    return Success(
      EventDetail(
        eventId: id,
        title: 'Fresh $id',
        startAt: DateTime.utc(2026, 11, 1),
        externalSourceUrl: 'https://ticketmaster.sg/event/synthetic',
      ),
    );
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

void main() {
  testWidgets(
    'recent list reads fresh details, expires titles and keeps retry failures distinct',
    (tester) async {
      final repo = _Events();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'test')),
          ),
          eventDetailRepositoryProvider.overrideWithValue(repo),
        ],
      );
      addTearDown(container.dispose);
      container.read(recentEventsProvider.notifier).viewed('one');
      String? selected;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: RecentEventsPage(onSelect: (id) => selected = id),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.reads, ['one']);
      expect(find.text('Fresh one'), findsOneWidget);
      await tester.tap(find.text('Fresh one'));
      expect(selected, 'one');
      await tester.pump(const Duration(minutes: 6));
      expect(find.text('Fresh one'), findsNothing);
      repo.unavailable = true;
      await tester.tap(find.byTooltip('Retry'));
      await tester.pumpAndSettle();
      expect(repo.reads, ['one', 'one']);
      expect(find.text('Event could not be read'), findsOneWidget);
      await tester.tap(find.byKey(const Key('recent-events-clear')));
      await tester.pumpAndSettle();
      expect(find.text('No recently viewed events.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  test('recent IDs deduplicate, cap at 20, clear and retire on same-UID session replacement', () async {
    final sessions = StreamController<AuthSession>.broadcast();
    final container = ProviderContainer(
      overrides: [authSessionProvider.overrideWith((ref) => sessions.stream)],
    );
    addTearDown(() async {
      container.dispose();
      await sessions.close();
    });
    final subscription = container.listen(recentEventsProvider, (_, _) {});
    addTearDown(subscription.close);
    final controller = container.read(recentEventsProvider.notifier);
    controller.viewed('signed-out');
    expect(container.read(recentEventsProvider), isEmpty);
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await Future<void>.delayed(Duration.zero);
    for (var i = 0; i < 25; i++) {
      controller.viewed('id$i');
    }
    controller.viewed('id10');
    expect(container.read(recentEventsProvider).length, 20);
    expect(container.read(recentEventsProvider).first, 'id10');
    expect(
      container.read(recentEventsProvider).where((id) => id == 'id10').length,
      1,
    );
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await Future<void>.delayed(Duration.zero);
    expect(container.read(recentEventsProvider), isEmpty);
    controller.viewed('next');
    controller.clear();
    expect(container.read(recentEventsProvider), isEmpty);
  });
}
