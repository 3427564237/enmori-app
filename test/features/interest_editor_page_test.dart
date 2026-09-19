import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:enmori/features/interests/presentation/interest_editor_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('Home exposes the Interest editor entry', (tester) async {
    var opened = false;
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: HomeShellPage(
            onStartCheckIn: () {},
            onEditInterests: () => opened = true,
            onSeeAllEvents: () {},
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('edit-interests-button')));
    expect(opened, isTrue);
  });

  testWidgets('loads, edits, clears, saves and returns an explicit result', (
    tester,
  ) async {
    final repository = FakeInterestRepository();
    InterestSelection? returned;
    await _pump(tester, repository, onSaved: (value) => returned = value);

    expect(find.text('0 of 10 selected'), findsOneWidget);
    await tester.tap(find.byKey(const Key('interest-option-tag-art')));
    await tester.pump();
    expect(find.text('1 of 10 selected'), findsOneWidget);
    await tester.tap(find.byKey(const Key('interest-clear')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('interest-save')));
    await tester.pumpAndSettle();

    expect(repository.savedIds, [<String>[]]);
    expect(find.byKey(const Key('interest-save-success')), findsOneWidget);
    await tester.tap(find.byKey(const Key('interest-done')));
    expect(returned?.revision, 1);
  });

  testWidgets('selected Inactive value can be removed but not re-added', (
    tester,
  ) async {
    final repository = FakeInterestRepository()
      ..ownResult = const Success(
        InterestSelection(
          interestTags: [
            SelectedInterestTag(
              interestTagId: 'tag-old',
              displayName: 'Legacy',
              lifecycleState: InterestLifecycleState.inactive,
            ),
          ],
          revision: 2,
        ),
      );
    await _pump(tester, repository);

    final option = find.byKey(const Key('interest-option-tag-old'));
    expect(
      find.text('No longer available — you can remove it.'),
      findsOneWidget,
    );
    await tester.tap(option);
    await tester.pump();
    final checkbox = tester.widget<CheckboxListTile>(option);
    expect(checkbox.value, isFalse);
    expect(checkbox.onChanged, isNull);
  });

  testWidgets('load and save failures expose explicit retry actions', (
    tester,
  ) async {
    final repository = FakeInterestRepository()
      ..catalogueResult = const Failure(
        AppFailure(kind: AppFailureKind.serviceUnavailable, message: 'detail'),
      );
    await _pump(tester, repository);
    expect(find.byKey(const Key('interest-load-failure')), findsOneWidget);

    repository.catalogueResult = const Success([]);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    repository.replaceResult = const Failure(
      AppFailure(kind: AppFailureKind.serviceUnavailable, message: 'detail'),
    );
    await tester.tap(find.byKey(const Key('interest-save')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('interest-save-failure')), findsOneWidget);
    await tester.tap(find.text('Retry save'));
    await tester.pumpAndSettle();
    expect(repository.savedIds, hasLength(2));
  });

  testWidgets('412 disables save until the user explicitly reloads', (
    tester,
  ) async {
    final repository = FakeInterestRepository()
      ..replaceResult = const Failure(
        AppFailure(
          kind: AppFailureKind.interestRevisionPreconditionFailed,
          message: 'detail',
        ),
      );
    await _pump(tester, repository);
    await tester.tap(find.byKey(const Key('interest-save')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('interest-conflict')), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('interest-save')))
          .onPressed,
      isNull,
    );
    repository.replaceResult = null;
    repository.ownResult = const Success(
      InterestSelection(interestTags: [], revision: 5),
    );
    await tester.tap(find.text('Reload interests'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('interest-conflict')), findsNothing);
    expect(repository.ownReads, 2);
  });

  testWidgets('disposing the page ignores a late load response', (
    tester,
  ) async {
    final repository = FakeInterestRepository()
      ..pendingCatalogue = Completer()
      ..pendingOwn = Completer();
    final auth = FakeAuthRepository();
    addTearDown(auth.close);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        interestRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: InterestEditorPage()),
      ),
    );
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    repository.pendingCatalogue!.complete(const Success([]));
    repository.pendingOwn!.complete(
      const Success(InterestSelection(interestTags: [], revision: 0)),
    );
    await tester.pump();

    expect(
      container.read(interestEditorControllerProvider).phase,
      InterestEditorPhase.loading,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('disposing the page ignores a late save response', (
    tester,
  ) async {
    final repository = FakeInterestRepository();
    final auth = FakeAuthRepository();
    addTearDown(auth.close);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        interestRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: InterestEditorPage()),
      ),
    );
    await tester.pumpAndSettle();
    repository.pendingReplace = Completer();
    await tester.tap(find.byKey(const Key('interest-save')));
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    repository.pendingReplace!.complete(
      const Success(InterestSelection(interestTags: [], revision: 1)),
    );
    await tester.pump();

    expect(
      container.read(interestEditorControllerProvider).phase,
      InterestEditorPhase.saving,
    );
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester,
  FakeInterestRepository repository, {
  ValueChanged<InterestSelection>? onSaved,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [interestRepositoryProvider.overrideWithValue(repository)],
      child: MaterialApp(home: InterestEditorPage(onSaved: onSaved)),
    ),
  );
  await tester.pumpAndSettle();
}
