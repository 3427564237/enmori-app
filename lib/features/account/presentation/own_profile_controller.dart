import '../content_access.dart';

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../interests/domain/interest_repository.dart';
import '../../interests/interests_providers.dart';
import '../account_providers.dart';
import '../domain/account_repository.dart';

enum OwnProfilePhase { loading, ready, failed }

final class OwnProfileState {
  const OwnProfileState({
    this.username,
    this.phase = OwnProfilePhase.loading,
    this.interests = const [],
  });

  final String? username;
  final OwnProfilePhase phase;
  final List<SelectedInterestTag> interests;
}

final ownProfileControllerProvider =
    NotifierProvider.autoDispose<OwnProfileController, OwnProfileState>(
      OwnProfileController.new,
    );

final class OwnProfileController extends Notifier<OwnProfileState> {
  late InterestRepository _repository;
  int _operation = 0;

  @override
  OwnProfileState build() {
    _repository = ref.watch(interestRepositoryProvider);
    ref.watch(contentAccessProvider);
    final subject = ref.watch(currentAuthSubjectProvider);
    final account = subject == null
        ? null
        : ref.watch(onboardingStatusProvider(subject));
    final username = switch (account) {
      AsyncData<Result<OnboardingStatus>>(
        value: Success<OnboardingStatus>(
          value: OnboardingCompleted(account: final account),
        ),
      ) =>
        account.username,
      _ => null,
    };
    final operation = ++_operation;
    ref.onDispose(() => _operation++);
    if (username != null && ref.read(contentAccessProvider).foreground) {
      scheduleMicrotask(() {
        if (ref.mounted && operation == _operation) unawaited(load());
      });
    }
    return OwnProfileState(username: username);
  }

  Future<void> load() async {
    if (!ref.mounted ||
        state.username == null ||
        !ref.read(contentAccessProvider).foreground) {
      return;
    }
    final operation = ++_operation;
    final username = state.username;
    state = OwnProfileState(username: username);
    final result = await _repository.readOwn();
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<InterestSelection>(:final value) => OwnProfileState(
        username: username,
        phase: OwnProfilePhase.ready,
        interests: List.unmodifiable(value.interestTags),
      ),
      Failure<InterestSelection>() => OwnProfileState(
        username: username,
        phase: OwnProfilePhase.failed,
      ),
    };
  }
}
