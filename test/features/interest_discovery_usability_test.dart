import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_batches_test.dart' as browse;

void main() {
  testWidgets(
    'local search preserves hidden selections and summary removes them',
    (tester) async {
      final repo = FakeInterestRepository();
      await _interests(tester, repo);
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('interest-search')), 'BOOK');
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('interest-option-tag-art')), findsNothing);
      expect(
        find.byKey(const Key('interest-selected-tag-art')),
        findsOneWidget,
      );
      await _scrollTo(
        tester,
        find.byKey(const Key('interest-option-tag-books')),
      );
      await tester.tap(find.byKey(const Key('interest-option-tag-books')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('interest-save')));
      await tester.pumpAndSettle();
      expect(repo.savedIds.single.toSet(), {'tag-art', 'tag-books'});
      expect(repo.catalogueReads, 1);
      await _scrollTo(tester, find.byTooltip('Remove Art'));
      await tester.tap(find.byTooltip('Remove Art'));
      await tester.pumpAndSettle();
      expect(find.text('1 of 10 selected'), findsOneWidget);
      await tester.tap(find.byKey(const Key('interest-save')));
      await tester.pumpAndSettle();
      expect(repo.savedIds.last, ['tag-books']);
    },
  );

  testWidgets('inactive summary removal cannot reassign an inactive tag', (
    tester,
  ) async {
    final repo = FakeInterestRepository()
      ..ownResult = const Success(
        InterestSelection(
          revision: 3,
          interestTags: [
            SelectedInterestTag(
              interestTagId: 'old',
              displayName: 'Old interest',
              lifecycleState: InterestLifecycleState.inactive,
            ),
          ],
        ),
      );
    await _interests(tester, repo);
    await tester.tap(find.byTooltip('Remove Old interest'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('interest-search')),
      'Old interest',
    );
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<CheckboxListTile>(
            find.byKey(const Key('interest-option-old')),
          )
          .onChanged,
      isNull,
    );
    await tester.tap(find.byKey(const Key('interest-save')));
    await tester.pumpAndSettle();
    expect(repo.savedIds.single, isEmpty);
    expect(repo.expectedRevisions.single, 3);
  });

  testWidgets(
    'long catalogue keeps count and save visible at 320dp with 2x text and keyboard',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      final repo = FakeInterestRepository()
        ..catalogueResult = Success([
          for (var i = 0; i < 30; i++)
            InterestTagOption(
              interestTagId: 'tag-$i',
              displayName: 'Interest $i',
            ),
        ]);
      await _interests(tester, repo, scale: 2);
      await _scrollTo(tester, find.byKey(const Key('interest-search')));
      await tester.enterText(
        find.byKey(const Key('interest-search')),
        'Interest 29',
      );
      tester.view.viewInsets = const FakeViewPadding(bottom: 230);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final save = find.byKey(const Key('interest-save'));
      expect(tester.getBottomRight(save).dy, lessThanOrEqualTo(410));
      expect(save.hitTestable(), findsOneWidget);
      expect(find.text('0 of 10 selected').hitTestable(), findsOneWidget);
      tester.view.resetViewInsets();
      tester.testTextInput.hide();
      await tester.pumpAndSettle();
      await _scrollTo(tester, find.byKey(const Key('interest-option-tag-29')));
      await tester.tap(find.byKey(const Key('interest-option-tag-29')));
      await tester.pumpAndSettle();
      expect(find.text('1 of 10 selected'), findsOneWidget);
      expect(save.hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'eleventh selection reports limit beside the persistent save action',
    (tester) async {
      final tags = [
        for (var i = 0; i < 11; i++)
          InterestTagOption(interestTagId: 't$i', displayName: 'Choice $i'),
      ];
      final repo = FakeInterestRepository()
        ..catalogueResult = Success(tags)
        ..ownResult = Success(
          InterestSelection(
            revision: 0,
            interestTags: [
              for (final tag in tags.take(10))
                SelectedInterestTag(
                  interestTagId: tag.interestTagId,
                  displayName: tag.displayName,
                  lifecycleState: InterestLifecycleState.active,
                ),
            ],
          ),
        );
      await _interests(tester, repo);
      await _scrollTo(tester, find.byKey(const Key('interest-search')), 250);
      await tester.enterText(
        find.byKey(const Key('interest-search')),
        'Choice 10',
      );
      await tester.pumpAndSettle();
      await _scrollTo(tester, find.byKey(const Key('interest-option-t10')));
      await tester.tap(find.byKey(const Key('interest-option-t10')));
      await tester.pumpAndSettle();
      expect(find.text('10 of 10 selected'), findsOneWidget);
      expect(
        find.text('Choose no more than 10 interests.').hitTestable(),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('interest-save')).hitTestable(),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'time filtering reads later pages and refresh keeps the full filtered range',
    (tester) async {
      final repo = browse.Repo()
        ..result = Success(
          ActivityBatch(
            asOf: browse.instant,
            items: [_event('later', 3)],
            nextCursor: 'page1',
          ),
        )
        ..nextResults['page1'] = Success(
          ActivityBatch(
            asOf: browse.instant,
            items: [_event('today-match', 0)],
          ),
        );
      await _events(tester, repo);
      await _today(tester);
      await tester.pumpAndSettle();
      expect(repo.cursors, ['page1']);
      await _scrollTo(tester, find.byKey(const ValueKey('today-match')), 200);
      expect(find.byKey(const ValueKey('later')), findsNothing);
      await tester.tap(find.byTooltip('Refresh events'));
      await tester.pumpAndSettle();
      expect(repo.cursors, ['page1', 'page1']);
      expect(repo.first, 2);
    },
  );

  testWidgets(
    'stopped time traversal never claims empty and can continue or clear filters',
    (tester) async {
      final pending = Completer<Result<ActivityRead>>();
      final repo = browse.Repo()
        ..result = Success(
          ActivityBatch(
            asOf: browse.instant,
            items: [_event('later', 3)],
            nextCursor: 'page1',
          ),
        )
        ..pending = pending;
      await _events(tester, repo);
      await _today(tester);
      await tester.pump();
      await _scrollTo(tester, find.byKey(const Key('events-stop-search')));
      await tester.tap(find.byKey(const Key('events-stop-search')));
      await tester.pumpAndSettle();
      expect(find.textContaining('No matching events'), findsNothing);
      expect(find.textContaining('No matches in the loaded'), findsNothing);
      expect(find.textContaining('reached the end'), findsNothing);
      pending.complete(
        Success(
          ActivityBatch(asOf: browse.instant, items: [_event('late-reply', 0)]),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('late-reply')), findsNothing);
      repo.pending = null;
      repo.nextResults['page1'] = Success(
        ActivityBatch(asOf: browse.instant, items: [_event('today-result', 0)]),
      );
      await _scrollTo(tester, find.byKey(const Key('events-continue-search')));
      await tester.tap(find.byKey(const Key('events-continue-search')));
      await tester.pumpAndSettle();
      await _scrollTo(tester, find.byKey(const ValueKey('today-result')), 200);
      expect(repo.cursors, ['page1', 'page1']);
      await _scrollTo(
        tester,
        find.byKey(const Key('events-clear-filters')),
        -250,
      );
      await tester.tap(find.byKey(const Key('events-clear-filters')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<ChoiceChip>(find.byKey(const Key('events-time-all')))
            .selected,
        isTrue,
      );
      expect(find.byKey(const Key('events-clear-filters')), findsNothing);
    },
  );

  testWidgets(
    'failed filtered traversal offers continuation without a false empty result',
    (tester) async {
      final repo = browse.Repo()
        ..result = Success(
          ActivityBatch(
            asOf: browse.instant,
            items: [_event('later', 3)],
            nextCursor: 'page1',
          ),
        )
        ..nextResults['page1'] = const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Try again.',
          ),
        );
      await _events(tester, repo);
      await _today(tester);
      await tester.pumpAndSettle();
      expect(find.textContaining('No matching events'), findsNothing);
      expect(find.textContaining('No matches in the loaded'), findsNothing);
      await _scrollTo(
        tester,
        find.byKey(const Key('events-continue-search')),
        200,
      );
      repo.nextResults['page1'] = Success(
        ActivityBatch(asOf: browse.instant, items: [_event('today-retry', 0)]),
      );
      await tester.tap(find.byKey(const Key('events-continue-search')));
      await tester.pumpAndSettle();
      expect(repo.cursors, ['page1', 'page1']);
      expect(repo.first, 1);
    },
  );
}

Future<void> _interests(
  WidgetTester tester,
  FakeInterestRepository repo, {
  double scale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [interestRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: const InterestEditorPage(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

ActivitySummary _event(String id, int days) => ActivitySummary(
  browseId: id,
  eventId: id,
  title: id,
  startAt: DateTime.now().add(Duration(days: days)).toUtc().toIso8601String(),
);

Future<void> _events(WidgetTester tester, browse.Repo repo) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
        ),
      ],
      child: MaterialApp(home: ParticipationEventsPage(onSelect: (_) {})),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _today(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('events-filters-toggle')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('events-time-today')));
}

Future<void> _scrollTo(
  WidgetTester tester,
  Finder target, [
  double delta = 150,
]) => tester.scrollUntilVisible(
  target,
  delta,
  scrollable: find
      .byWidgetPredicate(
        (widget) =>
            widget is Scrollable && widget.axisDirection == AxisDirection.down,
      )
      .first,
);
