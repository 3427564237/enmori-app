import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/activity_routes.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_browse/presentation/activity_page.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('ordinary router omits activity entry and routes', (
    tester,
  ) async {
    final f = await _start(tester, enabled: false);
    expect(find.byKey(const Key('home-browse-activities')), findsNothing);
    expect(
      f.container
          .read(appRouterProvider)
          .configuration
          .routes
          .whereType<GoRoute>()
          .where((r) => r.path.startsWith('/activities')),
      isEmpty,
    );
    expect(f.repository.reads, isEmpty);
  });

  testWidgets(
    'Home list detail back remains separate from recommendations and never auto-opens',
    (tester) async {
      final f = await _start(tester);
      await _tap(tester, find.byKey(const Key('home-browse-activities')));
      expect(f.repository.reads, [null]);
      expect(find.text('Source: Ticketmaster'), findsOneWidget);
      await _tap(tester, find.text('Synthetic browse activity'));
      expect(f.repository.reads, [null, 'tm_QQ']);
      expect(find.text('Activity details'), findsOneWidget);
      expect(f.opener.calls, 0);
      await _tap(tester, find.text('Tickets / booking on Ticketmaster'));
      expect(f.opener.calls, 1);
      expect(
        find.text('Could not open the source page. You can copy the link.'),
        findsOneWidget,
      );
      expect(find.text('Copy source link'), findsOneWidget);
      f.container.read(appRouterProvider).pop();
      await tester.pumpAndSettle();
      expect(find.text('Browse activities'), findsOneWidget);
      expect(f.repository.reads, [null, 'tm_QQ']);
      expect(f.events.views, [EventRecommendationView.home]);
      expect(tester.takeException(), isNull);
      await _finish(tester, f);
    },
  );

  for (final gate in RouterGateState.values.where(
    (g) => g != RouterGateState.authenticated,
  )) {
    testWidgets('both activity deep links require $gate gate', (tester) async {
      final f = await _start(tester, gate: gate);
      for (final path in ['/activities', '/activities/tm_QQ']) {
        f.container.read(appRouterProvider).go(path);
        await _frames(tester);
        expect(find.byType(ActivityPage), findsNothing);
      }
      expect(f.repository.reads, isEmpty);
    });
  }

  testWidgets(
    'same-subject replacement invalidates old list callback and content',
    (tester) async {
      final f = await _start(tester);
      await _tap(tester, find.byKey(const Key('home-browse-activities')));
      final stale = tester
          .widget<ActivityPage>(find.byType(ActivityPage))
          .onSelect!;
      f.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
      await _frames(tester);
      stale('tm_QQ');
      await _frames(tester);
      expect(find.byType(ActivityPage), findsNothing);
      expect(f.repository.reads, [null]);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('background and return clear list and require explicit reload', (
    tester,
  ) async {
    final f = await _start(tester);
    await _tap(tester, find.byKey(const Key('home-browse-activities')));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Synthetic browse activity'), findsNothing);
    expect(find.text('Reload activities to continue.'), findsOneWidget);
    expect(f.repository.reads, [null]);
    await _tap(tester, find.text('Reload'));
    expect(f.repository.reads, [null, null]);
    await _finish(tester, f);
  });

  testWidgets(
    'pending source action cannot restore notices or data after background and return',
    (tester) async {
      final f = await _start(tester);
      final pending = f.opener.pending = Completer<bool>();
      await _tap(tester, find.byKey(const Key('home-browse-activities')));
      await _tap(tester, find.text('Synthetic browse activity'));
      await _tap(tester, find.text('Tickets / booking on Ticketmaster'));
      expect(f.opener.calls, 1);
      expect(f.opener.pendingCurrent!(), isTrue);
      expect(f.repository.reads, [null, 'tm_QQ']);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      expect(f.opener.pendingCurrent!(), isFalse);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      pending.complete(false);
      await tester.pumpAndSettle();
      expect(find.text('Synthetic browse activity'), findsNothing);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(find.byType(SnackBar), findsNothing);
      expect(find.text('Copy source link'), findsNothing);
      expect(f.repository.reads, [null, 'tm_QQ']);

      await _tap(tester, find.text('Reload'));
      expect(f.repository.reads, [null, 'tm_QQ', 'tm_QQ']);
      expect(find.text('Synthetic browse activity'), findsOneWidget);
      expect(f.opener.calls, 1);
      f.container.read(appRouterProvider).pop();
      await tester.pumpAndSettle();
      expect(find.text('Browse activities'), findsOneWidget);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(find.text('Synthetic browse activity'), findsNothing);
      expect(f.repository.reads, [null, 'tm_QQ', 'tm_QQ']);
      expect(f.events.views, [EventRecommendationView.home]);
      expect(tester.takeException(), isNull);
      await _finish(tester, f);
    },
  );

  testWidgets(
    'covered activity list callback cannot stack another detail or read again',
    (tester) async {
      final f = await _start(tester);
      await _tap(tester, find.byKey(const Key('home-browse-activities')));
      final covered = tester
          .widget<ActivityPage>(find.byType(ActivityPage))
          .onSelect!;
      await _tap(tester, find.text('Synthetic browse activity'));
      covered('tm_QQ');
      await _frames(tester);
      expect(f.repository.reads, [null, 'tm_QQ']);
      expect(
        f.container.read(appRouterProvider).state.uri.path,
        '/activities/tm_QQ',
      );
      expect(f.opener.calls, 0);

      // One Back must reveal the original list rather than a duplicated Detail.
      f.container.read(appRouterProvider).pop();
      await tester.pumpAndSettle();
      expect(find.text('Browse activities'), findsOneWidget);
      expect(find.text('Activity details'), findsNothing);
      expect(f.repository.reads, [null, 'tm_QQ']);
      expect(tester.takeException(), isNull);
      await _finish(tester, f);
    },
  );
}

Future<_Fixture> _start(
  WidgetTester tester, {
  bool enabled = true,
  RouterGateState gate = RouterGateState.authenticated,
}) async {
  final f = _Fixture();
  var currentGate = RouterGateState.resolving;
  f.container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(f.auth),
      accountRepositoryProvider.overrideWithValue(
        FakeAccountRepository()
          ..statusResult = Success(OnboardingCompleted(testAccount())),
      ),
      routerGateProvider.overrideWith((ref) => currentGate),
      activityBrowseEnabledProvider.overrideWithValue(enabled),
      activityRepositoryProvider.overrideWithValue(f.repository),
      externalActivityOpenerProvider.overrideWithValue(f.opener),
      eventRecommendationRepositoryProvider.overrideWithValue(f.events),
    ],
  );
  addTearDown(() async {
    await f.dispose();
  });
  await tester.pumpWidget(
    UncontrolledProviderScope(container: f.container, child: const EnmoriApp()),
  );
  f.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
  await _frames(tester);
  currentGate = gate;
  f.container.invalidate(routerGateProvider);
  await _frames(tester);
  return f;
}

