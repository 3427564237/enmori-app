import 'dart:async';

import 'package:enmori/core/network/idempotency_key_generator.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';

final class FakeIdempotencyKeyGenerator implements IdempotencyKeyGenerator {
  FakeIdempotencyKeyGenerator(this._keys);

  final List<String> _keys;
  int _index = 0;

  @override
  String generate() => _keys[_index++];
}

final class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({AuthSession? initialSession}) {
    if (initialSession != null) _sessions.add(initialSession);
  }

  final _sessions = StreamController<AuthSession>.broadcast();
  Result<void> registerResult = const Success(null);
  Result<String> tokenResult = const Success('test-token');
  int registerCount = 0;
  int watchCount = 0;

  void emit(AuthSession session) => _sessions.add(session);

  Future<void> close() => _sessions.close();

  @override
  Future<Result<String>> getIdToken() async => tokenResult;

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async {
    registerCount++;
    return registerResult;
  }

  @override
  Stream<AuthSession> watchSession() {
    watchCount++;
    return _sessions.stream;
  }
}

final class FakeAccountRepository implements AccountRepository {
  Result<OnboardingStatus> statusResult = const Success(OnboardingRequired());
  Result<ProductAccount>? completionResult;
  Completer<Result<ProductAccount>>? pendingCompletion;
  final completedUsernames = <String>[];
  final completedChoices = <InitialChoice>[];
  final onboardingKeys = <String>[];

  @override
  Future<Result<ProductAccount>> completeOnboarding({
    required String username,
    required InitialChoice initialChoice,
    required String idempotencyKey,
  }) async {
    completedUsernames.add(username);
    completedChoices.add(initialChoice);
    onboardingKeys.add(idempotencyKey);
    final pending = pendingCompletion;
    if (pending != null) return pending.future;
    final result = completionResult ?? Success(testAccount(username: username));
    if (result case Success<ProductAccount>(:final value)) {
      statusResult = Success(OnboardingCompleted(value));
    }
    return result;
  }

  @override
  Future<Result<OnboardingStatus>> readOnboardingStatus() async => statusResult;
}

final class FakeCheckInRepository implements CheckInRepository {
  Result<CheckIn> createResult = Success(testCheckIn());
  Result<CheckIn> readResult = Success(testCheckIn());
  Completer<Result<CheckIn>>? pendingCreate;
  final createKeys = <String>[];
  final createdNotes = <String>[];
  final readIds = <String>[];

  @override
  Future<Result<CheckIn>> create({
    required String note,
    required String idempotencyKey,
  }) async {
    createdNotes.add(note);
    createKeys.add(idempotencyKey);
    final pending = pendingCreate;
    if (pending != null) return pending.future;
    return createResult;
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async {
    readIds.add(checkInId);
    return readResult;
  }
}

ProductAccount testAccount({String username = 'miku_01'}) {
  return ProductAccount(
    username: username,
    optionalProcessingConsent: OptionalProcessingConsent.accepted,
    checkInVisibility: CheckInVisibility.public,
    onboardingCompletedAt: DateTime.utc(2026, 9, 3, 3, 15),
  );
}

CheckIn testCheckIn() {
  return CheckIn(
    checkInId: 'chk_test',
    note: 'A controlled test note.',
    createdAt: DateTime.utc(2026, 9, 3, 3, 20),
  );
}
