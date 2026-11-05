import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
import 'package:enmori/features/interests/presentation/admin_interest_controller.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:flutter_test/flutter_test.dart';

import 'admin_interest_test_support.dart';

void main() {
  Future<({AdminHarness h, FakeManagedAdminInterestRepository repo})>
  start() async {
    final repo = FakeManagedAdminInterestRepository(),
        h = await AdminHarness.start(repository: repo);
    addTearDown(h.close);
    await h.load();
    return (h: h, repo: repo);
  }

  void renameDraft(AdminHarness h) {
    h.controller.beginRename(
      h.state.managedTags.first,
      session: h.session,
      expected: h.state,
    );
    h.controller.editRename('Drawing', session: h.session);
  }

  test(
    'management reads active and inactive items with original revisions',
    () async {
      final (:h, :repo) = await start();
      expect(h.state.managementEnabled, isTrue);
      expect(h.state.managedTags, [managedArt, managedMusic]);
      expect(repo.catalogueReads, 0);
      expect(repo.managementReads, 1);
      expect(h.state.permanentDeletionAvailable, isFalse);
    },
  );
  test('rename keeps draft until independent management readback confirms revision and fields', () async {
    final (:h, :repo) = await start();
    renameDraft(h);
    final readback = Completer<Result<List<ManagedInterestTag>>>();
    repo.managementCatalogues.add(readback.future);
    final saving = h.controller.rename(session: h.session, expected: h.state);
    await h.container.pump();
    expect(h.state.phase, AdminInterestPhase.checking);
    expect(h.state.renameDraft, 'Drawing');
    expect(h.state.needsReadback, isTrue);
    expect(repo.changes.single.revision, 1);
    expect(repo.changes.single.name, 'Drawing');
    readback.complete(Success(repo.managed));
    await saving;
    expect(h.state.editTarget, isNull);
    expect(h.state.needsReadback, isFalse);
    expect(h.state.notice, contains('confirmed'));
    expect(h.state.managedTags.first.revision, 2);
  });
  test('unknown update locks mutations until explicit read and never replays the request', () async {
    final (:h, :repo) = await start();
    renameDraft(h);
    repo.updates.add(Future.value(const Failure(adminUnavailable)));
    await h.controller.rename(session: h.session, expected: h.state);
    expect(h.state.needsReadback, isTrue);
    expect(h.state.renameDraft, 'Drawing');
    expect(repo.managementReads, 1);
    await h.controller.rename(session: h.session, expected: h.state);
    expect(repo.changes, hasLength(1));
    await h.load();
    expect(repo.changes, hasLength(1));
    expect(h.state.needsReadback, isFalse);
    expect(h.state.renameDraft, 'Drawing');
  });
  test('stale revision rereads current state but retains rename draft for deliberate correction', () async {
    final (:h, :repo) = await start();
    renameDraft(h);
    repo.managed = [
      const ManagedInterestTag(
        interestTagId: 'tag-art',
        displayName: 'Painting',
        lifecycleState: InterestLifecycleState.active,
        revision: 2,
      ),
      managedMusic,
    ];
    repo.updates.add(
      Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.catalogueRevisionPreconditionFailed,
            message: 'stale',
          ),
        ),
      ),
    );
    await h.controller.rename(session: h.session, expected: h.state);
    expect(repo.changes, hasLength(1));
    expect(h.state.renameDraft, 'Drawing');
    expect(h.state.editTarget?.revision, 2);
    expect(
      h.state.failure?.kind,
      AppFailureKind.catalogueRevisionPreconditionFailed,
    );
    expect(h.state.needsReadback, isFalse);
    await h.controller.rename(session: h.session, expected: h.state);
    expect(repo.changes.last.revision, 2);
  });
  test(
    'acknowledgement followed by a newer catalogue is not labelled confirmed',
    () async {
      final (:h, :repo) = await start();
      renameDraft(h);
      repo.managementCatalogues.add(
        Future.value(const Success([managedArt, managedMusic])),
      );
      await h.controller.rename(session: h.session, expected: h.state);
      expect(h.state.notice, contains('not confirmed'));
      expect(h.state.renameDraft, 'Drawing');
      expect(h.state.editTarget, isNotNull);
    },
  );
  test(
    'lifecycle actions bind the rendered revision and retain inactive rows',
    () async {
      final (:h, :repo) = await start();
      final old = h.state;
      await h.controller.changeLifecycle(
        managedArt,
        InterestLifecycleState.inactive,
        session: h.session,
        expected: old,
      );
      expect(
        h.state.managedTags.first.lifecycleState,
        InterestLifecycleState.inactive,
      );
      expect(h.state.managedTags.first.revision, 2);
      await h.controller.changeLifecycle(
        managedArt,
        InterestLifecycleState.inactive,
        session: h.session,
        expected: old,
      );
      expect(repo.changes, hasLength(1));
      await h.controller.changeLifecycle(
        h.state.managedTags.first,
        InterestLifecycleState.active,
        session: h.session,
        expected: h.state,
      );
      expect(
        h.state.managedTags.first.lifecycleState,
        InterestLifecycleState.active,
      );
      expect(repo.changes.last.revision, 2);
    },
  );
  test(
    'same-UID session replacement retires late update and its draft',
    () async {
      final (:h, :repo) = await start();
      renameDraft(h);
      final pending = Completer<Result<ManagedInterestTag>>();
      repo.updates.add(pending.future);
      final saving = h.controller.rename(session: h.session, expected: h.state);
      await h.replaceSession();
      pending.complete(const Success(managedArt));
      await saving;
      expect(repo.guards.single(), isFalse);
      expect(h.state.renameDraft, isEmpty);
      expect(h.state.managedTags, isEmpty);
    },
  );
  test(
    'connected deletion remains gated despite active Admin capability',
    () async {
      final (:h, :repo) = await start();
      await h.controller.delete(
        managedMusic,
        session: h.session,
        expected: h.state,
      );
      expect(repo.deletes, 0);
    },
  );
  test('capability loss clears privileged catalogue snapshots while retaining drafts', () async {
    final (:h, :repo) = await start();
    renameDraft(h);
    h.draft('New interest');
    h.container.read(adminInterestCapabilityProvider.notifier).revoke();
    await h.container.pump();
    expect(h.state.phase, AdminInterestPhase.denied);
    expect(h.state.tags, isEmpty);
    expect(h.state.managedTags, isEmpty);
    expect(h.state.managementEnabled, isFalse);
    expect(h.state.hasLoaded, isFalse);
    expect(h.state.renameDraft, 'Drawing');
    expect(h.state.draft, 'New interest');
    await h.controller.rename(session: h.session, expected: h.state);
    expect(repo.changes, isEmpty);
  });
}
