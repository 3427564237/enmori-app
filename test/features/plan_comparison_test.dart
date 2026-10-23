import 'dart:async';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:enmori/features/event_participation/presentation/plan_comparison_controller.dart';
import 'package:enmori/features/event_participation/presentation/plan_comparison_page.dart';
import 'package:enmori/features/event_participation/presentation/user_participation_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' show PlansRepo, Details, Opener, fact;

const person = 'member_a';
PublicParticipation visible(
  String id, [
  ParticipationStatus status = ParticipationStatus.going,
]) => PublicParticipation(id, status);

final class ComparisonRepo implements ParticipationRepository {
  final mine = PlansRepo();
  final pages = <String?, Result<PublicParticipationPage>>{
    null: Success(PublicParticipationPage([visible('a')], null)),
  };
  final requests = <({String username, String? cursor})>[];
  final reads = <String>[];
  final readResults = <String, Result<EventParticipation>>{};
  final readGates = <String, Completer<Result<EventParticipation>>>{};
  Completer<Result<PublicParticipationPage>>? pendingPublic;
  int activeReads = 0, maxActiveReads = 0;

  @override
  Future<Result<PublicParticipationPage>> forUsername(
    String username,
    String? cursor,
    bool Function() current,
  ) async {
    requests.add((username: username, cursor: cursor));
    final pending = pendingPublic;
    pendingPublic = null;
    return pending?.future ?? pages[cursor]!;
  }

  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async {
    reads.add(id);
    activeReads++;
    if (activeReads > maxActiveReads) maxActiveReads = activeReads;
    try {
      if (readGates[id] case final gate?) return await gate.future;
      return readResults[id] ??
          Success(
            mine.facts[id] ??
                EventParticipation(
                  eventId: id,
                  status: ParticipationStatus.none,
                  ignored: false,
                  revision: 0,
                ),
          );
    } finally {
      activeReads--;
    }
  }

  @override
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) => mine.save(previous, status, ignored, current);
  @override
  Future<Result<EventParticipationPage>> own(
    String? cursor,
    bool Function() current,
  ) => mine.own(cursor, current);
  @override
  Future<Result<EventParticipantPage>> participants(
    String id,
    ParticipationStatus status,
    ParticipantGroup group,
    String? cursor,
    bool Function() current,
  ) => mine.participants(id, status, group, cursor, current);
}

ProviderContainer container(ComparisonRepo repo) => ProviderContainer(
  overrides: [
    authSessionProvider.overrideWithValue(
      const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
    ),
    participationRepositoryProvider.overrideWithValue(repo),
  ],
);

final comparison = planComparisonControllerProvider(person);

