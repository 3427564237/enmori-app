import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/domain/auth_repository.dart';

import '../../core/result/result.dart';
import 'domain/participation_repository.dart';

AuthSessionAuthenticated? participationSession(AsyncValue<AuthSession> value) =>
    switch (value) {
      AsyncData<AuthSession>(value: final AuthSessionAuthenticated session) =>
        session,
      _ => null,
    };

final participationRepositoryProvider = Provider<ParticipationRepository>(
  (ref) => const _UnavailableParticipation(),
);
const participationUnavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Event participation is unavailable. Read again later.',
);

final class _UnavailableParticipation implements ParticipationRepository {
  const _UnavailableParticipation();
  @override
  Future<Result<PublicParticipationPage>> forUsername(
    String username,
    String? cursor,
    bool Function() current,
  ) async => const Failure(participationUnavailable);
  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async => const Failure(participationUnavailable);
  @override
  Future<Result<EventParticipation>> save(
    EventParticipation old,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) async => const Failure(participationUnavailable);
  @override
  Future<Result<EventParticipantPage>> participants(
    String id,
    ParticipationStatus status,
    ParticipantGroup group,
    String? cursor,
    bool Function() current,
  ) async => const Failure(participationUnavailable);
  @override
  Future<Result<EventParticipationPage>> own(
    String? cursor,
    bool Function() current,
  ) async => const Failure(participationUnavailable);
}
