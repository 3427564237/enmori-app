import 'dart:async';

import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/presentation/sign_in_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

final class _Subject extends Notifier<String?> {
  @override
  String? build() => null;
  void set(String? value) => state = value;
}

final _subject = NotifierProvider<_Subject, String?>(_Subject.new);

void main() {
  test(
    'auth transition before sign-in completion permits the next account login',
    () async {
      final repo = FakeAuthRepository()
        ..pendingSignIn = Completer<Result<void>>();
      final scope = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(repo),
          currentAuthSubjectProvider.overrideWith((ref) => ref.watch(_subject)),
        ],
      );
      addTearDown(scope.dispose);
      addTearDown(repo.close);
      final controller = scope.read(signInControllerProvider.notifier);
      final pending = controller.signIn(
        email: 'synthetic@example.invalid',
        password: 'synthetic',
      );
      expect(scope.read(signInControllerProvider), isA<CommandPending<void>>());
      scope.read(_subject.notifier).set('account-a');
      expect(scope.read(signInControllerProvider), isA<CommandIdle<void>>());
      controller.abandon(
        resetState: false,
      ); // route disposal precedes the SDK future
      repo.pendingSignIn!.complete(const Success(null));
      await pending;
      scope.read(_subject.notifier).set(null);
      expect(scope.read(signInControllerProvider), isA<CommandIdle<void>>());
      repo.pendingSignIn = null;
      await controller.signIn(
        email: 'second@example.invalid',
        password: 'synthetic',
      );
      expect(
        scope.read(signInControllerProvider),
        isA<CommandSucceeded<void>>(),
      );
      expect(repo.signInCount, 2);
    },
  );

  test('disposed sign-in discards late SDK completion', () async {
    final repo = FakeAuthRepository()
      ..pendingSignIn = Completer<Result<void>>();
    final scope = ProviderContainer(
      overrides: [authRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(repo.close);
    final pending = scope
        .read(signInControllerProvider.notifier)
        .signIn(email: 'synthetic@example.invalid', password: 'synthetic');
    scope.dispose();
    repo.pendingSignIn!.complete(const Success(null));
    await expectLater(pending, completes);
  });
}