Future<void> pumpComparison(
  WidgetTester tester,
  ComparisonRepo repo, {
  bool fromProfile = false,
  Locale locale = const Locale('en'),
  double scale = 1,
  Stream<AuthSession>? sessions,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        participationRepositoryProvider.overrideWithValue(repo),
        eventDetailRepositoryProvider.overrideWithValue(Details()),
        if (sessions == null)
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
          )
        else
          authSessionProvider.overrideWith((ref) => sessions),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        locale: locale,
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('en'), Locale('zh')],
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: Builder(
          builder: (context) {
            Widget page(BuildContext host) => EventPlanComparisonPage(
              username: person,
              onOpenEvent: (id) => Navigator.of(host).push<void>(
                MaterialPageRoute(
                  builder: (_) => ParticipationEventPage(
                    eventId: id,
                    opener: Opener(),
                    onParticipants: (_) {},
                  ),
                ),
              ),
            );
            if (!fromProfile) return page(context);
            return Scaffold(
              body: SafeArea(
                child: ListView(
                  children: [
                    UserParticipationSection(
                      username: person,
                      onSelect: (_) {},
                      onComparePlans: () => Navigator.of(context).push<void>(
                        MaterialPageRoute(builder: (host) => page(host)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  expect(finder.hitTestable(), findsOneWidget);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  test('one visible page reads at most 20 owner facts, in batches of three, without scanning', () async {
    final repo = ComparisonRepo();
    repo.pages[null] = Success(
      PublicParticipationPage([
        for (var i = 0; i < 20; i++) visible('event_$i'),
      ], 'more'),
    );
    for (var i = 0; i < 20; i++) {
      repo.readGates['event_$i'] = Completer();
    }
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(comparison, (_, _) {});
    addTearDown(sub.close);
    final load = c.read(comparison.notifier).load();
    for (var offset = 0; offset < 20; offset += 3) {
      await Future<void>.delayed(Duration.zero);
      expect(repo.activeReads, lessThanOrEqualTo(3));
      expect(repo.reads.length, (offset + 3).clamp(0, 20));
      for (var i = offset; i < offset + 3 && i < 20; i++) {
        repo.readGates['event_$i']!.complete(Success(fact('event_$i')));
      }
    }
    await load;
    expect(repo.maxActiveReads, 3);
    expect(repo.reads.length, 20);
    expect(repo.requests, [(username: person, cursor: null)]);
    expect(c.read(comparison).page!.nextCursor, 'more');
    expect(repo.mine.writes, isEmpty);
  });

  test('empty source window can advance; failure retires foreign rows and retry keeps cursor', () async {
    final repo = ComparisonRepo()
      ..pages[null] = Success(PublicParticipationPage([], 'p1'))
      ..pages['p1'] = const Failure(participationUnavailable);
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(comparison, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(comparison.notifier);
    await ctrl.load();
    expect(repo.reads, isEmpty);
    await ctrl.load(next: true);
    expect(c.read(comparison).page, isNull);
    expect(c.read(comparison).failure, isNotNull);
    repo.pages['p1'] = Success(PublicParticipationPage([visible('a')], 'p2'));
    await ctrl.load();
    expect(repo.requests.map((r) => r.cursor), [null, 'p1', 'p1']);
    repo.pages['p2'] = Success(PublicParticipationPage([visible('b')], 'p1'));
    await ctrl.load(next: true);
    expect(c.read(comparison).page, isNull);
    await ctrl.load();
    expect(
      c.read(comparison).page,
      isNull,
      reason: 'Retry must not accept the same cursor cycle',
    );
    await ctrl.load(first: true);
    expect(c.read(comparison).page!.items, isEmpty);
  });

  test('rejects oversized pages before any owner reads', () async {
    final repo = ComparisonRepo()
      ..pages[null] = Success(
        PublicParticipationPage([
          for (var i = 0; i < 21; i++) visible('event_$i'),
        ], null),
      );
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(comparison, (_, _) {});
    addTearDown(sub.close);
    await c.read(comparison.notifier).load();
    expect(c.read(comparison).failure, isNotNull);
    expect(repo.reads, isEmpty);
  });

  test('permission loss during owner reads retires the public page and stops later batches', () async {
    final repo = ComparisonRepo()
      ..pages[null] = Success(
        PublicParticipationPage([
          for (var i = 0; i < 8; i++) visible('event_$i'),
        ], null),
      )
      ..readResults['event_0'] = const Failure(
        AppFailure(
          kind: AppFailureKind.authRequired,
          message: 'Sign in required',
        ),
      );
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(comparison, (_, _) {});
    addTearDown(sub.close);
    await c.read(comparison.notifier).load();
    expect(c.read(comparison).page, isNull);
    expect(c.read(comparison).failure!.kind, AppFailureKind.authRequired);
    expect(repo.reads.length, 3);
  });

  test('content invalidation retires old snapshots and rejects a late public response', () async {
    final repo = ComparisonRepo();
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(comparison, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(comparison.notifier);
    await ctrl.load();
    final old = c.read(comparison);
    final pending = Completer<Result<PublicParticipationPage>>();
    repo.pendingPublic = pending;
    final request = ctrl.load();
    c.read(contentAccessProvider.notifier).changed();
    expect(ctrl.isCurrentView(old), isFalse);
    pending.complete(Success(PublicParticipationPage([visible('a')], null)));
    await request;
    expect(c.read(comparison).page, isNull);
    expect(await ctrl.verifyForOpen(old, 'a'), isNull);
  });

  test(
    'open rechecks exact current page once and missing source cannot navigate',
    () async {
      final repo = ComparisonRepo();
      final c = container(repo);
      addTearDown(c.dispose);
      final sub = c.listen(comparison, (_, _) {});
      addTearDown(sub.close);
      final ctrl = c.read(comparison.notifier);
      await ctrl.load();
      final old = c.read(comparison);
      final pending = Completer<Result<PublicParticipationPage>>();
      repo.pendingPublic = pending;
      final first = ctrl.verifyForOpen(old, 'a');
      final second = await ctrl.verifyForOpen(old, 'a');
      expect(second, isNull);
      pending.complete(
        Success(PublicParticipationPage([visible('different')], null)),
      );
      expect(await first, isNull);
      expect(repo.requests.length, 2);
      expect(c.read(comparison).selectionUnavailable, isTrue);
      await ctrl.load();
      final receipt = await ctrl.verifyForOpen(c.read(comparison), 'a');
      expect(receipt, isNotNull);
      c.read(contentAccessProvider.notifier).changed();
      expect(ctrl.isCurrent(receipt!), isFalse);
    },
  );

  testWidgets(
    'same-subject replacement session discards a late read and old card callback',
    (tester) async {
      final repo = ComparisonRepo();
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      sessions.add(AuthSessionAuthenticated(subject: 'same'));
      await pumpComparison(tester, repo, sessions: sessions.stream);
      // The initial scheduled load can precede the first observed stream value.
      await tap(tester, find.text('Refresh comparison'));
      final action = tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'View event and my plan'),
          )
          .onPressed!;
      final pending = Completer<Result<PublicParticipationPage>>();
      repo.pendingPublic = pending;
      action();
      await tester.pump();
      sessions.add(AuthSessionAuthenticated(subject: 'same'));
      await tester.pump();
      pending.complete(Success(PublicParticipationPage([visible('a')], null)));
      await tester.pumpAndSettle();
      expect(find.text('An evening of music a'), findsNothing);
      expect(find.byType(ParticipationEventPage), findsNothing);
      action();
      await tester.pumpAndSettle();
      expect(find.byType(ParticipationEventPage), findsNothing);
    },
  );

  testWidgets('owner partial failure is unknown, not none or a shared choice', (
    tester,
  ) async {
    final repo = ComparisonRepo()
      ..readResults['a'] = const Failure(participationUnavailable);
    await pumpComparison(tester, repo);
    expect(find.text('You: Not confirmed'), findsOneWidget);
    expect(find.text('You: Not chosen'), findsNothing);
    expect(
      find.text('0 shared choices on this page · 1 of your choices unchecked'),
      findsOneWidget,
    );
    expect(repo.mine.writes, isEmpty);
  });

  testWidgets(
    'public permission failure remains an error, not an empty plan list',
    (tester) async {
      final repo = ComparisonRepo()
        ..pages[null] = const Failure(
          AppFailure(
            kind: AppFailureKind.addFriendTargetUnavailable,
            message: 'Not available under current access',
          ),
        );
      await pumpComparison(tester, repo);
      expect(find.text('Comparison unavailable'), findsOneWidget);
      expect(find.text('No visible choices on this page'), findsNothing);
      expect(repo.reads, isEmpty);
    },
  );

  testWidgets(
    'profile entry, detail save, return and revisit share the persisted choice',
    (tester) async {
      final repo = ComparisonRepo()
        ..pages[null] = Success(PublicParticipationPage([visible('a')], 'p1'))
        ..pages['p1'] = Success(PublicParticipationPage([visible('b')], null));
      repo.mine.facts['b'] = fact('b', status: ParticipationStatus.none);
      await pumpComparison(tester, repo, fromProfile: true);
      await tap(tester, find.text('Compare with my plans'));
      await tap(tester, find.text('Next visible page'));
      expect(find.text('You: Not chosen'), findsOneWidget);
      await tap(tester, find.text('View event and my plan'));
      expect(find.byType(ParticipationEventPage), findsOneWidget);
      await tap(tester, find.text('Going'));
      expect(repo.mine.writes.length, 1);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('You: Going'), findsOneWidget);
      expect(find.text('An evening of music b'), findsOneWidget);
      expect(repo.requests.last.cursor, 'p1');
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tap(tester, find.text('Compare with my plans'));
      await tap(tester, find.text('Next visible page'));
      expect(find.text('You: Going'), findsOneWidget);
      expect(repo.mine.writes.length, 1);
    },
  );

  testWidgets(
    'background clears foreign content and resume rechecks visible permissions',
    (tester) async {
      final repo = ComparisonRepo();
      await pumpComparison(tester, repo);
      expect(find.text('An evening of music a'), findsOneWidget);
      addTearDown(
        () => tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        ),
      );
      // Inactive still permits a frame; paused deliberately disables rendering.
      // Verify retirement before pausing, as in the real lifecycle sequence.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      final scope = ProviderScope.containerOf(
        tester.element(find.byType(EventPlanComparisonPage)),
      );
      expect(scope.read(comparison).page, isNull);
      expect(find.text('An evening of music a'), findsNothing);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(find.text('An evening of music a'), findsNothing);
      repo.pages[null] = const Failure(
        AppFailure(
          kind: AppFailureKind.addFriendTargetUnavailable,
          message: 'Unavailable',
        ),
      );
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.text('Comparison unavailable'), findsOneWidget);
      expect(find.text('An evening of music a'), findsNothing);
    },
  );

  for (final language in ['en', 'zh']) {
    testWidgets(
      'comparison fits 360px at 2x text in $language with reduced motion',
      (tester) async {
        tester.view.physicalSize = const Size(360, 780);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repo = ComparisonRepo();
        await pumpComparison(tester, repo, locale: Locale(language), scale: 2);
        final action = find.text(
          language == 'zh' ? '查看活动与我的计划' : 'View event and my plan',
        );
        await tester.ensureVisible(action);
        await tester.pumpAndSettle();
        expect(action.hitTestable(), findsOneWidget);
        expect(find.text('An evening of music a'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
