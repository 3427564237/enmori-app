import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  test(
    'loads catalogue plus selected Inactive values and saves removal',
    () async {
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
            revision: 4,
          ),
        );
      final container = ProviderContainer(
        overrides: [interestRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      final controller = container.read(
        interestEditorControllerProvider.notifier,
      );

      await controller.load();
      var state = container.read(interestEditorControllerProvider);
      final inactive = state.options.singleWhere(
        (option) => option.interestTagId == 'tag-old',
      );
      expect(inactive.isSelected, isTrue);
      expect(inactive.canSelect, isFalse);

      controller.toggle('tag-old');
      controller.toggle('tag-old');
      state = container.read(interestEditorControllerProvider);
      expect(
        state.options
            .singleWhere((option) => option.interestTagId == 'tag-old')
            .isSelected,
        isFalse,
      );
      await controller.save();
      expect(repository.savedIds.single, isEmpty);
      expect(repository.expectedRevisions.single, 4);
      expect(
        container.read(interestEditorControllerProvider).phase,
        InterestEditorPhase.saved,
      );
    },
  );

  test('clear saves an explicit empty selection', () async {
    final repository = FakeInterestRepository()
      ..ownResult = const Success(
        InterestSelection(
          interestTags: [
            SelectedInterestTag(
              interestTagId: 'tag-art',
              displayName: 'Art',
              lifecycleState: InterestLifecycleState.active,
            ),
          ],
          revision: 1,
        ),
      );
    final container = ProviderContainer(
      overrides: [interestRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      interestEditorControllerProvider.notifier,
    );
    await controller.load();
    controller.clear();
    await controller.save();
    expect(repository.savedIds, [<String>[]]);
    expect(
      container.read(interestEditorControllerProvider).savedSelection?.revision,
      2,
    );
  });

  test('selection cannot exceed ten active Interests', () async {
    final repository = FakeInterestRepository()
      ..catalogueResult = Success([
        for (var index = 0; index < 11; index++)
          InterestTagOption(
            interestTagId: 'tag-$index',
            displayName: 'Interest $index',
          ),
      ]);
    final container = ProviderContainer(
      overrides: [interestRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      interestEditorControllerProvider.notifier,
    );
    await controller.load();
    for (var index = 0; index < 11; index++) {
      controller.toggle('tag-$index');
    }
    final state = container.read(interestEditorControllerProvider);
    expect(state.selectedCount, 10);
    expect(state.validationMessage, 'Choose no more than 10 interests.');
  });

  test(
    '412 requires a fresh read and never auto-replays old selection',
    () async {
      final repository = FakeInterestRepository()
        ..replaceResult = const Failure(
          AppFailure(
            kind: AppFailureKind.interestRevisionPreconditionFailed,
            message: 'stale',
          ),
        );
      final container = ProviderContainer(
        overrides: [interestRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      final controller = container.read(
        interestEditorControllerProvider.notifier,
      );
      await controller.load();
      controller.toggle('tag-art');
      await controller.save();

      expect(
        container.read(interestEditorControllerProvider).phase,
        InterestEditorPhase.conflict,
      );
      await controller.save();
      expect(repository.savedIds, hasLength(1));

      repository.replaceResult = null;
      repository.ownResult = const Success(
        InterestSelection(interestTags: [], revision: 6),
      );
      await controller.load();
      controller.toggle('tag-books');
      await controller.save();
      expect(repository.savedIds, [
        ['tag-art'],
        ['tag-books'],
      ]);
      expect(repository.expectedRevisions, [0, 6]);
    },
  );

  test('late load response is ignored after page abandonment', () async {
    final repository = FakeInterestRepository()
      ..pendingCatalogue = Completer()
      ..pendingOwn = Completer();
    final container = ProviderContainer(
      overrides: [interestRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      interestEditorControllerProvider.notifier,
    );

    final load = controller.load();
    controller.abandon();
    repository.pendingCatalogue!.complete(const Success([]));
    repository.pendingOwn!.complete(
      const Success(InterestSelection(interestTags: [], revision: 0)),
    );
    await load;

    expect(
      container.read(interestEditorControllerProvider).phase,
      InterestEditorPhase.initial,
    );
  });

  test('late save response is ignored after page abandonment', () async {
    final repository = FakeInterestRepository()..pendingReplace = Completer();
    final container = ProviderContainer(
      overrides: [interestRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      interestEditorControllerProvider.notifier,
    );
    await controller.load();

    final save = controller.save();
    controller.abandon();
    repository.pendingReplace!.complete(
      const Success(InterestSelection(interestTags: [], revision: 1)),
    );
    await save;

    expect(
      container.read(interestEditorControllerProvider).phase,
      InterestEditorPhase.initial,
    );
  });
}
