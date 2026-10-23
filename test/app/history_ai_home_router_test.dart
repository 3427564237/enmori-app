import 'dart:async';

import 'package:enmori/app/social_demo_presentation.dart';
import 'package:enmori/app/home_today_section.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/plan_comparison_page.dart';
import 'package:enmori/features/event_participation/presentation/user_participation_section.dart';
import 'package:enmori/features/friends/presentation/check_in_points_map.dart';
import 'package:enmori/features/friends/presentation/my_friends_page.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_record_view.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_from_record_page.dart';

import '../features/social_profile_flow_test.dart'
    show SocialFake, sharedProfile;
import '../features/plan_comparison_test.dart' show ComparisonRepo;
import '../features/event_plans_test.dart' show Details, Opener;

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/activity_routes.dart';
import 'package:enmori/app/router/isolated_history_ai_pages.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/core/result/result.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/fakes.dart';

void main() {
  _routerTest('Home day summary awaits History and rejects covered callbacks', (
    tester,
  ) async {
    final f = await _pumpApp(
      tester,
      pages: _TestPages(),
      history: true,
      remote: true,
    );
    final today = tester.widget<HomeTodaySection>(
      find.byType(HomeTodaySection),
    );
    final opened = today.onOpenHistory();
    await tester.pumpAndSettle();
    expect(f.router.state.uri.path, AppRoutes.checkInHistory);
    await today.onOpenCheckIn('covered-home-must-not-read');
    await tester.pumpAndSettle();
    expect(f.router.state.uri.path, AppRoutes.checkInHistory);
    expect(f.checkIns.readIds, isEmpty);
    await _tap(tester, 'test-back');
    await opened;
    expect(f.router.state.uri.path, AppRoutes.home);
    expect(find.byType(HomeTodaySection), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  _routerTest(
    'profile participation opens comparison and returns from an Event once',
    (tester) async {
      final f = await _pumpApp(tester, remote: true, participation: true);
      final social = f.container.read(socialRepositoryProvider) as SocialFake;
      social.pendingProfile = Completer<Result<SocialProfile>>()
        ..complete(
          Success(
            SocialProfile(
              username: sharedProfile.username,
              displayName: sharedProfile.displayName,
              details: sharedProfile.details,
              relationship: sharedProfile.relationship,
              specialCare: sharedProfile.specialCare,
              friendshipRevision: sharedProfile.friendshipRevision,
              interests: sharedProfile.interests,
              mapAvailable: sharedProfile.mapAvailable,
              participationAvailable: true,
            ),
          ),
        );
      f.router.go('/people/member_b');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Event participation'));
      await tester.tap(find.text('Event participation'));
      await tester.pumpAndSettle();
      final compare = tester
          .widget<UserParticipationSection>(
            find.byType(UserParticipationSection),
          )
          .onComparePlans!;
      await tester.tap(find.text('Compare with my plans'));
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.comparePlans('member_b'));
      final page = tester.widget<EventPlanComparisonPage>(
        find.byType(EventPlanComparisonPage),
      );
      final opened = page.onOpenEvent('a');
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, '/events/a/participation');
      compare();
      page.onBack!();
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, '/events/a/participation');
      f.router.pop();
      await tester.pumpAndSettle();
      await opened;
      expect(f.router.state.uri.path, AppRoutes.comparePlans('member_b'));
      page.onBack!();
      await tester.pumpAndSettle();
      expect(find.byType(UserParticipationSection), findsOneWidget);
      expect(find.byType(EventPlanComparisonPage), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  _routerTest('direct comparison has an authorized Profile fallback', (
    tester,
  ) async {
    final f = await _pumpApp(tester, remote: true, participation: true);
    f.router.go(AppRoutes.comparePlans('member_b'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(f.router.state.uri.path, '/people/member_b');
    expect(find.byType(EventPlanComparisonPage), findsNothing);
    expect(tester.takeException(), isNull);
  });

  _routerTest('comparison callbacks retire with a same-user session', (
    tester,
  ) async {
    final f = await _pumpApp(tester, remote: true, participation: true);
    f.router.go(AppRoutes.comparePlans('member_b'));
    await tester.pumpAndSettle();
    final page = tester.widget<EventPlanComparisonPage>(
      find.byType(EventPlanComparisonPage),
    );
    f.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await _frames(tester);
    await page.onOpenEvent('a');
    page.onBack!();
    await tester.pumpAndSettle();
    expect(f.router.state.uri.path, AppRoutes.home);
    expect(find.byType(EventPlanComparisonPage), findsNothing);
    expect(tester.takeException(), isNull);
  });

  _routerTest(
    'own saved record opens a reread draft and one discard returns to its source',
    (tester) async {
      final f = await _pumpApp(tester, pages: _TestPages(), history: true);
      final id = testCheckIn().checkInId;
      f.router.push<void>(AppRoutes.savedCheckIn(id));
      await tester.pumpAndSettle();
      final start = tester
          .widget<SavedCheckInPage>(find.byType(SavedCheckInPage))
          .onStartNewDraft!;
      start(id);
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.checkIn);
      expect(f.router.state.uri.queryParameters['from'], id);
      expect(f.checkIns.readIds, [id, id]);
      expect(f.checkIns.createdNotes, isEmpty);
      expect(find.byType(CheckInFromRecordPage), findsOneWidget);
      start(id); // The covered source cannot stack another draft.
      await tester.pumpAndSettle();
      expect(f.checkIns.readIds, [id, id]);
      tester
          .widget<CheckInFromRecordPage>(find.byType(CheckInFromRecordPage))
          .onDiscard();
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.savedCheckIn(id));
      expect(find.byType(CheckInFromRecordPage), findsNothing);
      expect(f.checkIns.createdNotes, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  _routerTest('direct reuse entry discards back to the owned source', (
    tester,
  ) async {
    final f = await _pumpApp(tester, pages: _TestPages(), history: true);
    final id = testCheckIn().checkInId;
    f.router.go(AppRoutes.checkInFrom(id));
    await tester.pumpAndSettle();
    tester
        .widget<CheckInFromRecordPage>(find.byType(CheckInFromRecordPage))
        .onDiscard();
    await tester.pumpAndSettle();
    expect(f.router.state.uri.path, AppRoutes.savedCheckIn(id));
    expect(f.checkIns.createdNotes, isEmpty);
    expect(tester.takeException(), isNull);
  });

  _routerTest('reuse callback cannot survive same-user session replacement', (
    tester,
  ) async {
    final f = await _pumpApp(tester, pages: _TestPages(), history: true);
    final id = testCheckIn().checkInId;
    f.router.push<void>(AppRoutes.savedCheckIn(id));
    await tester.pumpAndSettle();
    final start = tester
        .widget<SavedCheckInPage>(find.byType(SavedCheckInPage))
        .onStartNewDraft!;
    f.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await _frames(tester);
    final reads = List<String>.of(f.checkIns.readIds);
    start(id);
    await _frames(tester);
    expect(find.byType(CheckInFromRecordPage), findsNothing);
    expect(f.checkIns.readIds, reads);
    expect(f.checkIns.createdNotes, isEmpty);
    expect(tester.takeException(), isNull);
  });

  _routerTest(
    'connected shell has five destinations and Profile owns History and Footprint',
    (tester) async {
      final f = await _pumpApp(
        tester,
        pages: _TestPages(),
        history: true,
        remote: true,
      );
      expect(find.byType(NavigationDestination), findsNWidgets(5));
      // 23 October refinement puts personal records under Profile in this shell.
      expect(find.byKey(const Key('home-footprint')), findsNothing);
      expect(find.byKey(const Key('home-check-in-history')), findsNothing);
      await tester.tap(find.widgetWithText(NavigationDestination, 'Profile'));
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.profile);
      await tester.ensureVisible(find.text('Footprint'));
      await tester.tap(find.text('Footprint'));
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.footprint);
      expect(find.byType(CheckInPointsMap), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.profile);
      await tester.ensureVisible(find.text('Check-in History'));
      await tester.tap(find.text('Check-in History'));
      await tester.pumpAndSettle();
      expect(f.router.state.uri.path, AppRoutes.checkInHistory);
      f.router.pop();
      await tester.pumpAndSettle();
      expect(find.text('Check-in History'), findsOneWidget);
      expect(find.text('Footprint'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final viaFriends in [false, true]) {
    _routerTest(
      'shared saved-record view is wired through ${viaFriends ? 'Friends' : 'top-level Profile'}',
      (tester) async {
        final f = await _pumpApp(tester, remote: true);
        final social = f.container.read(socialRepositoryProvider) as SocialFake;
        final record = testCheckIn();
        social.pendingRecords = Completer<Result<CheckInHistoryPage>>()
          ..complete(
            Success(CheckInHistoryPage(checkIns: [record], nextCursor: null)),
          );
        social.detailResult = Success(record);
        f.router.go(viaFriends ? '/friends' : '/people/member_b');
        await tester.pumpAndSettle();
        if (viaFriends) {
          // Exercise the real Friends composition callback and nested Navigator.
          tester
              .widget<MyFriendsListPage>(find.byType(MyFriendsListPage))
              .onOpenFriend!('member_b');
          await tester.pumpAndSettle();
        }
        await tester.tap(find.widgetWithText(ChoiceChip, 'Check-in History'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(record.note));
        await tester.pumpAndSettle();
        expect(find.byType(CheckInRecordView), findsOneWidget);
        expect(
          tester
              .widget<CheckInRecordView>(find.byType(CheckInRecordView))
              .record
              .checkInId,
          record.checkInId,
        );
        expect(social.readIds, [record.checkInId]);
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(find.byType(CheckInRecordView), findsNothing);
        expect(find.text(record.note), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final supplied in [false, true]) {
    _routerTest('ordinary builds omit both new routes/entries ($supplied)', (
      tester,
    ) async {
      final pages = _TestPages();
      final f = await _pumpApp(
        tester,
        pages: pages,
        history: supplied,
        ai: supplied,
        isolated: false,
      );
      expect(_featurePaths(f), isEmpty);
      expect(find.byKey(const Key('home-check-in-history')), findsNothing);
      expect(find.byKey(const Key('home-ai-conversation')), findsNothing);
      for (final path in [AppRoutes.checkInHistory, AppRoutes.aiAssistant]) {
        f.router.go(path);
        await _frames(tester);
      }
      expect(pages.built, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  _routerTest('isolated flag alone creates no default or mock destination', (
    tester,
  ) async {
    final f = await _pumpApp(tester);
    expect(_featurePaths(f), isEmpty);
    expect(find.byKey(const Key('home-check-in-history')), findsNothing);
    expect(find.byKey(const Key('home-ai-conversation')), findsNothing);
    expect(find.byKey(const Key('home-friends')), findsOneWidget);
  });

  for (final historyOnly in [true, false]) {
    _routerTest(
      'one ready feature does not wait for the other ($historyOnly)',
      (tester) async {
        final pages = _TestPages();
        final f = await _pumpApp(
          tester,
          pages: pages,
          history: historyOnly,
          ai: !historyOnly,
        );
        expect(_featurePaths(f), [
          historyOnly ? AppRoutes.checkInHistory : AppRoutes.aiAssistant,
        ]);
        await _tap(
          tester,
          historyOnly ? 'home-check-in-history' : 'home-ai-conversation',
        );
        expect(
          find.byKey(Key(historyOnly ? 'test-history' : 'test-ai')),
          findsOneWidget,
        );
        await _tap(tester, 'test-back');
        expect(f.router.state.uri.path, AppRoutes.home);
        expect(f.events.views.length, 1);
        expect(f.auth.watchCount, 1);
      },
    );
  }

  _routerTest('History saved ID is encoded once and uses existing owner read', (
    tester,
  ) async {
    final pages = _TestPages(savedId: 'synthetic/id %');
    final f = await _pumpApp(tester, pages: pages, history: true);
    await _tap(tester, 'home-check-in-history');
    await _tap(tester, 'test-saved');
    expect(f.router.state.uri.toString(), '/check-in/synthetic%2Fid%20%25');
    expect(f.checkIns.readIds, ['synthetic/id %']);
    expect(find.textContaining(testCheckIn().note), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  _routerTest('AI Settings callback enters scoped AI settings and returns', (
    tester,
  ) async {
    final pages = _TestPages();
    final f = await _pumpApp(tester, pages: pages, ai: true);
    await _tap(tester, 'home-ai-conversation');
    await _tap(tester, 'test-settings');
    expect(f.router.state.uri.path, AppRoutes.aiSettings);
    f.router.pop();
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('test-ai')), findsOneWidget);
    await _tap(tester, 'test-back');
    expect(f.router.state.uri.path, AppRoutes.home);
  });

  for (final gate in RouterGateState.values.where(
    (g) => g != RouterGateState.authenticated,
  )) {
    _routerTest('new destinations cannot bypass $gate', (tester) async {
      final pages = _TestPages();
      final f = await _pumpApp(
        tester,
        pages: pages,
        history: true,
        ai: true,
        gate: gate,
      );
      for (final path in [AppRoutes.checkInHistory, AppRoutes.aiAssistant]) {
        f.router.go(path);
        await _frames(tester);
      }
      expect(pages.built, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  for (final replacement in ['member-a', 'member-b']) {
    _routerTest(
      'new observed session resets stack and callbacks ($replacement)',
      (tester) async {
        final pages = _TestPages();
        final f = await _pumpApp(tester, pages: pages, history: true, ai: true);
        await _tap(tester, 'home-ai-conversation');
        final oldSettings = pages.retainedSettings!;
        final oldRouter = f.router;
        f.auth.emit(AuthSessionAuthenticated(subject: replacement));
        await _frames(tester);
        expect(f.router, isNot(same(oldRouter)));
        expect(f.router.state.uri.path, AppRoutes.home);
        expect(find.byKey(const Key('test-ai')), findsNothing);
        oldSettings();
        await _frames(tester);
        expect(f.router.state.uri.path, AppRoutes.home);
        expect(f.auth.watchCount, 1);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final history in [false, true]) {
    _routerTest('observed logout removes owned page and callback ($history)', (
      tester,
    ) async {
      final pages = _TestPages();
      final f = await _pumpApp(
        tester,
        pages: pages,
        history: history,
        ai: !history,
      );
      await _tap(
        tester,
        history ? 'home-check-in-history' : 'home-ai-conversation',
      );
      final oldRouter = f.router;
      final oldSaved = pages.retainedSaved;
      final oldSettings = pages.retainedSettings;
      f.auth.emit(const AuthSessionUnauthenticated());
      await _frames(tester);
      expect(f.router, isNot(same(oldRouter)));
      expect(
        find.byKey(Key(history ? 'test-history' : 'test-ai')),
        findsNothing,
      );
      f.gate = RouterGateState.signInRequired;
      f.container.invalidate(routerGateProvider);
      oldSaved?.call('late-after-logout');
      oldSettings?.call();
      await _frames(tester);
      expect(f.router.state.uri.path, AppRoutes.signIn);
      expect(f.checkIns.readIds, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  _routerTest('auth loss before redirect frame blocks retained navigation', (
    tester,
  ) async {
    final pages = _TestPages();
    final f = await _pumpApp(tester, pages: pages, history: true);
    await _tap(tester, 'home-check-in-history');
    final oldSaved = pages.retainedSaved!;
    f.gate = RouterGateState.signInRequired;
    f.container.invalidate(routerGateProvider);
    oldSaved('untrusted-late-id');
    await _frames(tester);
    expect(f.checkIns.readIds, isEmpty);
    expect(f.router.state.uri.path, AppRoutes.signIn);
    expect(tester.takeException(), isNull);
  });

  _routerTest('covered or disposed feature callbacks cannot navigate', (
    tester,
  ) async {
    final pages = _TestPages();
    final f = await _pumpApp(tester, pages: pages, ai: true);
    await _tap(tester, 'home-ai-conversation');
    final oldSettings = pages.retainedSettings!;
    final oldBack = pages.retainedBack!;
    await _tap(tester, 'test-settings');
    oldBack();
    oldSettings();
    await _frames(tester);
    expect(f.router.state.uri.path, AppRoutes.aiSettings);
    f.router.pop();
    await tester.pumpAndSettle();
    await _tap(tester, 'test-back');
    oldSettings();
    await _frames(tester);
    expect(f.router.state.uri.path, AppRoutes.home);
    expect(tester.takeException(), isNull);
  });

  _routerTest('direct feature entry without parent has Home Back fallback', (
    tester,
  ) async {
    final f = await _pumpApp(
      tester,
      pages: _TestPages(),
      history: true,
      ai: true,
    );
    for (final path in [AppRoutes.checkInHistory, AppRoutes.aiAssistant]) {
      f.router.go(path);
      await tester.pumpAndSettle();
      await _tap(tester, 'test-back');
      expect(f.router.state.uri.path, AppRoutes.home);
    }
    expect(tester.takeException(), isNull);
  });

  _routerTest(
    'removing ready builder removes entry, route and retained callback',
    (tester) async {
      final pages = _TestPages();
      final f = await _pumpApp(tester, pages: pages, history: true);
      await _tap(tester, 'home-check-in-history');
      final oldSaved = pages.retainedSaved!;
      f.historyReady = false;
      f.container.invalidate(isolatedHistoryPageProvider);
      await _frames(tester);
      expect(_featurePaths(f), isEmpty);
      expect(find.byKey(const Key('home-check-in-history')), findsNothing);
      oldSaved('untrusted-old-builder');
      await _frames(tester);
      expect(f.checkIns.readIds, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  _routerTest(
    'enlarged small Home keeps both controls semantic and reachable',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await _pumpApp(
        tester,
        pages: _TestPages(),
        history: true,
        ai: true,
        textScaler: const TextScaler.linear(2),
      );
      final semantics = tester.ensureSemantics();
      try {
        for (final entry in {
          'home-check-in-history': 'Check-in History',
          'home-ai-conversation': 'AI conversation',
        }.entries) {
          final finder = find.byKey(Key(entry.key));
          await tester.scrollUntilVisible(
            finder,
            200,
            scrollable: _homeScroll(),
          );
          await tester.ensureVisible(finder);
          await tester.pumpAndSettle();
          expect(tester.getSemantics(finder).label, entry.value);
          expect(tester.getSize(finder).height, greaterThanOrEqualTo(48));
        }
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );
}

final _activeFixtures = <_Fixture>[];

// UncontrolledProviderScope does not own its externally supplied container.
// Dispose it inside the widget-test body, before Flutter checks pending timers.
void _routerTest(String description, Future<void> Function(WidgetTester) body) {
  testWidgets(description, (tester) async {
    try {
      await body(tester);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      for (final fixture in _activeFixtures) {
        fixture.container.dispose();
        await fixture.auth.close();
      }
      _activeFixtures.clear();
      await tester.pump();
    }
  });
}

List<String> _featurePaths(_Fixture f) => f.router.configuration.routes
    .whereType<GoRoute>()
    .map((route) => route.path)
    .where(
      (path) =>
          [AppRoutes.checkInHistory, AppRoutes.aiAssistant].contains(path),
    )
    .toList();

Future<_Fixture> _pumpApp(
  WidgetTester tester, {
  _TestPages? pages,
  bool history = false,
  bool ai = false,
  bool isolated = true,
  bool remote = false,
  bool participation = false,
  RouterGateState gate = RouterGateState.authenticated,
  TextScaler? textScaler,
}) async {
  // Match real auth-first startup: do not enter Home before session observation.
  final f = _Fixture()..gate = RouterGateState.resolving;
  f.historyReady = history;
  f.container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(f.auth),
      accountRepositoryProvider.overrideWithValue(
        FakeAccountRepository()
          ..statusResult = Success(OnboardingCompleted(testAccount())),
      ),
      checkInRepositoryProvider.overrideWithValue(f.checkIns),
      routerGateProvider.overrideWith((ref) => f.gate),
      isolatedSlicesEnabledProvider.overrideWithValue(isolated),
      remoteGroupFeaturesEnabledProvider.overrideWithValue(remote),
      socialDemoPresentationProvider.overrideWithValue(remote),
      activityBrowseEnabledProvider.overrideWithValue(participation),
      eventParticipationEnabledProvider.overrideWithValue(participation),
      if (participation) ...[
        participationRepositoryProvider.overrideWithValue(ComparisonRepo()),
        eventDetailRepositoryProvider.overrideWithValue(Details()),
        externalActivityOpenerProvider.overrideWithValue(Opener()),
      ],
      if (remote) socialRepositoryProvider.overrideWithValue(SocialFake()),
      if (remote) historyDevicePortProvider.overrideWithValue(_MapDevice()),
      isolatedHistoryPageProvider.overrideWith(
        (ref) => f.historyReady ? pages?.history : null,
      ),
      isolatedAiConversationPageProvider.overrideWithValue(
        ai ? pages?.ai : null,
      ),
      eventRecommendationRepositoryProvider.overrideWithValue(f.events),
    ],
  );
  _activeFixtures.add(f);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: f.container,
      child: textScaler == null
          ? const EnmoriApp()
          : MediaQuery(
              data: MediaQueryData(textScaler: textScaler),
              child: const EnmoriApp(),
            ),
    ),
  );
  f.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
  await _frames(tester);
  f.gate = gate;
  f.container.invalidate(routerGateProvider);
  await _frames(tester);
  return f;
}

Finder _homeScroll() => find
    .descendant(
      of: find.byKey(const Key('route-home')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  if (key.startsWith('home-')) {
    await tester.scrollUntilVisible(finder, 200, scrollable: _homeScroll());
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _Fixture {
  RouterGateState gate = RouterGateState.authenticated;
  bool historyReady = false;
  final auth = FakeAuthRepository();
  final checkIns = FakeCheckInRepository();
  final events = FakeEventRecommendationRepository();
  late final ProviderContainer container;
  GoRouter get router => container.read(appRouterProvider);
}

// Test-only routing surfaces; they do not certify DU/ZHOU feature behavior.
final class _TestPages {
  _TestPages({this.savedId = 'synthetic-check-in'});
  final String savedId;
  final built = <String>[];
  VoidCallback? retainedSettings;
  VoidCallback? retainedBack;
  ValueChanged<String>? retainedSaved;

  IsolatedHistoryPage get history => IsolatedHistoryPage(
    build: (context, {required onBack, required onOpenSavedCheckIn}) {
      built.add('history');
      retainedSaved = onOpenSavedCheckIn;
      return _surface('history', [
        _button('saved', () => onOpenSavedCheckIn(savedId)),
        _button('back', onBack),
      ]);
    },
  );

  IsolatedAiConversationPage get ai => IsolatedAiConversationPage(
    build: (context, {required onBack, required onOpenSettings}) {
      built.add('ai');
      retainedSettings = onOpenSettings;
      retainedBack = onBack;
      return _surface('ai', [
        _button('settings', onOpenSettings),
        _button('back', onBack),
      ]);
    },
  );
}

Widget _surface(String name, List<Widget> children) => Scaffold(
  key: Key('test-$name'),
  body: Column(children: children),
);

Widget _button(String key, VoidCallback action) =>
    TextButton(key: Key('test-$key'), onPressed: action, child: Text(key));

class _MapDevice implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String ianaZone) async =>
      DateTime.utc(2026, 10, 21);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async => instants.map((v) => v.toString()).toList();
}
