import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_page.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('labelled cards preserve ranking and forward only the Event ID', (
    tester,
  ) async {
    String? opened;
    await _pump(
      tester,
      EventRecommendationsPage(
        syntheticPreview: true,
        onOpenEvent: (id) => opened = id,
      ),
    );
    expect(find.byKey(const Key('event-synthetic-notice')), findsOneWidget);
    final tiles = tester.widgetList<ListTile>(find.byType(ListTile)).toList();
    expect((tiles.first.title! as Text).data, 'Third-ranked event');
    expect(tiles, hasLength(3));
    await tester.tap(find.byKey(tiles.first.key!));
    expect(opened, testEventRecommendations().items.first.eventId);
  });

  testWidgets('Home preview retains Top 2 and explicit See All callback', (
    tester,
  ) async {
    var all = 0;
    await _pump(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: EventRecommendationsSection(
            syntheticPreview: true,
            onSeeAll: () => all++,
          ),
        ),
      ),
    );
    expect(find.byType(ListTile), findsNWidgets(2));
    await tester.tap(find.byKey(const Key('event-recommendations-see-all')));
    expect(all, 1);
  });

  testWidgets('synthetic empty state keeps the approved empty copy', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..allResult = Success(
        EventRecommendationResponse(
          asOf: DateTime.utc(2026, 10, 14),
          formulaVersion: 'event_recommendation_v1',
          items: const [],
        ),
      );
    await _pump(
      tester,
      const EventRecommendationsPage(syntheticPreview: true),
      recommendations: repository,
    );
    expect(find.text(eventEmptyTitle), findsOneWidget);
    expect(find.text(eventEmptyBody), findsOneWidget);
    expect(find.byKey(const Key('event-synthetic-notice')), findsOneWidget);
  });

  testWidgets(
    'label persists across safe error and explicit successful retry',
    (tester) async {
      final repository = FakeEventRecommendationRepository()
        ..allResult = const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'private dependency detail',
          ),
        );
      await _pump(
        tester,
        const EventRecommendationsPage(syntheticPreview: true),
        recommendations: repository,
      );
      expect(find.text('private dependency detail'), findsNothing);
      expect(find.byKey(const Key('event-synthetic-notice')), findsOneWidget);
      repository.allResult = Success(testEventRecommendations());
      await tester.tap(find.byKey(const Key('event-recommendations-retry')));
      await tester.pumpAndSettle();
      expect(find.byType(ListTile), findsNWidgets(3));
      expect(repository.views, [
        EventRecommendationView.all,
        EventRecommendationView.all,
      ]);
    },
  );

  testWidgets('detail labels pending and successful synthetic reads', (
    tester,
  ) async {
    final pending = Completer<Result<EventDetail>>();
    final repository = _Details()..pending = pending;
    await _pump(
      tester,
      const EventDetailPage(eventId: 'synthetic', syntheticPreview: true),
      details: repository,
      settle: false,
    );
    expect(find.text('Loading event details…'), findsOneWidget);
    expect(
      find.byKey(const Key('event-detail-synthetic-notice')),
      findsOneWidget,
    );
    pending.complete(Success(_event));
    await tester.pumpAndSettle();
    expect(find.text(_event.title), findsOneWidget);
    expect(find.text('Register'), findsNothing);
    expect(find.text('Going'), findsNothing);
    expect(repository.copyCalls, 0);
  });

  testWidgets('ordinary constructor does not falsely label data synthetic', (
    tester,
  ) async {
    await _pump(tester, const EventRecommendationsPage());
    expect(find.byKey(const Key('event-synthetic-notice')), findsNothing);
    await _pump(tester, const EventDetailPage(eventId: 'synthetic'));
    expect(
      find.byKey(const Key('event-detail-synthetic-notice')),
      findsNothing,
    );
  });

  testWidgets('detail unavailable remains distinct and retry is read-only', (
    tester,
  ) async {
    final repository = _Details()
      ..result = const Failure(
        AppFailure(
          kind: AppFailureKind.eventUnavailable,
          message: 'This example event is unavailable.',
        ),
      );
    await _pump(
      tester,
      const EventDetailPage(eventId: 'synthetic', syntheticPreview: true),
      details: repository,
    );
    expect(
      find.byKey(const Key('event-detail-synthetic-notice')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('event-detail-title')), findsNothing);
    repository.result = Success(_event);
    await tester.tap(find.byKey(const Key('event-detail-retry')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('event-detail-title')), findsOneWidget);
    expect(repository.readCalls, 2);
    expect(repository.copyCalls, 0);
  });

  testWidgets('small enlarged-text Event cards and details remain scrollable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await _pump(
      tester,
      const EventRecommendationsPage(syntheticPreview: true),
      scale: 1.5,
    );
    expect(tester.takeException(), isNull);
    await _pump(
      tester,
      const EventDetailPage(eventId: 'synthetic', syntheticPreview: true),
      scale: 1.5,
    );
    await tester.ensureVisible(find.byKey(const Key('event-detail-copy-link')));
    expect(tester.takeException(), isNull);
  });
}

final _event = EventDetail(
  eventId: 'synthetic',
  title: 'Synthetic community event',
  startAt: DateTime.utc(2026, 10, 15),
  externalSourceUrl: 'https://example.invalid/synthetic',
);

final class _Details implements EventDetailRepository {
  Result<EventDetail> result = Success(_event);
  Completer<Result<EventDetail>>? pending;
  int readCalls = 0;
  int copyCalls = 0;
  @override
  Future<Result<EventDetail>> read(String id) async {
    readCalls++;
    return pending?.future ?? result;
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async {
    copyCalls++;
    return const Success(null);
  }
}

Future<void> _pump(
  WidgetTester tester,
  Widget page, {
  FakeEventRecommendationRepository? recommendations,
  _Details? details,
  bool settle = true,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
        eventRecommendationRepositoryProvider.overrideWithValue(
          recommendations ?? FakeEventRecommendationRepository(),
        ),
        eventDetailRepositoryProvider.overrideWithValue(details ?? _Details()),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: page,
      ),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}
