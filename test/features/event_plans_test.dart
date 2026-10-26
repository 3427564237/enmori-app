import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/event_plans_page.dart';
import 'package:enmori/features/event_participation/presentation/own_participation_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

EventParticipation fact(
  String id, {
  ParticipationStatus status = ParticipationStatus.interested,
  bool ignored = false,
  int revision = 1,
}) => EventParticipation(
  eventId: id,
  status: status,
  ignored: ignored,
  revision: revision,
  updatedAt: DateTime.utc(2026, 10, 23, 9),
);

final class PlansRepo implements ParticipationRepository {
  final facts = <String, EventParticipation>{'a': fact('a')};
  final cursors = <String?>[];
  final writes = <EventParticipation>[];
  final pages = <String?, Result<EventParticipationPage>>{};
  Completer<Result<EventParticipationPage>>? pending;
  bool unknownWrite = false;
  @override
  Future<Result<EventParticipationPage>> own(
    String? cursor,
    bool Function() current,
  ) async {
    cursors.add(cursor);
    final held = pending;
    pending = null;
    return held?.future ??
        pages[cursor] ??
        Success(EventParticipationPage(facts.values.toList(), null));
  }

  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async => Success(facts[id]!);
  @override
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) async {
    if (!current()) return const Failure(participationUnavailable);
    writes.add(previous);
    facts[previous.eventId] = fact(
      previous.eventId,
      status: status,
      ignored: ignored,
      revision: previous.revision + 1,
    );
    return unknownWrite
        ? const Failure(participationUnavailable)
        : Success(facts[previous.eventId]!);
  }

  @override
  Future<Result<EventParticipantPage>> participants(
    String id,
    ParticipationStatus status,
    ParticipantGroup group,
    String? cursor,
    bool Function() current,
  ) async => Success(EventParticipantPage(items: []));
  @override
  Future<Result<PublicParticipationPage>> forUsername(
    String username,
    String? cursor,
    bool Function() current,
  ) async => Success(PublicParticipationPage([], null));
}

final class Details implements EventDetailRepository {
  bool available = true;
  int reads = 0;
  Completer<Result<EventDetail>>? pending;
  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads++;
    final held = pending;
    pending = null;
    if (held != null) return held.future;
    return available
        ? Success(
            EventDetail(
              eventId: id,
              title: 'An evening of music $id',
              startAt: DateTime.utc(2027),
              externalSourceUrl: 'https://www.ticketmaster.sg/event/$id',
            ),
          )
        : const Failure(participationUnavailable);
  }
}

final class Opener implements ExternalActivityOpener {
  @override
  Future<bool> open(Uri uri, {required bool Function() current}) async => false;
}

ProviderContainer container(PlansRepo repo) => ProviderContainer(
  overrides: [
    participationRepositoryProvider.overrideWithValue(repo),
    authSessionProvider.overrideWithValue(
      const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
    ),
  ],
);