Future<void> _finish(WidgetTester tester, _Fixture f) async {
  await tester.pumpWidget(const SizedBox());
  await f.dispose();
  await tester.pump();
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

final class _Fixture {
  final auth = FakeAuthRepository();
  final repository = _Repository();
  final opener = _Opener();
  final events = FakeEventRecommendationRepository();
  late ProviderContainer container;
  bool disposed = false;
  Future<void> dispose() async {
    if (disposed) return;
    disposed = true;
    container.dispose();
    await auth.close();
  }
}

final class _Repository implements ActivityRepository {
  final reads = <String?>[];
  static const summary = ActivitySummary(
    browseId: 'tm_QQ',
    title: 'Synthetic browse activity',
    startAt: '2026-10-16T12:00:00Z',
  );
  @override
  Future<Result<ActivityRead>> read(String? id) async {
    reads.add(id);
    return Success(
      id == null
          ? ActivityBatch(asOf: '2026-10-15T00:00:00Z', items: const [summary])
          : ActivityDetail(
              summary: summary,
              sourceUrl: Uri.parse(
                'https://ticketmaster.sg/activity/synthetic',
              ),
            ),
    );
  }
}

final class _Opener implements ExternalActivityOpener {
  int calls = 0;
  Completer<bool>? pending;
  bool Function()? pendingCurrent;
  @override
  Future<bool> open(Uri url, {required bool Function() current}) async {
    if (!current()) return false;
    calls++;
    pendingCurrent = current;
    return pending?.future ?? false;
  }
}
