import 'dart:async';

import 'package:enmori/core/network/idempotency_key_generator.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';

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
  Result<void> signInResult = const Success(null);
  Result<void> signOutResult = const Success(null);
  int signOutCount = 0;
  Completer<Result<void>>? pendingSignIn;
  Result<String> tokenResult = const Success('test-token');
  int registerCount = 0;
  int signInCount = 0;
  int watchCount = 0;

  void emit(AuthSession session) => _sessions.add(session);

  Future<void> close() => _sessions.close();

  @override
  Future<Result<String>> getIdToken() async => tokenResult;

  @override
  Future<Result<void>> signOut() async {
    signOutCount++;
    if (signOutResult is Success<void>) {
      emit(const AuthSessionUnauthenticated());
    }
    return signOutResult;
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async {
    registerCount++;
    return registerResult;
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async {
    signInCount++;
    final pending = pendingSignIn;
    if (pending != null) return pending.future;
    return signInResult;
  }

  @override
  Stream<AuthSession> watchSession() {
    watchCount++;
    return _sessions.stream;
  }
}

final class FakeAccountRepository implements AccountRepository {
  Result<OnboardingStatus> statusResult = const Success(OnboardingRequired());
  final statusResponses = <Future<Result<OnboardingStatus>>>[];
  int statusReadCount = 0;
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
  Future<Result<OnboardingStatus>> readOnboardingStatus() async {
    statusReadCount++;
    if (statusResponses.isNotEmpty) return statusResponses.removeAt(0);
    return statusResult;
  }
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
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
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

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Success(CheckInHistoryPage(checkIns: [], nextCursor: null));
}

final class FakeInterestRepository implements InterestRepository {
  Result<List<InterestTagOption>> catalogueResult = Success([
    const InterestTagOption(interestTagId: 'tag-art', displayName: 'Art'),
    const InterestTagOption(interestTagId: 'tag-books', displayName: 'Books'),
  ]);
  Result<InterestSelection> ownResult = const Success(
    InterestSelection(interestTags: [], revision: 0),
  );
  Result<InterestSelection>? replaceResult;
  Completer<Result<List<InterestTagOption>>>? pendingCatalogue;
  Completer<Result<InterestSelection>>? pendingOwn;
  Completer<Result<InterestSelection>>? pendingReplace;
  int catalogueReads = 0;
  int ownReads = 0;
  final savedIds = <List<String>>[];
  final expectedRevisions = <int>[];

  @override
  Future<Result<List<InterestTagOption>>> readSelectableTags() async {
    catalogueReads++;
    return pendingCatalogue?.future ?? catalogueResult;
  }

  @override
  Future<Result<InterestSelection>> readOwn() async {
    ownReads++;
    return pendingOwn?.future ?? ownResult;
  }

  @override
  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  }) async {
    savedIds.add([...interestTagIds]);
    expectedRevisions.add(expectedRevision);
    final pending = pendingReplace;
    if (pending != null) return pending.future;
    return replaceResult ??
        Success(
          InterestSelection(
            interestTags: [
              for (final id in interestTagIds)
                SelectedInterestTag(
                  interestTagId: id,
                  displayName: id == 'tag-art' ? 'Art' : 'Books',
                  lifecycleState: InterestLifecycleState.active,
                ),
            ],
            revision: expectedRevision + 1,
          ),
        );
  }
}

final class FakeEventRecommendationRepository
    implements EventRecommendationRepository {
  Result<EventRecommendationResponse> homeResult = Success(
    testEventRecommendations(),
  );
  Result<EventRecommendationResponse> allResult = Success(
    testEventRecommendations(),
  );
  final views = <EventRecommendationView>[];

  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async {
    views.add(view);
    return switch (view) {
      EventRecommendationView.home => homeResult,
      EventRecommendationView.all => allResult,
    };
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

EventRecommendationResponse testEventRecommendations() {
  return EventRecommendationResponse(
    asOf: DateTime.utc(2026, 9, 15, 9),
    formulaVersion: 'event_recommendation_v1',
    items: [
      EventRecommendation(
        eventId: 'evt_03',
        title: 'Third-ranked event',
        startAt: DateTime.utc(2026, 9, 18, 10),
        endAt: DateTime.utc(2026, 9, 18, 11),
        matchedInterests: const [
          MatchedInterest(
            interestTagId: 'interest_music',
            displayName: 'Music',
          ),
        ],
        reasonCode: 'interest_match',
      ),
      EventRecommendation(
        eventId: 'evt_01',
        title: 'First-ranked event',
        startAt: DateTime.utc(2026, 9, 16, 10),
        endAt: DateTime.utc(2026, 9, 16, 11),
        matchedInterests: const [
          MatchedInterest(interestTagId: 'interest_art', displayName: 'Art'),
          MatchedInterest(
            interestTagId: 'interest_music',
            displayName: 'Music',
          ),
        ],
        reasonCode: 'interest_match',
      ),
      EventRecommendation(
        eventId: 'evt_02',
        title: 'Second-ranked event',
        startAt: DateTime.utc(2026, 9, 17, 10),
        endAt: DateTime.utc(2026, 9, 17, 11),
        matchedInterests: const [
          MatchedInterest(interestTagId: 'interest_art', displayName: 'Art'),
        ],
        reasonCode: 'interest_match',
      ),
    ],
  );
}
