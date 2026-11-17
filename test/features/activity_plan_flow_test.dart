import 'dart:async';

import 'package:enmori/app/event_recommendation_card.dart';
import 'package:enmori/app/recommendation_conditions.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/event_plans_page.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:enmori/features/interests/presentation/interest_summary.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_plans_test.dart'
    show PlansRepo, Opener, fact, tap, pauseApp, resumeApp;

final class _Details implements EventDetailRepository {
  var reads = 0;
  bool available = true;
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads++;
    return available
        ? Success(
            EventDetail(
              eventId: id,
              title: 'Community cooking workshop',
              startAt: DateTime.utc(2026, 11, 22, 2),
              endAt: DateTime.utc(2026, 11, 22, 4),
              locationLabel: 'Community Club · Level 2',
              shortDescription: 'Long official description. ' * 80,
              externalSourceUrl: 'https://www.ticketmaster.sg/event/a',
            ),
          )
        : const Failure(participationUnavailable);
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

EventRecommendation get _event => EventRecommendation(
  eventId: 'a',
  title: 'Community cooking workshop',
  startAt: DateTime.utc(2026, 11, 22, 2),
  locationLabel: 'Community Club',
  matchedInterests: const [],
  reasonCode: 'interest_match',
);

Future<void> _pump(
  WidgetTester tester,
  WidgetBuilder builder, {
  ParticipationRepository? plans,
  EventRecommendationRepository? recommendations,
  _Details? details,
  FakeInterestRepository? interests,
  Stream<AuthSession>? sessions,
  Locale locale = const Locale('en'),
  double scale = 1,
  bool dark = false,
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
        participationRepositoryProvider.overrideWithValue(plans ?? PlansRepo()),
        eventDetailRepositoryProvider.overrideWithValue(details ?? _Details()),
        interestRepositoryProvider.overrideWithValue(
          interests ?? FakeInterestRepository(),
        ),
        eventRecommendationRepositoryProvider.overrideWithValue(
          recommendations ?? FakeEventRecommendationRepository(),
        ),
      ],
      child: ContentAccessBoundary(
        child: MaterialApp(
          locale: locale,
          supportedLocales: const [Locale('en'), Locale('zh')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          theme: ThemeData(
            brightness: dark ? Brightness.dark : Brightness.light,
          ),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(scale),
              disableAnimations: true,
            ),
            child: child!,
          ),
          home: Builder(builder: builder),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final class _HeldPageRecommendations implements EventRecommendationRepository {
  int reads = 0;
  bool hold = false;
  final pending = Completer<Result<EventRecommendationResponse>>();
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async {
    reads++;
    if (hold) return pending.future;
    return Success(
      EventRecommendationResponse(
        asOf: DateTime.utc(2026, 11, 17),
        formulaVersion: 'synthetic',
        items: [_event],
      ),
    );
  }
}

final class _HeldPlanWrite implements ParticipationRepository {
  final plans = PlansRepo();
  final pending = Completer<void>();
  bool fail = false;
  int attempts = 0;
  @override
  Future<Result<EventParticipation>> read(String id, bool Function() current) =>
      plans.read(id, current);
  @override
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) async {
    attempts++;
    await pending.future;
    if (fail) return const Failure(participationUnavailable);
    return plans.save(previous, status, ignored, current);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected synthetic ${invocation.memberName}');
}

Future<void> _hide(WidgetTester tester) async {
  await tap(tester, find.byTooltip('More event options'));
  await tap(tester, find.text('Ignore recommendation'));
}

void main() {
  for (final locale in ['en', 'zh']) {
    for (final success in [true, false]) {
      testWidgets(
        'full recommendation page retains hide outcome during menu return refresh (success=$success, $locale)',
        (tester) async {
          final plans = _HeldPlanWrite()..fail = !success;
          final recommendations = _HeldPageRecommendations();
          await _pump(
            tester,
            (_) => EventRecommendationsPage(
              recommendationCardBuilder: (_, event, open) =>
                  ConnectedRecommendationCard(event: event, onOpen: open),
            ),
            plans: plans,
            recommendations: recommendations,
            locale: Locale(locale),
          );
          final container = ProviderScope.containerOf(
            tester.element(find.byType(EventRecommendationsPage)),
          );
          expect(recommendations.reads, 1);
          recommendations.hold = true;
          await tap(
            tester,
            find.byTooltip(locale == 'en' ? 'More event options' : '更多活动选项'),
          );
          await tester.tap(
            find.text(locale == 'en' ? 'Ignore recommendation' : '忽略推荐'),
          );
          await tester.pump(const Duration(milliseconds: 400));
          await tester.pump();
          expect(plans.attempts, 1);
          expect(
            recommendations.reads,
            2,
            reason: 'Closing the popup currently refreshes the whole page.',
          );
          expect(find.text('Community cooking workshop'), findsNothing);
          plans.pending.complete();
          await tester.pump(const Duration(milliseconds: 400));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 400));
          if (success) {
            expect(plans.plans.facts['a']!.ignored, isTrue);
            final undo = find.text(locale == 'en' ? 'Undo' : '撤销');
            expect(undo, findsOneWidget);
            await tester.tap(undo);
            await tester.pump(const Duration(milliseconds: 400));
            await tester.pump();
            await tester.pump(const Duration(milliseconds: 400));
            expect(plans.attempts, 2);
            expect(plans.plans.facts['a']!.ignored, isFalse);
            expect(
              plans.plans.facts['a']!.status,
              ParticipationStatus.interested,
            );
            expect(
              find.text(locale == 'en' ? 'Recommendation restored.' : '已恢复推荐。'),
              findsOneWidget,
            );
          } else {
            expect(plans.plans.facts['a']!.ignored, isFalse);
            expect(
              container.read(participationControllerProvider)['a']!.uncertain,
              isTrue,
            );
            expect(
              find.textContaining(
                locale == 'en' ? 'Change not confirmed.' : '修改尚未确认',
              ),
              findsOneWidget,
            );
            expect(find.text(locale == 'en' ? 'Undo' : '撤销'), findsNothing);
            await tester.pump(const Duration(seconds: 20));
            expect(plans.attempts, 1);
          }
          await tester.pumpWidget(const SizedBox());
          await tester.pump();
        },
      );
    }
  }

  for (final replaceSession in [true, false]) {
    testWidgets(
      'late hide failure cannot show feedback after ${replaceSession ? 'same-subject session replacement' : 'leaving the page'}',
      (tester) async {
        final sessions = StreamController<AuthSession>();
        addTearDown(sessions.close);
        sessions.add(AuthSessionAuthenticated(subject: 'owner'));
        final plans = _HeldPlanWrite()..fail = true;
        final recommendations = _HeldPageRecommendations();
        await _pump(
          tester,
          (_) => Consumer(
            builder: (context, ref, _) {
              // The actual router resolves the session before creating this page.
              if (participationSession(ref.watch(authSessionProvider)) ==
                  null) {
                return const Scaffold();
              }
              return EventRecommendationsPage(
                recommendationCardBuilder: (_, event, open) =>
                    ConnectedRecommendationCard(event: event, onOpen: open),
              );
            },
          ),
          plans: plans,
          recommendations: recommendations,
          sessions: sessions.stream,
        );
        final page = tester.element(find.byType(EventRecommendationsPage));
        final container = ProviderScope.containerOf(page);
        await container
            .read(participationControllerProvider.notifier)
            .load('a');
        await tester.pumpAndSettle();
        recommendations.hold = true;
        await tap(tester, find.byTooltip('More event options'));
        await tester.tap(find.text('Ignore recommendation'));
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pump();
        expect(plans.attempts, 1);
        if (replaceSession) {
          sessions.add(AuthSessionAuthenticated(subject: 'owner'));
        } else {
          unawaited(
            Navigator.of(page).push<void>(
              MaterialPageRoute(
                builder: (_) => const Scaffold(body: Text('Another page')),
              ),
            ),
          );
        }
        await tester.pump(const Duration(milliseconds: 400));
        plans.pending.complete();
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pump();
        expect(
          find.textContaining('Change not confirmed.', skipOffstage: false),
          findsNothing,
        );
        expect(find.text('Undo', skipOffstage: false), findsNothing);
        expect(plans.attempts, 1);
        await tester.pumpWidget(const SizedBox());
        await tester.pump();
      },
    );
  }

  testWidgets(
    'plan card shares one authorized detail read for title, SGT range and venue',
    (tester) async {
      final details = _Details();
      await _pump(
        tester,
        (_) => EventPlansPage(onOpenEvent: (_) {}),
        details: details,
      );
      expect(details.reads, 1);
      expect(find.text('Community cooking workshop'), findsOneWidget);
      expect(find.text('Community Club · Level 2'), findsOneWidget);
      expect(find.textContaining('SGT'), findsOneWidget);
      expect(find.textContaining('Plan updated'), findsOneWidget);
      details.available = false;
      await tap(tester, find.text('Refresh plans'));
      expect(find.text('Community Club · Level 2'), findsNothing);
      expect(find.textContaining('SGT'), findsNothing);
      expect(find.text('Time and location unavailable.'), findsOneWidget);
      expect(find.text('Interested'), findsWidgets);
    },
  );

  testWidgets(
    'detail plan actions precede long description and remain usable without details',
    (tester) async {
      final details = _Details();
      await _pump(
        tester,
        (_) => ParticipationEventPage(
          eventId: 'a',
          opener: Opener(),
          onParticipants: (_) {},
        ),
        details: details,
      );
      expect(
        tester.getTopLeft(find.text('Interested')).dy,
        lessThan(tester.getTopLeft(find.text('About this event')).dy),
      );
      await tap(tester, find.text('Going'));
      details.available = false;
      await tap(tester, find.byIcon(Icons.refresh));
      expect(find.text('Going'), findsOneWidget);
      expect(find.text('Community Club · Level 2'), findsNothing);
    },
  );

  testWidgets(
    'Undo survives removed recommendation card and restores the same plan status',
    (tester) async {
      final plans = PlansRepo()
        ..facts['a'] = fact('a', status: ParticipationStatus.going);
      await _pump(
        tester,
        (_) => Scaffold(
          body: SingleChildScrollView(
            child: ConnectedRecommendationCard(event: _event),
          ),
        ),
        plans: plans,
      );
      await _hide(tester);
      expect(find.text('Community cooking workshop'), findsNothing);
      expect(plans.facts['a']!.ignored, isTrue);
      await tap(tester, find.text('Undo'));
      expect(find.text('Community cooking workshop'), findsOneWidget);
      expect(plans.facts['a']!.ignored, isFalse);
      expect(plans.facts['a']!.status, ParticipationStatus.going);
      expect(plans.writes.map((row) => row.revision), [1, 2]);
      expect(find.text('Recommendation restored.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'unknown Undo reports unconfirmed result and never automatically resends',
    (tester) async {
      final plans = PlansRepo();
      await _pump(
        tester,
        (_) => Scaffold(
          body: SingleChildScrollView(
            child: ConnectedRecommendationCard(event: _event),
          ),
        ),
        plans: plans,
      );
      await _hide(tester);
      plans.unknownWrite = true;
      await tap(tester, find.text('Undo'));
      expect(find.textContaining('Restoration not confirmed.'), findsOneWidget);
      expect(find.text('Recommendation restored.'), findsNothing);
      expect(find.text('Community cooking workshop'), findsNothing);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(Scaffold)),
      );
      expect(
        container.read(participationControllerProvider)['a']!.uncertain,
        isTrue,
      );
      await tester.pump(const Duration(seconds: 20));
      expect(plans.writes.length, 2);
    },
  );

  testWidgets('old Undo cannot write after same-subject session replacement', (
    tester,
  ) async {
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    final plans = PlansRepo();
    await _pump(
      tester,
      (_) => Scaffold(
        body: SingleChildScrollView(
          child: ConnectedRecommendationCard(event: _event),
        ),
      ),
      plans: plans,
      sessions: sessions.stream,
    );
    sessions.add(const AuthSessionAuthenticated(subject: 'owner'));
    await tester.pumpAndSettle();
    final container = ProviderScope.containerOf(
      tester.element(find.byType(Scaffold)),
    );
    await container.read(participationControllerProvider.notifier).load('a');
    await tester.pumpAndSettle();
    await _hide(tester);
    sessions.add(AuthSessionAuthenticated(subject: 'owner'));
    await tester.pumpAndSettle();
    await tap(tester, find.text('Undo'));
    expect(plans.writes.length, 1);
    expect(plans.facts['a']!.ignored, isTrue);
  });

  testWidgets(
    'nonempty recommendations expose conditions and saved editor changes on return',
    (tester) async {
      final interests = FakeInterestRepository();
      await _pump(
        tester,
        (context) => EventRecommendationsPage(
          contextControls: RecommendationConditions(
            showArea: false,
            onEditInterests: () {
              Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (editorContext) => InterestEditorPage(
                    onSaved: (selection) {
                      interests.ownResult = Success(selection);
                      Navigator.of(editorContext).pop();
                    },
                  ),
                ),
              );
            },
          ),
        ),
        interests: interests,
      );
      expect(find.text('Third-ranked event'), findsOneWidget);
      final edit = find.byKey(
        const Key('recommendation-conditions-edit-interests'),
      );
      expect(edit.hitTestable(), findsOneWidget);
      await tap(tester, edit);
      await tap(tester, find.byKey(const Key('interest-option-tag-art')));
      await tap(tester, find.byKey(const Key('interest-save')));
      await tap(tester, find.text('Done'));
      expect(find.byType(InterestEditorPage), findsNothing);
      expect(
        find.descendant(
          of: find.byType(InterestSummary),
          matching: find.text('Art'),
        ),
        findsOneWidget,
      );
      expect(interests.savedIds.single, ['tag-art']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'interest summary distinguishes failure, retry and foreground refresh',
    (tester) async {
      final interests = FakeInterestRepository()
        ..ownResult = const Failure(participationUnavailable);
      await _pump(
        tester,
        (_) => Scaffold(body: InterestSummary(onEdit: () {})),
        interests: interests,
      );
      expect(find.text('Interests unavailable'), findsOneWidget);
      expect(find.text('No interests selected'), findsNothing);
      interests.ownResult = const Success(
        InterestSelection(interestTags: [], revision: 0),
      );
      await tap(tester, find.text('Retry interests'));
      expect(find.text('No interests selected'), findsOneWidget);
      final before = interests.ownReads;
      pauseApp(tester);
      await tester.pumpAndSettle();
      expect(interests.ownReads, before);
      resumeApp(tester);
      await tester.pumpAndSettle();
      expect(interests.ownReads, greaterThan(before));
      expect(tester.takeException(), isNull);
    },
  );

  for (final locale in ['en', 'zh']) {
    for (final (size, scale, dark) in [
      (const Size(375, 812), 1.0, false),
      (const Size(320, 640), 2.0, false),
      (const Size(812, 375), 2.0, true),
    ]) {
      testWidgets(
        'conditions and plan summary fit $locale $size ${scale}x dark=$dark',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final interests = FakeInterestRepository()
            ..ownResult = Success(
              InterestSelection(
                revision: 1,
                interestTags: [
                  for (var i = 0; i < 10; i++)
                    SelectedInterestTag(
                      interestTagId: '$i',
                      displayName: 'Long interest $i',
                      lifecycleState: InterestLifecycleState.active,
                    ),
                ],
              ),
            );
          await _pump(
            tester,
            (_) => Scaffold(
              body: SingleChildScrollView(
                child: RecommendationConditions(
                  onEditInterests: () {},
                  showArea: false,
                ),
              ),
            ),
            interests: interests,
            locale: Locale(locale),
            scale: scale,
            dark: dark,
          );
          await tester.ensureVisible(
            find.byKey(const Key('recommendation-conditions-edit-interests')),
          );
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          await _pump(
            tester,
            (_) => ParticipationEventPage(
              eventId: 'a',
              opener: Opener(),
              onParticipants: (_) {},
            ),
            locale: Locale(locale),
            scale: scale,
            dark: dark,
          );
          await tap(tester, find.text(locale == 'zh' ? '将参加' : 'Going'));
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
        },
      );
    }
  }
}
