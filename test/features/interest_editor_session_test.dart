import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  test(
    'same-subject replacement clears the previous saved selection',
    () async {
      final h = await _start();
      await h.controller.load();
      h.controller.toggle('tag-art');
      await h.controller.save();
      expect(h.state.savedSelection?.interestTags.single.displayName, 'Art');

      await h.replaceSession();

      expect(h.state.phase, InterestEditorPhase.initial);
      expect(h.state.options, isEmpty);
      expect(h.state.savedSelection, isNull);
      h.repository.ownResult = const Success(
        InterestSelection(interestTags: [], revision: 5),
      );
      await h.controller.load();
      expect(h.state.revision, 5);
      expect(h.state.selectedCount, 0);
      expect(h.auth.watchCount, 1);
    },
  );

  test('same-subject replacement rejects an older in-flight read', () async {
    final h = await _start();
    final pending = Completer<Result<InterestSelection>>();
    h.repository.pendingOwn = pending;
    final oldLoad = h.controller.load();
    await h.replaceSession();
    pending.complete(const Success(_oldSelection));
    await oldLoad;
    expect(h.state.phase, InterestEditorPhase.initial);
    expect(h.state.options, isEmpty);
    h.repository.pendingOwn = null;
    h.repository.ownResult = const Success(
      InterestSelection(interestTags: [], revision: 8),
    );
    await h.controller.load();

    expect(h.state.phase, InterestEditorPhase.ready);
    expect(h.state.selectedCount, 0);
    expect(h.state.revision, 8);
    expect(h.repository.savedIds, isEmpty);
  });

  test('same-subject replacement rejects an older successful save', () async {
    final h = await _start();
    await h.controller.load();
    h.controller.toggle('tag-art');
    final pending = Completer<Result<InterestSelection>>();
    h.repository.pendingReplace = pending;
    final oldSave = h.controller.save();
    await h.replaceSession();
    pending.complete(const Success(_oldSelection));
    await oldSave;
    expect(h.state.phase, InterestEditorPhase.initial);
    expect(h.state.savedSelection, isNull);
    h.repository.ownResult = const Success(
      InterestSelection(interestTags: [], revision: 9),
    );
    await h.controller.load();

    expect(h.state.phase, InterestEditorPhase.ready);
    expect(h.state.selectedCount, 0);
    expect(h.state.revision, 9);
    expect(h.state.savedSelection, isNull);
    expect(h.repository.savedIds, [
      ['tag-art'],
    ]);
    expect(h.repository.expectedRevisions, [0]);
  });

  test('disposed controller ignores its pending save completion', () async {
    final h = await _start();
    await h.controller.load();
    final pending = Completer<Result<InterestSelection>>();
    h.repository.pendingReplace = pending;
    final save = h.controller.save();
    h.container.dispose();
    pending.complete(const Success(_oldSelection));
    await expectLater(save, completes);
  });
}

const _oldSelection = InterestSelection(
  interestTags: [
    SelectedInterestTag(
      interestTagId: 'tag-art',
      displayName: 'Art',
      lifecycleState: InterestLifecycleState.active,
    ),
  ],
  revision: 1,
);

Future<_Harness> _start() async {
  final auth = FakeAuthRepository();
  final repository = FakeInterestRepository();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      interestRepositoryProvider.overrideWithValue(repository),
    ],
  );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
  await container.read(authSessionProvider.future);
  final controller = container.read(interestEditorControllerProvider.notifier);
  return _Harness(container, auth, repository, controller);
}

final class _Harness {
  _Harness(this.container, this.auth, this.repository, this.controller);

  final ProviderContainer container;
  final FakeAuthRepository auth;
  final FakeInterestRepository repository;
  final InterestEditorController controller;

  InterestEditorState get state =>
      container.read(interestEditorControllerProvider);

  Future<void> replaceSession() async {
    auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await container.pump();
  }
}
