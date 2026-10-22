import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/presentation/admin_interest_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'admin_interest_test_support.dart';

void main() {
  Future<AdminHarness> start({FakeAdminInterestRepository? repository}) async {
    final h = await AdminHarness.start(repository: repository);
    addTearDown(h.close);
    return h;
  }

  test(
    'create is confirmed only by independent stable ID and name readback',
    () async {
      final h = await start();
      await h.load();
      h.draft();
      await h.create();
      expect(h.repository.createdNames, ['Photography']);
      expect(h.repository.catalogueReads, 2);
      expect(h.state.confirmed?.interestTagId, 'tag-new');
      expect(h.state.tags.map((tag) => tag.interestTagId), [
        'tag-art',
        'tag-new',
      ]);
      expect(h.state.draft, isEmpty);
      expect(h.state.needsReadback, isFalse);
    },
  );

  test('double click cannot dispatch a second create', () async {
    final h = await start();
    await h.load();
    h.draft();
    final pending = Completer<Result<CreatedInterestTag>>();
    h.repository.creates.add(pending.future);
    final expected = h.state;
    final first = h.controller.create(session: h.session, expected: expected);
    await h.controller.create(session: h.session, expected: expected);
    expect(h.repository.createdNames, hasLength(1));
    pending.complete(const Failure(adminUnavailable));
    await first;
  });

  test(
    'stale rendered create cannot submit a newer draft in same session',
    () async {
      final h = await start();
      await h.load();
      h.draft('Old name');
      final rendered = h.state;
      h.draft('Photography');
      await h.controller.create(session: h.session, expected: rendered);
      expect(h.repository.createdNames, isEmpty);
      expect(h.state.draft, 'Photography');
    },
  );

  for (final kind in [
    AppFailureKind.catalogueNameConflict,
    AppFailureKind.catalogueInvalid,
  ]) {
    test('$kind keeps draft and allows deliberate correction', () async {
      final h = await start();
      await h.load();
      h.draft();
      h.repository.creates.add(
        Future.value(Failure(AppFailure(kind: kind, message: 'rejected'))),
      );
      await h.create();
      expect(h.state.failure?.kind, kind);
      expect(h.state.draft, 'Photography');
      expect(h.state.needsReadback, isFalse);
      h.draft('Music');
      expect(h.state.draft, 'Music');
      expect(h.state.failure, isNull);
    });
  }

  test(
    'unknown outcome locks create and draft until successful explicit read',
    () async {
      final h = await start();
      await h.load();
      h.draft();
      h.repository.creates.add(Future.value(const Failure(adminUnavailable)));
      await h.create();
      expect(h.state.needsReadback, isTrue);
      expect(h.repository.catalogueReads, 1); // No automatic recovery request.
      await h.create();
      h.draft('Music');
      expect(h.repository.createdNames, hasLength(1));
      expect(h.state.draft, 'Photography');
      h.repository.catalogues.add(
        Future.value(const Failure(adminUnavailable)),
      );
      await h.load();
      expect(h.state.needsReadback, isTrue);
      await h.create();
      expect(h.repository.createdNames, hasLength(1));
      await h.load();
      expect(h.state.needsReadback, isFalse);
      expect(h.state.confirmed, isNull);
      expect(h.state.draft, 'Photography');
      expect(h.repository.createdNames, hasLength(1));
    },
  );

  test(
    'same name after unknown request is catalogue evidence, not own save proof',
    () async {
      final h = await start();
      await h.load();
      h.draft();
      h.repository.creates.add(Future.value(const Failure(adminUnavailable)));
      await h.create();
      h.repository.tags = [
        const InterestTagOption(
          interestTagId: 'some-other-id',
          displayName: 'Photography',
        ),
      ];
      await h.load();
      expect(h.state.tags.single.interestTagId, 'some-other-id');
      expect(h.state.confirmed, isNull);
      expect(h.state.draft, 'Photography');
      expect(h.state.notice, contains('may have saved'));
    },
  );

  test('201 followed by failed read preserves acknowledgement and forbids POST retry', () async {
    final h = await start();
    await h.load();
    h.draft();
    h.repository.catalogues.add(Future.value(const Failure(adminUnavailable)));
    await h.create();
    expect(h.state.needsReadback, isTrue);
    expect(h.state.acknowledged?.interestTagId, 'tag-new');
    expect(h.state.confirmed, isNull);
    expect(h.state.draft, 'Photography');
    await h.create();
    expect(h.repository.createdNames, hasLength(1));
    await h.load();
    expect(h.state.confirmed?.interestTagId, 'tag-new');
    expect(h.state.draft, isEmpty);
    expect(h.repository.createdNames, hasLength(1));
  });

  for (final returned in [
    const InterestTagOption(
      interestTagId: 'wrong-id',
      displayName: 'Photography',
    ),
    const InterestTagOption(
      interestTagId: 'tag-new',
      displayName: 'Wrong name',
    ),
  ]) {
    test(
      'readback must match both identity and saved name: ${returned.interestTagId}/${returned.displayName}',
      () async {
        final h = await start();
        await h.load();
        h.draft();
        h.repository.catalogues.add(Future.value(Success([returned])));
        await h.create();
        expect(h.state.needsReadback, isTrue);
        expect(h.state.confirmed, isNull);
        expect(h.state.draft, 'Photography');
      },
    );
  }

  test(
    '403 revokes entry hint and closes commands while preserving draft',
    () async {
      final h = await start();
      await h.load();
      h.draft();
      h.repository.creates.add(
        Future.value(
          const Failure(
            AppFailure(
              kind: AppFailureKind.authForbidden,
              message: 'forbidden',
            ),
          ),
        ),
      );
      await h.create();
      expect(h.state.phase, AdminInterestPhase.denied);
      expect(h.state.draft, 'Photography');
      expect(
        h.container.read(adminInterestCapabilityProvider).asData?.value,
        isFalse,
      );
      await h.create();
      expect(h.repository.createdNames, hasLength(1));
    },
  );

  test(
    'external capability revocation rejects an in-flight late success',
    () async {
      final h = await start();
      await h.load();
      h.draft();
      final pending = Completer<Result<CreatedInterestTag>>();
      h.repository.creates.add(pending.future);
      final creating = h.create();
      h.container.read(adminInterestCapabilityProvider.notifier).revoke();
      expect(h.repository.guards.single(), isFalse);
      pending.complete(const Success(adminCreated));
      await creating;
      expect(h.state.phase, AdminInterestPhase.denied);
      expect(h.state.confirmed, isNull);
      expect(h.repository.catalogueReads, 1);
    },
  );

  for (final subject in ['admin-a', 'member-b']) {
    test(
      'session replacement $subject clears draft and ignores old completion',
      () async {
        final h = await start();
        await h.load();
        h.draft();
        final oldSession = h.session;
        final oldState = h.state;
        final pending = Completer<Result<CreatedInterestTag>>();
        h.repository.creates.add(pending.future);
        final creating = h.create();
        await h.replaceSession(subject);
        expect(h.repository.guards.single(), isFalse);
        await h.controller.create(session: oldSession, expected: oldState);
        pending.complete(const Success(adminCreated));
        await creating;
        expect(h.state.draft, isEmpty);
        expect(h.state.confirmed, isNull);
        expect(h.repository.createdNames, hasLength(1));
        expect(h.repository.catalogueReads, 1);
      },
    );
  }

  test(
    'initial pending capability cannot overwrite a newer refresh result',
    () async {
      final repo = FakeAdminInterestRepository();
      final initial = Completer<Result<bool>>();
      repo.capabilities.add(initial.future);
      final h = await start(repository: repo);
      expect(repo.capabilityReads, 1);
      expect(
        await h.container
            .read(adminInterestCapabilityProvider.notifier)
            .refresh(),
        isTrue,
      );
      initial.complete(const Success(false));
      await h.container.pump();
      expect(
        h.container.read(adminInterestCapabilityProvider).asData?.value,
        isTrue,
      );
    },
  );

  test('failed capability read does not claim ordinary identity or empty catalogue', () async {
    final h = await start();
    h.repository.capabilities.add(
      Future.value(const Failure(adminUnavailable)),
    );
    await h.load();
    expect(h.container.read(adminInterestCapabilityProvider).hasError, isTrue);
    expect(h.state.failure?.kind, AppFailureKind.serviceUnavailable);
    expect(h.state.hasLoaded, isFalse);
    expect(h.repository.catalogueReads, 0);
  });

  test('ordinary account has no catalogue commands', () async {
    final h = await start(
      repository: FakeAdminInterestRepository()..allowed = false,
    );
    await h.load();
    expect(h.state.phase, AdminInterestPhase.denied);
    expect(h.repository.catalogueReads, 0);
    h.draft();
    await h.create();
    expect(h.repository.createdNames, isEmpty);
  });

  test(
    'unauthenticated and initializing observations safely expose false',
    () async {
      final auth = FakeAuthRepository();
      final repo = FakeAdminInterestRepository();
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          adminInterestRepositoryProvider.overrideWithValue(repo),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await auth.close();
      });
      container.listen(adminInterestCapabilityProvider, (_, _) {});
      expect(
        container.read(adminInterestCapabilityProvider).asData?.value,
        isFalse,
      );
      auth.emit(const AuthSessionInitializing());
      await container.pump();
      expect(
        container.read(adminInterestCapabilityProvider).asData?.value,
        isFalse,
      );
      auth.emit(const AuthSessionUnauthenticated());
      await container.pump();
      expect(
        container.read(adminInterestCapabilityProvider).asData?.value,
        isFalse,
      );
      expect(repo.capabilityReads, 0);
    },
  );

  test('Unicode validation leaves NFC length and comparison to Backend', () {
    expect(adminInterestNameError('  '), isNotNull);
    expect(adminInterestNameError('Art\u202e'), isNotNull);
    expect(adminInterestNameError('Art\nMusic'), isNotNull);
    expect(adminInterestNameError(String.fromCharCode(0xd800)), isNotNull);
    // Fifty decomposed accents normalize to fifty code points, not one hundred.
    expect(adminInterestNameError(List.filled(50, 'e\u0301').join()), isNull);
    expect(adminInterestNameError('摄影'), isNull);
  });
}