Future<void> pumpPlans(
  WidgetTester tester,
  PlansRepo repo, {
  Details? details,
  Stream<AuthSession>? sessions,
  double scale = 1,
  bool dark = false,
  bool reducedMotion = false,
  Locale locale = const Locale('en'),
}) async {
  if (Platform.environment['ENMORI_SOCIAL_PREVIEW'] == '1') {
    for (final (family, path) in [
      ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
      ('SocialPreviewCjk', Platform.environment['ENMORI_CAPTURE_CJK_FONT']),
      ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
      (
        'Playfair Display',
        'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
      ),
    ]) {
      if (path == null) continue;
      final bytes = await tester.runAsync(() => File(path).readAsBytes());
      await tester.runAsync(
        () => (FontLoader(
          family,
        )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
      );
    }
  }
  final baseTheme = dark
      ? ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff244b3f),
            brightness: Brightness.dark,
          ),
        )
      : enmoriTheme();
  // Widget-test engines have no device font fallback. This is preview-only.
  final previewTheme = Platform.environment['ENMORI_SOCIAL_PREVIEW'] == '1'
      ? baseTheme.copyWith(
          textTheme: baseTheme.textTheme.apply(
            fontFamilyFallback: ['SocialPreviewCjk'],
          ),
          appBarTheme: baseTheme.appBarTheme.copyWith(
            titleTextStyle: baseTheme.appBarTheme.titleTextStyle?.copyWith(
              fontFamilyFallback: ['SocialPreviewCjk'],
            ),
          ),
        )
      : baseTheme;
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        participationRepositoryProvider.overrideWithValue(repo),
        eventDetailRepositoryProvider.overrideWithValue(details ?? Details()),
        if (sessions == null)
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
          )
        else
          authSessionProvider.overrideWith((ref) => sessions),
      ],
      child: MaterialApp(
        locale: locale,
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: previewTheme,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: reducedMotion,
          ),
          child: RepaintBoundary(
            key: const Key('plans-preview'),
            child: child!,
          ),
        ),
        home: Builder(
          builder: (context) => EventPlansPage(
            onOpenEvent: (id) => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ParticipationEventPage(
                  eventId: id,
                  opener: Opener(),
                  onParticipants: (_) {},
                ),
              ),
            ),
          ),
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
  testWidgets(
    'Event detail preserves valid state on returns and reloads after expiry',
    (tester) async {
      final details = Details(), repo = PlansRepo();
      final nav = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
            ),
            participationRepositoryProvider.overrideWithValue(repo),
            eventDetailRepositoryProvider.overrideWithValue(details),
          ],
          child: MaterialApp(
            navigatorKey: nav,
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: ParticipationEventPage(
              eventId: 'a',
              opener: Opener(),
              onParticipants: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(details.reads, 1);
      expect(find.text('An evening of music a'), findsOneWidget);
      final resumedRead = Completer<Result<EventDetail>>();
      details.pending = resumedRead;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(details.reads, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      await tester.pump();
      expect(details.reads, 1);
      expect(find.text('An evening of music a'), findsOneWidget);
      unawaited(
        nav.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => const Scaffold(body: Text('Other page')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      nav.currentState!.pop();
      await tester.pumpAndSettle();
      expect(details.reads, 1);
      await tester.pump(const Duration(minutes: 5));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      await tester.pump();
      expect(details.reads, 2);
      expect(find.text('An evening of music a'), findsNothing);
      resumedRead.complete(
        Success(
          EventDetail(
            eventId: 'a',
            title: 'Fresh Event detail',
            startAt: DateTime.utc(2027),
            externalSourceUrl: 'https://www.ticketmaster.sg/event/a',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Fresh Event detail'), findsOneWidget);
      expect(repo.writes, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  test('pages accumulate, deduplicate, retain cursor on failure and continue after empty pages', () async {
    final repo = PlansRepo()
      ..pages[null] = Success(EventParticipationPage([fact('a')], 'p1'));
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(ownParticipationControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(ownParticipationControllerProvider.notifier);
    await ctrl.load();
    repo.pages['p1'] = const Failure(participationUnavailable);
    await ctrl.load(more: true);
    expect(
      c.read(ownParticipationControllerProvider).items.single.eventId,
      'a',
    );
    expect(c.read(ownParticipationControllerProvider).nextCursor, 'p1');
    repo.pages['p1'] = Success(EventParticipationPage([], 'p2'));
    await ctrl.load(more: true);
    repo.pages['p2'] = Success(
      EventParticipationPage([fact('a', revision: 2), fact('b')], null),
    );
    await ctrl.load(more: true);
    expect(
      c.read(ownParticipationControllerProvider).items.map((e) => e.eventId),
      ['a', 'b'],
    );
    expect(c.read(ownParticipationControllerProvider).items.first.revision, 2);
    await ctrl.load(more: true);
    expect(repo.cursors, [null, 'p1', 'p1', 'p2']);
  });

  for (final kind in [
    AppFailureKind.authRequired,
    AppFailureKind.authForbidden,
    AppFailureKind.authenticationInvalid,
    AppFailureKind.onboardingRequired,
  ]) {
    test(
      'explicit access loss $kind retires loaded pages and shared projection without retry',
      () async {
        final repo = PlansRepo()
          ..pages[null] = Success(EventParticipationPage([fact('a')], 'p1'));
        final c = container(repo);
        addTearDown(c.dispose);
        final sub = c.listen(ownParticipationRecordsProvider, (_, _) {});
        addTearDown(sub.close);
        final ctrl = c.read(ownParticipationControllerProvider.notifier);
        await ctrl.load();
        await c.read(participationControllerProvider.notifier).load('a');
        final old = c.read(ownParticipationControllerProvider);
        expect(ctrl.isCurrentSnapshot(old), isTrue);
        repo.pages['p1'] = Failure(
          AppFailure(kind: kind, message: 'Access unavailable'),
        );
        await ctrl.load(more: true);
        expect(c.read(ownParticipationControllerProvider).loaded, isFalse);
        expect(c.read(ownParticipationControllerProvider).items, isEmpty);
        expect(c.read(ownParticipationControllerProvider).nextCursor, isNull);
        expect(c.read(ownParticipationRecordsProvider), isEmpty);
        expect(ctrl.isCurrentSnapshot(old), isFalse);
        await ctrl.ensureLoaded();
        await ctrl.load(more: true);
        expect(repo.cursors, [null, 'p1']);
      },
    );
  }

  test('duplicate clicks and cursor cycles do not repeatedly advance or lose loaded facts', () async {
    final repo = PlansRepo()
      ..pages[null] = Success(EventParticipationPage([fact('a')], 'p1'));
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(ownParticipationControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final ctrl = c.read(ownParticipationControllerProvider.notifier);
    await ctrl.load();
    final pending = Completer<Result<EventParticipationPage>>();
    repo.pending = pending;
    final request = ctrl.load(more: true);
    await ctrl.load(more: true);
    expect(repo.cursors, [null, 'p1']);
    pending.complete(Success(EventParticipationPage([fact('b')], 'p1')));
    await request;
    expect(c.read(ownParticipationControllerProvider).failure, isNotNull);
    expect(
      c.read(ownParticipationControllerProvider).items.single.eventId,
      'a',
    );
  });

  test('slow pages cannot replace newer shared facts; unknown writes are not replayed', () async {
    final repo = PlansRepo();
    final c = container(repo);
    addTearDown(c.dispose);
    final sub = c.listen(ownParticipationRecordsProvider, (_, _) {});
    addTearDown(sub.close);
    final pending = Completer<Result<EventParticipationPage>>();
    repo.pending = pending;
    final request = c.read(ownParticipationControllerProvider.notifier).load();
    final commands = c.read(participationControllerProvider.notifier);
    await commands.load('a');
    await commands.change('a', ParticipationStatus.going, false);
    pending.complete(Success(EventParticipationPage([fact('a')], null)));
    await request;
    expect(
      c.read(ownParticipationRecordsProvider).single.status,
      ParticipationStatus.going,
    );
    repo.unknownWrite = true;
    await commands.change('a', ParticipationStatus.none, false);
    expect(
      c.read(ownParticipationRecordsProvider).single.status,
      ParticipationStatus.going,
    );
    expect(c.read(participationControllerProvider)['a']!.uncertain, isTrue);
    await commands.change('a', ParticipationStatus.none, false);
    expect(repo.writes.length, 2);
    await commands.load('a');
    expect(
      c.read(ownParticipationRecordsProvider).single.status,
      ParticipationStatus.none,
    );
    expect(c.read(participationControllerProvider)['a']!.uncertain, isFalse);
  });

  testWidgets(
    'plan detail change returns to the same filter, previous pages and scroll position',
    (tester) async {
      final repo = PlansRepo()
        ..pages[null] = Success(EventParticipationPage([fact('a')], 'p1'));
      repo.facts['b'] = fact('b');
      repo.pages['p1'] = Success(EventParticipationPage([fact('b')], null));
      await pumpPlans(tester, repo);
      await tap(tester, find.byKey(const ValueKey('plans-filter-interested')));
      await tap(tester, find.text('Load more plans'));
      await tester.ensureVisible(find.byKey(const ValueKey('plan-b')));
      await tester.pumpAndSettle();
      final position = tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .pixels;
      await tap(tester, find.byKey(const ValueKey('plan-b')));
      await tap(tester, find.text('Going'));
      expect(repo.writes.single.eventId, 'b');
      await tap(tester, find.byType(BackButton));
      expect(
        tester
            .widget<ChoiceChip>(
              find.byKey(const ValueKey('plans-filter-interested')),
            )
            .selected,
        isTrue,
      );
      expect(find.byKey(const ValueKey('plan-b')), findsNothing);
      expect(find.byKey(const ValueKey('plan-a')), findsOneWidget);
      expect(repo.cursors, [null, 'p1']);
      // The route restores its offset (bounded by the shorter filtered content).
      expect(
        tester
            .state<ScrollableState>(find.byType(Scrollable).first)
            .position
            .pixels,
        lessThanOrEqualTo(position),
      );
      await tap(tester, find.byKey(const ValueKey('plans-filter-going')));
      expect(find.byKey(const ValueKey('plan-b')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'source-unavailable hidden plan remains manageable and changes sync on return',
    (tester) async {
      final repo = PlansRepo()
        ..facts['a'] = fact(
          'a',
          status: ParticipationStatus.going,
          ignored: true,
        );
      await pumpPlans(tester, repo, details: Details()..available = false);
      await tap(tester, find.byKey(const ValueKey('plans-filter-hidden')));
      expect(find.text('Event details currently unavailable'), findsOneWidget);
      await tap(tester, find.byKey(const ValueKey('plan-a')));
      await tap(tester, find.byTooltip('More event options'));
      await tap(tester, find.text('Restore recommendation'));
      expect(repo.writes.single.ignored, isTrue);
      expect(repo.facts['a']!.ignored, isFalse);
      expect(repo.facts['a']!.status, ParticipationStatus.going);
      await tap(tester, find.byType(BackButton));
      expect(find.byKey(const ValueKey('plan-a')), findsNothing);
      expect(
        find.textContaining('No hidden records in this loaded selection'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'failed initial load is not an empty plan list and explicit refresh recovers',
    (tester) async {
      final repo = PlansRepo()
        ..pages[null] = const Failure(participationUnavailable);
      await pumpPlans(tester, repo);
      expect(find.text('Plans couldn’t be refreshed'), findsOneWidget);
      expect(find.textContaining('No saved plans yet'), findsNothing);
      repo.pages.clear();
      await tap(tester, find.text('Refresh plans'));
      expect(find.byKey(const ValueKey('plan-a')), findsOneWidget);
    },
  );

  testWidgets(
    'old session taps and late reads cannot expose previous owner plans',
    (tester) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final repo = PlansRepo();
      await pumpPlans(tester, repo, sessions: sessions.stream);
      sessions.add(AuthSessionAuthenticated(subject: 'owner'));
      await tester.pumpAndSettle();
      final oldTap = tester.widget<ListTile>(find.byType(ListTile)).onTap!;
      final held = Completer<Result<EventParticipationPage>>();
      repo.pending = held;
      await tester.tap(find.text('Refresh plans'));
      await tester.pump();
      repo.facts.clear();
      sessions.add(AuthSessionAuthenticated(subject: 'owner'));
      await tester.pumpAndSettle();
      oldTap();
      held.complete(Success(EventParticipationPage([fact('a')], null)));
      await tester.pumpAndSettle();
      expect(find.byType(ParticipationEventPage), findsNothing);
      expect(find.byKey(const ValueKey('plan-a')), findsNothing);
      expect(find.textContaining('No saved plans yet'), findsOneWidget);
    },
  );

  testWidgets(
    'background clears plan content and late reads cannot restore it',
    (tester) async {
      final repo = PlansRepo();
      await pumpPlans(tester, repo);
      final held = Completer<Result<EventParticipationPage>>();
      repo.pending = held;
      await tester.tap(find.text('Refresh plans'));
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('plan-a')), findsNothing);
      held.complete(Success(EventParticipationPage([fact('a')], null)));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('plan-a')), findsNothing);
      repo.facts.clear();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.textContaining('No saved plans yet'), findsOneWidget);
    },
  );

  testWidgets(
    'Chinese plans keep source content and save the same Going enum',
    (tester) async {
      final repo = PlansRepo();
      await pumpPlans(tester, repo, locale: const Locale('zh'));
      expect(find.text('我的活动计划'), findsOneWidget);
      expect(find.text('全部记录'), findsOneWidget);
      expect(find.text('An evening of music a'), findsOneWidget);
      await tap(tester, find.byKey(const ValueKey('plan-a')));
      expect(find.text('活动详情'), findsOneWidget);
      await tap(tester, find.text('将参加'));
      expect(repo.facts['a']!.status, ParticipationStatus.going);
      await tap(tester, find.byType(BackButton));
      expect(find.text('An evening of music a'), findsOneWidget);
      expect(find.byKey(const ValueKey('plan-a')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final (size, scale, language) in [
    (const Size(375, 740), 1.0, 'en'),
    (const Size(375, 740), 2.0, 'en'),
    (const Size(375, 740), 2.0, 'zh'),
    (const Size(800, 400), 2.0, 'en'),
  ]) {
    for (final dark in [false, true]) {
      testWidgets(
        'plans layout ${size.width} dark=$dark ${scale}x $language and reduced motion',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await pumpPlans(
            tester,
            PlansRepo(),
            scale: scale,
            locale: Locale(language),
            dark: dark,
            reducedMotion: true,
          );
          await tap(tester, find.byKey(const ValueKey('plans-filter-going')));
          await tap(tester, find.byKey(const ValueKey('plans-filter-all')));
          await tester.ensureVisible(find.byKey(const ValueKey('plan-a')));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          if (Platform.environment['ENMORI_SOCIAL_PREVIEW'] == '1') {
            final boundary = tester.renderObject<RenderRepaintBoundary>(
              find.byKey(const Key('plans-preview')),
            );
            final image = await tester.runAsync(() => boundary.toImage());
            final bytes = await tester.runAsync(
              () => image!.toByteData(format: ui.ImageByteFormat.png),
            );
            await tester.runAsync(() async {
              final file = File(
                'build/social-preview/plans-$language-${size.width.toInt()}-${scale.toInt()}x-${dark ? 'dark' : 'light'}.png',
              );
              await file.parent.create(recursive: true);
              await file.writeAsBytes(bytes!.buffer.asUint8List());
            });
            image!.dispose();
          }
        },
      );
    }
  }
}
