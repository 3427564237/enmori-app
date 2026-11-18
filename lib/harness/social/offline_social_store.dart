import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../../core/result/result.dart';
import '../../features/account/domain/account_preferences_repository.dart';
import '../../features/account/domain/account_repository.dart';
import '../../features/check_in/domain/check_in_repository.dart';
import '../../features/check_in/history_device_port.dart';
import '../../features/event_detail/domain/event_detail_repository.dart';
import '../../features/event_recommendations/domain/event_recommendation_repository.dart';
import '../../features/friends/domain/friend_repository.dart';
import '../../features/interests/domain/interest_repository.dart';
import '../../features/personas/domain/persona.dart';
import '../../features/personas/domain/persona_repository.dart';

/// Process-local, explicitly synthetic fixtures. Never composed by Bootstrap.
final class OfflineSocialStore extends ChangeNotifier {
  OfflineSocialStore({DateTime? now, this.onboardingCompleted = true})
    : now = now ?? DateTime.now().toUtc() {
    notes.add(
      CheckIn(
        checkInId: 'offline_note_1',
        note: 'A little fresh air made a long day feel lighter.',
        createdAt: this.now,
        checkInVisibility: CheckInVisibility.private,
      ),
    );
    personas.add(
      Persona(
        personaId: '1'.padLeft(64, '0'),
        fields: const PersonaFields(
          displayName: 'Mio',
          tone: PersonaTone.warm,
          responseLength: PersonaResponseLength.balanced,
          formatStyle: PersonaFormatStyle.plain,
        ),
        createdAt: this.now,
        updatedAt: this.now,
        revision: 0,
      ),
    );
    activePersonaId = personas.first.personaId;
  }

  final DateTime now;
  bool onboardingCompleted;
  ({String key, String username, InitialChoice choice, ProductAccount account})?
  onboardingReceipt;
  OwnProfile profile = const OwnProfile(
    username: 'offline_member',
    displayName: 'Your Name',
    visibility: ProfileVisibility.private,
    revision: 0,
  );
  OwnSettings settings = const OwnSettings(
    checkInVisibility: CheckInVisibility.private,
    consent: OptionalProcessingConsent.rejected,
    revision: 0,
  );
  static const tags = [
    InterestTagOption(interestTagId: 'photography', displayName: 'Photography'),
    InterestTagOption(interestTagId: 'outdoors', displayName: 'Outdoors'),
    InterestTagOption(interestTagId: 'music', displayName: 'Music'),
    InterestTagOption(interestTagId: 'art', displayName: 'Art'),
  ];
  List<String> interestIds = ['photography', 'outdoors'];
  int interestRevision = 0;
  final notes = <CheckIn>[];
  final noteReceipts = <String, CheckIn>{};
  final historyCursors =
      <String, ({String date, int offset, List<CheckIn> rows})>{};
  int nextHistoryCursor = 0;
  final friends = <MyFriend>[
    const MyFriend(username: 'alex_sample', displayName: 'Alex · Sample'),
    const MyFriend(username: 'jamie_sample', displayName: 'Jamie · Sample'),
  ];
  final requests = <FriendRequest>[
    const FriendRequest(
      username: 'riley_sample',
      displayName: 'Riley · Sample',
      requestRef: 'offline_riley_request',
    ),
  ];
  final outgoing = <String>{};
  final personas = <Persona>[];
  final personaReceipts = <String, PersonaMutation>{};
  int personaStateRevision = 0;
  int nextPersonaId = 2;
  String? activePersonaId;
  void changed() => notifyListeners();

  List<EventDetail> get events => [
    EventDetail(
      eventId: 'offline_walk',
      title: 'An evening walk, together',
      startAt: now.add(const Duration(days: 2)),
      locationLabel: 'Example park · Singapore',
      categoryLabel: 'Outdoors',
      shortDescription: 'Synthetic activity for trying the event screens. No registration or real organiser is available.',
      externalSourceUrl: 'https://example.invalid/offline-walk',
    ),
    EventDetail(
      eventId: 'offline_creative',
      title: 'A creative afternoon',
      startAt: now.add(const Duration(days: 4)),
      locationLabel: 'Example studio',
      categoryLabel: 'Art',
      shortDescription:
          'An illustrative creative activity, not a real event listing.',
      externalSourceUrl: 'https://example.invalid/offline-creative',
    ),
  ];
}

