enum AppFailureKind {
  catalogueInvalid,
  catalogueNameConflict,
  eventParticipationInvalid,
  eventParticipationRevisionPreconditionFailed,
  requestInvalid,
  aiContextNotPermitted,
  conversationUnavailable,
  aiOperationUnavailable,
  aiOperationConflict,
  requestTooLarge,
  aiInputInvalid,
  aiBusy,
  aiUnavailable,
  aiReplyRejected,
  aiAuthorityChanged,
  aiOutcomeUnresolved,
  proactiveRevisionPreconditionFailed,
  proactiveInputInvalid,
  aiSourceUnavailable,
  aiContextSelectionConflict,
  personaInvalid,
  personaUnavailable,
  personaLimitReached,
  personaCommandConflict,
  personaRevisionPreconditionFailed,
  addFriendTargetUnavailable,
  friendRequestUnavailable,
  friendRevisionPreconditionFailed,
  friendIgnorePreconditionFailed,
  eventUnavailable,
  profileInvalid,
  profileRevisionPreconditionFailed,
  settingsInvalid,
  settingsRevisionPreconditionFailed,
  authRequired,
  authForbidden,
  authenticationInvalid,
  accountAlreadyExists,
  usernameInvalid,
  usernameUnavailable,
  onboardingRequired,
  onboardingConflict,
  checkInRevisionPreconditionFailed,
  checkInInvalid,
  checkInUnavailable,
  interestSelectionInvalid,
  interestRevisionPreconditionFailed,
  idempotencyKeyInvalid,
  idempotencyConflict,
  serviceUnavailable,
  configurationUnavailable,
  unexpected,
}

final class AppFailure {
  const AppFailure({required this.kind, required this.message, this.requestId});

  final AppFailureKind kind;
  final String message;
  final String? requestId;
}

sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  const Success(this.value);

  final T value;
}

final class Failure<T> extends Result<T> {
  const Failure(this.failure);

  final AppFailure failure;
}
