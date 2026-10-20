import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/persona.dart';
import 'domain/persona_preview_repository.dart';

final personaPreviewRepositoryProvider = Provider<PersonaPreviewRepository?>(
  (ref) => null,
);

/// The app composition observes the account settings source. Fail closed while
/// settings are unavailable, changing or optional processing is not accepted.
/// Backend independently rechecks authentication and consent.
final personaPreviewAccessProvider = Provider<bool>((ref) => false);

final personaPreviewControllerProvider =
    NotifierProvider.autoDispose<PersonaPreviewController, PersonaPreviewState>(
      PersonaPreviewController.new,
    );

final class PersonaPreviewState {
  const PersonaPreviewState({
    required this.sessionKey,
    required this.canPreview,
    this.isBusy = false,
    this.reply,
    this.failure,
  });

  final Object sessionKey;
  final bool canPreview;
  final bool isBusy;
  final String? reply;
  final AppFailure? failure;
}

final class PersonaPreviewController extends Notifier<PersonaPreviewState> {
  PersonaPreviewRepository? _repository;
  Object _epoch = Object();

  @override
  PersonaPreviewState build() {
    final auth = switch (ref.watch(authSessionProvider)) {
      AsyncData<AuthSession>(:final value) => value,
      _ => null,
    };
    final accepted = ref.watch(personaPreviewAccessProvider);
    _repository = ref.watch(personaPreviewRepositoryProvider);
    _epoch = Object();
    final epoch = _epoch;
    ref.onDispose(() {
      if (identical(_epoch, epoch)) _epoch = Object();
    });
    return PersonaPreviewState(
      sessionKey: epoch,
      canPreview:
          auth is AuthSessionAuthenticated && accepted && _repository != null,
    );
  }

  Future<void> preview(PersonaFields draft, String text) async {
    final repository = _repository;
    if (!state.canPreview || state.isBusy || repository == null) return;
    final epoch = _epoch;
    state = PersonaPreviewState(
      sessionKey: epoch,
      canPreview: true,
      isBusy: true,
    );
    bool eligible() => ref.mounted && identical(_epoch, epoch);
    final result = await repository.preview(
      draft: draft.normalized,
      text: text,
      isEligible: eligible,
    );
    if (!eligible()) return;
    state = switch (result) {
      Success<String>(:final value) => PersonaPreviewState(
        sessionKey: epoch,
        canPreview: true,
        reply: value,
      ),
      Failure<String>(:final failure) => PersonaPreviewState(
        sessionKey: epoch,
        canPreview: !{
          AppFailureKind.authRequired,
          AppFailureKind.authForbidden,
          AppFailureKind.aiContextNotPermitted,
          AppFailureKind.aiAuthorityChanged,
        }.contains(failure.kind),
        failure: failure,
      ),
    };
  }
}