Failure<T> _failure<T>(AppFailureKind kind, String message) =>
    Failure(AppFailure(kind: kind, message: message));

final class OfflineAccountRepository implements AccountRepository {
  OfflineAccountRepository(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<OnboardingStatus>> readOnboardingStatus() async => Success(
    store.onboardingCompleted
        ? OnboardingCompleted(
            ProductAccount(
              username: store.profile.username,
              optionalProcessingConsent: store.settings.consent,
              checkInVisibility: store.settings.checkInVisibility,
              onboardingCompletedAt: store.now,
            ),
          )
        : const OnboardingRequired(),
  );
  @override
  Future<Result<ProductAccount>> completeOnboarding({
    required String username,
    required InitialChoice initialChoice,
    required String idempotencyKey,
  }) async {
    // Mirror the approved Q18-B input projection only; this process-local
    // fixture does not reserve a globally unique Username or prove Firestore.
    final canonical = username
        .replaceAll(RegExp(r'^ +| +$'), '')
        .replaceAllMapped(RegExp('[A-Z]'), (match) => match[0]!.toLowerCase());
    const reserved = {
      'admin',
      'administrator',
      'support',
      'system',
      'moderator',
      'root',
      'enmori',
    };
    if (!RegExp(r'^[a-z0-9](?!.*__)[a-z0-9_]{1,28}[a-z0-9]$')
            .hasMatch(canonical) ||
        reserved.contains(canonical) ||
        canonical.startsWith('enmori_')) {
      return _failure(
        AppFailureKind.usernameInvalid,
        'Choose a valid Username.',
      );
    }
    if (!RegExp(r'^[A-Za-z0-9_-]{22,64}$').hasMatch(idempotencyKey)) {
      return _failure(
        AppFailureKind.idempotencyKeyInvalid,
        'Invalid request key.',
      );
    }
    final receipt = store.onboardingReceipt;
    if (receipt != null && receipt.key == idempotencyKey) {
      if (receipt.username != canonical || receipt.choice != initialChoice) {
        return _failure(AppFailureKind.idempotencyConflict, 'Request changed.');
      }
      return Success(receipt.account);
    }
    if (store.onboardingCompleted) {
      return _failure(
        AppFailureKind.onboardingConflict,
        'This offline sample account is already onboarded.',
      );
    }
    final accepted = initialChoice == InitialChoice.accept;
    final account = ProductAccount(
      username: canonical,
      optionalProcessingConsent: accepted
          ? OptionalProcessingConsent.accepted
          : OptionalProcessingConsent.rejected,
      checkInVisibility: CheckInVisibility.private,
      onboardingCompletedAt: store.now,
    );
    store.profile = OwnProfile(
      username: canonical,
      displayName: null,
      visibility: ProfileVisibility.private,
      revision: 0,
    );
    store.settings = OwnSettings(
      checkInVisibility: account.checkInVisibility,
      consent: account.optionalProcessingConsent,
      revision: 0,
    );
    store.onboardingCompleted = true;
    store.onboardingReceipt = (
      key: idempotencyKey,
      username: canonical,
      choice: initialChoice,
      account: account,
    );
    store.changed();
    return Success(account);
  }
}

final class OfflinePreferencesRepository
    implements AccountPreferencesRepository {
  OfflinePreferencesRepository(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<OwnProfile>> readProfile() async => Success(store.profile);
  @override
  Future<Result<OwnSettings>> readSettings() async => Success(store.settings);
  @override
  Future<Result<OwnProfile>> saveProfile({
    ProfileDetails? details,
    bool preserveRegion = false,
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  }) async {
    if (expectedRevision != store.profile.revision) {
      return _failure(
        AppFailureKind.profileRevisionPreconditionFailed,
        'Reload your profile before saving.',
      );
    }
    store.profile = OwnProfile(
      username: store.profile.username,
      details: details == null
          ? store.profile.details
          : preserveRegion
          ? details.withRegion(store.profile.details.region)
          : details,
      displayName: displayName,
      visibility: visibility,
      revision: expectedRevision + 1,
    );
    store.changed();
    return Success(store.profile);
  }

  @override
  Future<Result<OwnSettings>> saveSettings({
    CloudAiConsent? cloudAiConsent,
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async {
    if (expectedRevision != store.settings.revision) {
      return _failure(
        AppFailureKind.settingsRevisionPreconditionFailed,
        'Reload settings before saving.',
      );
    }
    store.settings = OwnSettings(
      cloudAiConsent: cloudAiConsent ?? store.settings.cloudAiConsent,
      defaultCheckInLocation:
          defaultCheckInLocation ?? store.settings.defaultCheckInLocation,
      defaultCheckInWeather:
          defaultCheckInWeather ?? store.settings.defaultCheckInWeather,
      homeWeatherAuto: homeWeatherAuto ?? store.settings.homeWeatherAuto,
      checkInVisibility: visibility,
      consent: consent,
      revision: expectedRevision + 1,
    );
    store.changed();
    return Success(store.settings);
  }
}

final class OfflineInterestRepository implements InterestRepository {
  OfflineInterestRepository(this.store);
  final OfflineSocialStore store;
  InterestSelection get selection => InterestSelection(
    interestTags: [
      for (final t in OfflineSocialStore.tags)
        if (store.interestIds.contains(t.interestTagId))
          SelectedInterestTag(
            interestTagId: t.interestTagId,
            displayName: t.displayName,
            lifecycleState: InterestLifecycleState.active,
          ),
    ],
    revision: store.interestRevision,
  );
  @override
  Future<Result<List<InterestTagOption>>> readSelectableTags() async =>
      const Success(OfflineSocialStore.tags);
  @override
  Future<Result<InterestSelection>> readOwn() async => Success(selection);
  @override
  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  }) async {
    if (expectedRevision != store.interestRevision) {
      return _failure(
        AppFailureKind.interestRevisionPreconditionFailed,
        'Reload interests before saving.',
      );
    }
    if (interestTagIds.toSet().length != interestTagIds.length ||
        interestTagIds.any(
          (id) =>
              !OfflineSocialStore.tags.any((tag) => tag.interestTagId == id),
        )) {
      return _failure(
        AppFailureKind.interestSelectionInvalid,
        'Choose available interests.',
      );
    }
    store.interestIds = List.of(interestTagIds);
    store.interestRevision++;
    store.changed();
    return Success(selection);
  }
}

final class OfflineCheckInRepository implements CheckInRepository {
  OfflineCheckInRepository(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) async {
    final valid = normalizeCheckInNote(note, mood: mood);
    if (valid case Failure<String>(:final failure)) return Failure(failure);
    final normalized = (valid as Success<String>).value;
    final existing = store.noteReceipts[idempotencyKey];
    if (existing != null) {
      return existing.note == normalized &&
              existing.mood == mood &&
              existing.activity == activity &&
              existing.locationLabel == locationLabel &&
              (visibility == null || existing.checkInVisibility == visibility)
          ? Success(existing)
          : _failure(
              AppFailureKind.idempotencyConflict,
              'This request key has different input.',
            );
    }
    final created = CheckIn(
      mood: mood,
      activity: activity,
      locationLabel: locationLabel,
      checkInId: 'offline_note_${store.notes.length + 1}',
      note: normalized,
      createdAt: DateTime.now().toUtc(),
      checkInVisibility: visibility ?? store.settings.checkInVisibility,
    );
    store.notes.insert(0, created);
    store.noteReceipts[idempotencyKey] = created;
    store.changed();
    return Success(created);
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async {
    for (final note in store.notes) {
      if (note.checkInId == checkInId) return Success(note);
    }
    return _failure(
      AppFailureKind.checkInUnavailable,
      'This Check-in is unavailable.',
    );
  }

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    final continuation = cursor == null ? null : store.historyCursors[cursor];
    if (timeZone != 'Asia/Singapore' ||
        (cursor != null &&
            (continuation == null || continuation.date != date))) {
      return _failure(
        AppFailureKind.requestInvalid,
        'Reload this offline history.',
      );
    }
    final rows =
        continuation?.rows ??
        store.notes
            .where(
              (note) =>
                  offlineDate(note.createdAt.add(const Duration(hours: 8))) ==
                  date,
            )
            .toList();
    final offset = continuation?.offset ?? 0;
    final page = rows.skip(offset).take(20).toList();
    String? next;
    if (offset + page.length < rows.length) {
      next = 'offline-cursor-${++store.nextHistoryCursor}';
      store.historyCursors[next] = (
        date: date,
        offset: offset + page.length,
        rows: List.unmodifiable(rows),
      );
    }
    return Success(CheckInHistoryPage(checkIns: page, nextCursor: next));
  }
}

String offlineDate(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

final class OfflineHistoryDevice implements HistoryDevicePort {
  const OfflineHistoryDevice();
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String ianaZone) async => DateTime.parse(
    '${offlineDate(DateTime.now().toUtc().add(const Duration(hours: 8)))}T00:00:00Z',
  );
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async => [
    for (final instant in instants)
      '${offlineDate(instant.add(const Duration(hours: 8)))} · ${instant.add(const Duration(hours: 8)).hour.toString().padLeft(2, '0')}:${instant.minute.toString().padLeft(2, '0')}',
  ];
}

final class OfflineFriendRepository implements FriendRepository {
  OfflineFriendRepository(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async => Success(
    MyFriendsPage(
      friends: store.friends
          .where(
            (f) =>
                query == null ||
                query.isEmpty ||
                f.displayName.toLowerCase().contains(query.toLowerCase()),
          )
          .toList(),
    ),
  );
  @override
  Future<Result<FriendTarget>> lookup(
    String username, {
    bool send = false,
  }) async {
    final names = {
      'alex_sample': 'Alex · Sample',
      'jamie_sample': 'Jamie · Sample',
      'riley_sample': 'Riley · Sample',
      'sam_sample': 'Sam · Sample',
      store.profile.username: store.profile.displayName ?? 'Offline member',
    };
    if (!names.containsKey(username)) {
      return _failure(
        AppFailureKind.addFriendTargetUnavailable,
        'This person is unavailable.',
      );
    }
    final relation = username == store.profile.username
        ? RelationshipState.self
        : store.friends.any((f) => f.username == username)
        ? RelationshipState.alreadyFriends
        : store.requests.any((r) => r.username == username)
        ? RelationshipState.incomingRequestPending
        : store.outgoing.contains(username)
        ? RelationshipState.outgoingRequestPending
        : RelationshipState.canSendRequest;
    if (send && relation == RelationshipState.canSendRequest) {
      store.outgoing.add(username);
      store.changed();
    }
    return Success(
      FriendTarget(
        username: username,
        displayName: names[username]!,
        relationship: send && relation == RelationshipState.canSendRequest
            ? RelationshipState.outgoingRequestPending
            : relation,
      ),
    );
  }

  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) async =>
      Success(FriendInbox(requests: List.of(store.requests)));
  @override
  Future<Result<String>> act(String requestRef, {required bool accept}) async {
    final request = store.requests
        .where((r) => r.requestRef == requestRef)
        .firstOrNull;
    if (request == null) {
      return _failure(
        AppFailureKind.friendRequestUnavailable,
        'This request is unavailable.',
      );
    }
    store.requests.remove(request);
    if (accept) {
      store.friends.add(
        MyFriend(username: request.username, displayName: request.displayName),
      );
    }
    store.changed();
    return Success(accept ? 'accepted' : 'declined');
  }
}

final class OfflineEventRepository implements EventDetailRepository {
  OfflineEventRepository(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<EventDetail>> read(String eventId) async {
    final event = store.events.where((e) => e.eventId == eventId).firstOrNull;
    return event == null
        ? _failure(
            AppFailureKind.eventUnavailable,
            'This example event is unavailable.',
          )
        : Success(event);
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async {
    await Clipboard.setData(ClipboardData(text: event.externalSourceUrl));
    return const Success(null);
  }
}

final class OfflineEventRecommendations
    implements EventRecommendationRepository {
  OfflineEventRecommendations(this.store);
  final OfflineSocialStore store;
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async => Success(
    EventRecommendationResponse(
      asOf: store.now,
      formulaVersion: 'offline-fixture',
      items: [
        for (final e in store.events)
          EventRecommendation(
            eventId: e.eventId,
            title: e.title,
            startAt: e.startAt,
            endAt: e.startAt.add(const Duration(hours: 2)),
            matchedInterests: const [],
            reasonCode: 'offline-fixture',
          ),
      ],
    ),
  );
}

final class OfflinePersonaRepository implements PersonaRepository {
  OfflinePersonaRepository(this.store);
  final OfflineSocialStore store;
  PersonaCollection get collection => PersonaCollection(
    items: store.personas,
    stateRevision: store.personaStateRevision,
    activePersonaId: store.activePersonaId,
  );
  bool eligible(bool Function()? check) => check == null || check();
  Failure<T> ended<T>() =>
      _failure(AppFailureKind.authRequired, 'This offline session ended.');
  Failure<T> stale<T>() => _failure(
    AppFailureKind.personaRevisionPreconditionFailed,
    'Reload your Personas before changing them.',
  );
  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async => eligible(isEligible) ? Success(collection) : ended();
  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async {
    if (!eligible(isEligible)) return ended();
    final item = store.personas
        .where((p) => p.personaId == personaId)
        .firstOrNull;
    return item == null
        ? _failure(
            AppFailureKind.personaUnavailable,
            'This Persona is unavailable.',
          )
        : Success(
            PersonaMutation(
              persona: item,
              stateRevision: store.personaStateRevision,
            ),
          );
  }

  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    Result<PersonaMutation> result;
    if (!isEligible()) {
      result = ended();
    } else if (store.personaReceipts[command.idempotencyKey]
        case final prior?) {
      result = prior.persona.fields == command.fields.normalized
          ? Success(prior)
          : _failure(
              AppFailureKind.personaCommandConflict,
              'This request has different input.',
            );
    } else if (command.expectedStateRevision != store.personaStateRevision) {
      result = stale();
    } else if (store.personas.length >= 5) {
      result = _failure(
        AppFailureKind.personaLimitReached,
        'You have 5 Personas. Delete one before creating another.',
      );
    } else if (PersonaFields.nameValidationMessage(
          command.fields.displayName,
        ) !=
        null) {
      result = _failure(
        AppFailureKind.personaInvalid,
        'Use a valid Persona name.',
      );
    } else {
      final item = Persona(
        personaId: (store.nextPersonaId++).toRadixString(16).padLeft(64, '0'),
        fields: command.fields.normalized,
        createdAt: DateTime.now().toUtc(),
        updatedAt: DateTime.now().toUtc(),
        revision: 0,
      );
      store.personas.add(item);
      store.personaStateRevision++;
      final mutation = PersonaMutation(
        persona: item,
        stateRevision: store.personaStateRevision,
      );
      store.personaReceipts[command.idempotencyKey] = mutation;
      store.changed();
      result = Success(mutation);
    }
    final future = Future<Result<PersonaMutation>>.value(result);
    return PersonaCreateAttempt(
      foreground: future,
      completion: future,
      wasDispatched: () => result is Success<PersonaMutation>,
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!eligible(isEligible)) return ended();
    final index = store.personas.indexWhere((p) => p.personaId == personaId);
    if (index < 0) {
      return _failure(
        AppFailureKind.personaUnavailable,
        'This Persona is unavailable.',
      );
    }
    final prior = store.personas[index];
    if (expectedStateRevision != store.personaStateRevision ||
        expectedRevision != prior.revision) {
      return stale();
    }
    if (PersonaFields.nameValidationMessage(fields.displayName) != null) {
      return _failure(
        AppFailureKind.personaInvalid,
        'Use a valid Persona name.',
      );
    }
    final item = Persona(
      personaId: personaId,
      fields: fields.normalized,
      createdAt: prior.createdAt,
      updatedAt: DateTime.now().toUtc(),
      revision: prior.revision + 1,
    );
    store.personas[index] = item;
    store.personaStateRevision++;
    store.changed();
    return Success(
      PersonaMutation(persona: item, stateRevision: store.personaStateRevision),
    );
  }

  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!eligible(isEligible)) return ended();
    final item = store.personas
        .where((p) => p.personaId == personaId)
        .firstOrNull;
    if (item == null) {
      return _failure(
        AppFailureKind.personaUnavailable,
        'This Persona is unavailable.',
      );
    }
    if (expectedStateRevision != store.personaStateRevision ||
        expectedRevision != item.revision) {
      return stale();
    }
    if (store.activePersonaId != personaId) {
      store.activePersonaId = personaId;
      store.personaStateRevision++;
      store.changed();
    }
    return Success(collection);
  }

  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!eligible(isEligible)) return ended();
    final item = store.personas
        .where((p) => p.personaId == personaId)
        .firstOrNull;
    if (item == null) {
      return _failure(
        AppFailureKind.personaUnavailable,
        'This Persona is unavailable.',
      );
    }
    if (expectedStateRevision != store.personaStateRevision ||
        expectedRevision != item.revision) {
      return stale();
    }
    store.personas.remove(item);
    if (store.activePersonaId == personaId) store.activePersonaId = null;
    store.personaStateRevision++;
    store.changed();
    return const Success(null);
  }
}
