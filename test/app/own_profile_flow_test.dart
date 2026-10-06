import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/own_profile_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('Profile stays scrollable on a small phone with enlarged text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final harness = await _start(tester);
    harness.interests.fake.ownResult = Success(
      _selection([
        for (var index = 0; index < 10; index++)
          'Interest with a longer name $index',
      ]),
    );
    await _openProfile(tester);
    await tester.scrollUntilVisible(
      find.byKey(const Key('profile-edit-interests')),
      300,
      scrollable: find.descendant(
        of: find.byKey(const Key('route-own-profile')),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.pump();
    expect(
      find.byKey(const Key('profile-edit-interests')).hitTestable(),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Profile displays the owner and preserves saved order/inactive tags',
    (tester) async {
      final harness = await _start(tester);
      harness.interests.fake.ownResult = Success(
        _selection(['Books', 'Art'], inactiveFirst: true),
      );
      await _openProfile(tester);
      expect(find.text('member_a'), findsOneWidget);
      expect(find.text('Books'), findsOneWidget);
      expect(find.text('Art'), findsOneWidget);
      expect(
        tester.getTopLeft(find.text('Books')).dy,
        lessThan(tester.getTopLeft(find.text('Art')).dy),
      );
      expect(
        find.text('No longer available — you can remove it.'),
        findsOneWidget,
      );
      expect(find.text('public'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      expect(harness.accounts.statusReadCount, 1);
      expect(harness.auth.watchCount, 1);
      await tester.tap(find.byType(BackButton));
      await _frames(tester);
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(harness.events.views, [
        EventRecommendationView.home,
        EventRecommendationView.home,
      ]);
    },
  );

  testWidgets('empty Profile supports saving zero interests', (tester) async {
    final harness = await _start(tester);
    await _openProfile(tester);
    expect(find.text('No interests selected.'), findsOneWidget);
    await _openEditor(tester);
    await _tap(tester, find.byKey(const Key('interest-save')));
    await _tap(tester, find.byKey(const Key('interest-done')));
    expect(find.text('No interests selected.'), findsOneWidget);
    expect(harness.interests.fake.savedIds, [<String>[]]);
    expect(harness.interests.fake.ownReads, 3);
  });

  for (final returnAction in ['Done', 'system Back']) {
    testWidgets(
      'saved interests are reread after editor $returnAction and refresh Home',
      (tester) async {
        final harness = await _start(tester);
        await _openProfile(tester);
        await _openEditor(tester);
        await _tap(tester, find.byKey(const Key('interest-option-tag-art')));
        await _tap(tester, find.byKey(const Key('interest-save')));
        expect(find.text('Interests saved.'), findsOneWidget);
        if (returnAction == 'Done') {
          await _tap(tester, find.byKey(const Key('interest-done')));
        } else {
          await tester.binding.handlePopRoute();
          await _frames(tester);
        }
        expect(find.byKey(const Key('route-own-profile')), findsOneWidget);
        expect(find.text('Art'), findsOneWidget);
        expect(harness.interests.fake.ownReads, 3);
        expect(harness.interests.fake.savedIds, [
          ['tag-art'],
        ]);
        await tester.binding.handlePopRoute();
        await _frames(tester);
        expect(find.byKey(const Key('route-home')), findsOneWidget);
        expect(harness.events.views, [
          EventRecommendationView.home,
          EventRecommendationView.home,
        ]);
      },
    );
  }

  testWidgets('cancelling an unsaved edit neither mutates nor reports a save', (
    tester,
  ) async {
    final harness = await _start(tester);
    await _openProfile(tester);
    await _openEditor(tester);
    await _tap(tester, find.byKey(const Key('interest-option-tag-art')));
    await tester.tap(find.byType(BackButton));
    await _frames(tester);
    expect(find.text('No interests selected.'), findsOneWidget);
    expect(find.text('Art'), findsNothing);
    expect(find.text('Interests saved.'), findsNothing);
    expect(harness.interests.fake.savedIds, isEmpty);
  });

  testWidgets('failed read hides raw errors and explicit Retry recovers', (
    tester,
  ) async {
    final harness = await _start(tester);
    harness.interests.fake.ownResult = const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'private vendor diagnostic',
      ),
    );
    await _openProfile(tester);
    expect(
      find.text('Interests could not be loaded. Try again.'),
      findsOneWidget,
    );
    expect(find.text('private vendor diagnostic'), findsNothing);
    expect(find.text('No interests selected.'), findsNothing);
    harness.interests.fake.ownResult = Success(_selection(['Art']));
    await _tap(tester, find.text('Retry'));
    expect(find.text('Art'), findsOneWidget);
    expect(harness.interests.fake.ownReads, 2);
  });

  testWidgets('only the latest overlapping read may update Profile', (
    tester,
  ) async {
    final harness = await _start(tester);
    final oldRead = Completer<Result<InterestSelection>>();
    final newRead = Completer<Result<InterestSelection>>();
    harness.interests.reads.addAll([oldRead.future, newRead.future]);
    await _openProfile(tester);
    unawaited(
      harness.container.read(ownProfileControllerProvider.notifier).load(),
    );
    newRead.complete(Success(_selection(['Books'])));
    await _frames(tester);
    oldRead.complete(Success(_selection(['Art'])));
    await _frames(tester);
    expect(find.text('Books'), findsOneWidget);
    expect(find.text('Art'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'late read from a popped Profile cannot overwrite a reopened Profile',
    (tester) async {
      final harness = await _start(tester);
      final oldRead = Completer<Result<InterestSelection>>();
      harness.interests.reads.add(oldRead.future);
      await _openProfile(tester);
      await tester.binding.handlePopRoute();
      await _frames(tester);
      harness.interests.fake.ownResult = Success(_selection(['Books']));
      await _openProfile(tester);
      oldRead.complete(Success(_selection(['Art'])));
      await _frames(tester);
      expect(find.text('Books'), findsOneWidget);
      expect(find.text('Art'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'switching accounts discards the previous Profile read and return callback',
    (tester) async {
      final harness = await _start(tester);
      final oldRead = Completer<Result<InterestSelection>>();
      harness.interests.reads.add(oldRead.future);
      await _openProfile(tester);
      harness.accounts.statusResult = Success(
        OnboardingCompleted(testAccount(username: 'member_b')),
      );
      harness.interests.fake.ownResult = Success(_selection(['Books']));
      harness.auth.emit(const AuthSessionAuthenticated(subject: 'member-b'));
      await _frames(tester);
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(harness.events.views.length, 2);
      await _openProfile(tester);
      oldRead.complete(Success(_selection(['Art'])));
      await _frames(tester);
      expect(find.text('member_b'), findsOneWidget);
      expect(find.text('member_a'), findsNothing);
      expect(find.text('Books'), findsOneWidget);
      expect(find.text('Art'), findsNothing);
      expect(harness.events.views.length, 2);
      expect(harness.auth.watchCount, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'auth loss while editor saves cannot restore Profile or reload Home',
    (tester) async {
      final harness = await _start(tester);
      await _openProfile(tester);
      await _openEditor(tester);
      final save = Completer<Result<InterestSelection>>();
      harness.interests.fake.pendingReplace = save;
      await _tap(tester, find.byKey(const Key('interest-save')));
      harness.auth.emit(const AuthSessionUnauthenticated());
      await _frames(tester);
      save.complete(Success(_selection(['Art'])));
      await _frames(tester);
      expect(find.byKey(const Key('route-register')), findsOneWidget);
      expect(find.byKey(const Key('route-own-profile')), findsNothing);
      expect(harness.interests.fake.ownReads, 2);
      expect(harness.events.views, [EventRecommendationView.home]);
      expect(tester.takeException(), isNull);
    },
  );
}

InterestSelection _selection(
  List<String> labels, {
  bool inactiveFirst = false,
}) => InterestSelection(
  interestTags: [
    for (var index = 0; index < labels.length; index++)
      SelectedInterestTag(
        interestTagId: 'tag-${labels[index].toLowerCase()}',
        displayName: labels[index],
        lifecycleState: inactiveFirst && index == 0
            ? InterestLifecycleState.inactive
            : InterestLifecycleState.active,
      ),
  ],
  revision: 1,
);

Future<_Harness> _start(WidgetTester tester) async {
  final auth = FakeAuthRepository();
  final accounts = FakeAccountRepository()
    ..statusResult = Success(
      OnboardingCompleted(testAccount(username: 'member_a')),
    );
  final interests = _Interests();
  final events = FakeEventRecommendationRepository();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      accountRepositoryProvider.overrideWithValue(accounts),
      interestRepositoryProvider.overrideWithValue(interests),
      eventRecommendationRepositoryProvider.overrideWithValue(events),
    ],
  );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  await tester.pump();
  auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
  await _frames(tester);
  expect(find.byKey(const Key('route-home')), findsOneWidget);
  return _Harness(container, auth, accounts, interests, events);
}

Future<void> _openProfile(WidgetTester tester) async {
  await _tap(tester, find.byKey(const Key('my-profile-button')));
  expect(find.byKey(const Key('route-own-profile')), findsOneWidget);
}

Future<void> _openEditor(WidgetTester tester) async {
  await _tap(tester, find.byKey(const Key('profile-edit-interests')));
  expect(find.byKey(const Key('route-interests')), findsOneWidget);
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester) async {
  for (var index = 0; index < 8; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _Harness {
  _Harness(
    this.container,
    this.auth,
    this.accounts,
    this.interests,
    this.events,
  );
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final FakeAccountRepository accounts;
  final _Interests interests;
  final FakeEventRecommendationRepository events;
}

// Models persistence and controlled read ordering at the existing repository boundary.
final class _Interests implements InterestRepository {
  final fake = FakeInterestRepository();
  final reads = <Future<Result<InterestSelection>>>[];

  @override
  Future<Result<InterestSelection>> readOwn() {
    if (reads.isEmpty) return fake.readOwn();
    fake.ownReads++;
    return reads.removeAt(0);
  }

  @override
  Future<Result<List<InterestTagOption>>> readSelectableTags() =>
      fake.readSelectableTags();

  @override
  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  }) async {
    final result = await fake.replaceOwn(
      interestTagIds: interestTagIds,
      expectedRevision: expectedRevision,
    );
    if (result is Success<InterestSelection>) fake.ownResult = result;
    return result;
  }
}
