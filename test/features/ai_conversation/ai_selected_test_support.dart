import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_selected_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final selectedNow = DateTime.utc(2026, 10, 25, 12);
const selectedUnknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'private transport details',
);
const selectedConflict = AppFailure(
  kind: AppFailureKind.aiContextSelectionConflict,
  message: 'private dependency details',
);

final class SelectedRig {
  SelectedRig._({SelectedAiRepository? repository}) {
    repo = repository ?? SelectedAiRepository(() => utc);
  }
  final auth = SelectedAuth();
  final checkIns = SelectedCheckIns();
  late final SelectedAiRepository repo;
  DateTime utc = selectedNow;
  Duration elapsed = Duration.zero;
  late final ProviderContainer container;
  late final ProviderSubscription<AiConversationState> aiSubscription;
  late final ProviderSubscription<AiSelectedSourcesState> sourceSubscription;
  static Future<SelectedRig> create(
    WidgetTester tester, {
    bool existingTopic = false,
    SelectedAiRepository? repository,
    bool today = false,
    AiClientProcessing processing = AiClientProcessing.local,
    Future<Result<String>> Function()? timeZone,
  }) async {
    final r = SelectedRig._(repository: repository);
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(r.repo),
        if (processing != AiClientProcessing.local)
          aiClientProcessingProvider.overrideWithValue(processing),
        checkInRepositoryProvider.overrideWithValue(r.checkIns),
        aiCompanionReferencesEnabledProvider.overrideWithValue(true),
        aiTodayReferencesEnabledProvider.overrideWithValue(today),
        if (timeZone != null)
          aiTodayTimeZoneProvider.overrideWithValue(timeZone),
        aiConversationUtcNowProvider.overrideWithValue(() => r.utc),
        aiConversationNowProvider.overrideWithValue(() => r.elapsed),
      ],
    );
    r.aiSubscription = r.container.listen(
      aiConversationControllerProvider,
      (_, _) {},
    );
    r.sourceSubscription = r.container.listen(
      aiSelectedSourcesControllerProvider,
      (_, _) {},
    );
    await tester.pump();
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'selected-owner'));
    await tester.pump();
    r.container
        .read(accountSettingsSnapshotProvider.notifier)
        .observe(
          OwnSettings(
            checkInVisibility: CheckInVisibility.private,
            consent: OptionalProcessingConsent.accepted,
            revision: 1,
            cloudAiConsent: switch (processing.cloudProvider) {
              final provider? => CloudAiConsent.forProvider(
                provider,
                accepted: true,
              ),
              null => null,
            },
          ),
        );
    await tester.pump();
    if (existingTopic) {
      await r.ai.loadConversations();
      await r.ai.selectConversation('selected-topic');
    }
    return r;
  }

  AiConversationController get ai =>
      container.read(aiConversationControllerProvider.notifier);
  AiConversationState get aiState =>
      container.read(aiConversationControllerProvider);
  AiSelectedSourcesController get sources =>
      container.read(aiSelectedSourcesControllerProvider.notifier);
  AiSelectedSourcesState get sourceState =>
      container.read(aiSelectedSourcesControllerProvider);
  Future<void> advance(WidgetTester tester, Duration time) async {
    elapsed += time;
    utc = utc.add(time);
    await tester.pump(time);
  }

  void add(String id, {DateTime? at, String? note, int revision = 1}) {
    checkIns.records[id] = CheckIn(
      checkInId: id,
      note: note ?? 'Own note $id',
      createdAt: at ?? utc.subtract(const Duration(hours: 1)),
      revision: revision,
      mood: 'Calm',
      activity: 'Study',
      locationLabel: 'Private location never shown',
    );
  }

  void dispose() {
    sourceSubscription.close();
    aiSubscription.close();
    container.dispose();
    unawaited(auth.sessions.close());
  }
}

final class SelectedAuth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  String token = 'original-token';
  int tokenReads = 0;
  Future<Result<String>>? nextToken;
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() {
    tokenReads++;
    return nextToken ?? Future.value(Success(token));
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signOut() async => const Success(null);
}

final class SelectedCheckIns implements CheckInRepository {
  final records = <String, CheckIn>{};
  final ownReads = <String>[];
  final dateReads = <({String date, String zone, String? cursor})>[];
  final ownedResults = <String, Future<Result<CheckIn>>>{};
  final pages = <String, Result<CheckInHistoryPage>>{};
  int creates = 0;
  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) {
    ownReads.add(checkInId);
    final record = records[checkInId];
    return ownedResults[checkInId] ??
        Future.value(
          record != null
              ? Success(record)
              : const Failure(
                  AppFailure(
                    kind: AppFailureKind.checkInUnavailable,
                    message: 'private record unavailable',
                  ),
                ),
        );
  }

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    dateReads.add((date: date, zone: timeZone, cursor: cursor));
    return pages['$date|${cursor ?? ''}'] ??
        Success(
          CheckInHistoryPage(
            checkIns: records.values
                .where(
                  (record) => record.createdAt
                      .toUtc()
                      .toIso8601String()
                      .startsWith(date),
                )
                .toList(),
            nextCursor: null,
          ),
        );
  }

  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) async {
    creates++;
    return const Failure(
      AppFailure(
        kind: AppFailureKind.unexpected,
        message: 'Not part of selector',
      ),
    );
  }
}

class SelectedAiRepository
    implements
        AiConversationRepository,
        AiSelectedReplyRepository,
        AiConversationHistoryRepository {
  SelectedAiRepository(this.now);
  final DateTime Function() now;
  final selectedPrepares =
      <
        ({
          String token,
          String? topic,
          String? user,
          List<String> ids,
          AiAbortSignal abort,
        })
      >[];
  final selectedExecutes =
      <
        ({
          String token,
          AiSelectedReplyTicket ticket,
          String text,
          List<String> included,
          List<String> excluded,
          List<String> history,
          String? replyTo,
        })
      >[];
  final cancellations = <AiTicket>[];
  int ordinaryPrepares = 0, ordinaryExecutes = 0, operationReads = 0;
  Future<Result<AiSelectedReplyTicket>>? nextPrepare;
  Future<Result<AiReply>>? nextExecute;
  Future<Result<AiReadback>>? nextReadback;
  void Function()? onPrepare;
  List<AiPreparedHistoryPair> Function(int prepare)? pairs;
  final _users = <String, String?>{};
  @override
  Future<Result<AiSelectedReplyTicket>> prepareSelected({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
    required List<String> sourceIds,
  }) async {
    selectedPrepares.add((
      token: token,
      topic: conversationId,
      user: userMessageId,
      ids: List.of(sourceIds),
      abort: abort,
    ));
    onPrepare?.call();
    final n = selectedPrepares.length;
    final operation = AiTicket(
      operationId: 'operation-$n',
      operationKey: 'secret-operation-key-$n',
      conversationId: conversationId ?? 'selected-topic',
      preparationExpiresAt: now().add(const Duration(seconds: 15)),
    );
    _users[operation.operationId] = userMessageId;
    return nextPrepare ??
        Success(
          AiSelectedReplyTicket(
            operation: operation,
            selection: AiPreparedReplySelection(
              selectionRevision: 'revision-$n',
              expiresAt: operation.preparationExpiresAt,
              sourceCards: [
                for (var i = 0; i < sourceIds.length; i++)
                  AiSelectedSourceCard(
                    selectionKey: 'source-key-$n-$i',
                    card: AiSourceCard(
                      cardRef: 'card-$n-$i',
                      kind: AiSourceKind.checkIn,
                      version: 'opaque-version-$n-$i',
                      sourceOccurredAt: now()
                          .subtract(const Duration(hours: 1))
                          .toIso8601String(),
                      observedAt: now().toIso8601String(),
                    ),
                  ),
              ],
              historyPairs: pairs?.call(n) ?? [],
            ),
          ),
        );
  }

  @override
  Future<Result<AiReply>> executeSelected({
    required String token,
    required AiAbortSignal abort,
    required AiSelectedReplyTicket ticket,
    required String text,
    required List<String> includedKeys,
    required List<String> excludedKeys,
    required List<String> excludedHistoryKeys,
    String? replyToMessageId,
  }) async {
    selectedExecutes.add((
      token: token,
      ticket: ticket,
      text: text,
      included: List.of(includedKeys),
      excluded: List.of(excludedKeys),
      history: List.of(excludedHistoryKeys),
      replyTo: replyToMessageId,
    ));
    return nextExecute ??
        Success(
          AiReply(
            operationId: ticket.operation.operationId,
            conversationId: ticket.operation.conversationId,
            userMessage: user(
              text,
              id: _users[ticket.operation.operationId] ?? 'selected-user',
            ),
            assistantMessage: AiMessage(
              messageId: 'selected-assistant',
              sequence: 2,
              role: AiRole.assistant,
              persistedAt: now(),
              availability: AiAvailability.available,
              text: 'A bounded local reply',
            ),
          ),
        );
  }

  AiMessage user(String text, {String id = 'selected-user'}) => AiMessage(
    messageId: id,
    sequence: 1,
    role: AiRole.user,
    persistedAt: selectedNow,
    availability: AiAvailability.available,
    text: text,
  );
  @override
  Future<Result<AiTicket>> prepare({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
  }) async {
    ordinaryPrepares++;
    return const Failure(selectedUnknown);
  }

  @override
  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  }) async {
    ordinaryExecutes++;
    return const Failure(selectedUnknown);
  }

  @override
  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  }) async {
    cancellations.add(ticket);
    return const Success(null);
  }

  @override
  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  }) async {
    operationReads++;
    return nextReadback ??
        Success(
          AiReadback(
            operationId: operationId,
            state: AiOutcomeState.unresolved,
          ),
        );
  }

  @override
  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  }) async => Success(AiMessagePage(messages: const []));
  @override
  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) async => const Success(null);
  @override
  Future<Result<AiConversationHistoryPage>> listConversations({
    required String token,
    required AiAbortSignal abort,
    String? after,
  }) async => Success(
    AiConversationHistoryPage(
      conversations: [
        AiConversationSummary(
          conversationId: 'selected-topic',
          lastMessageAt: now(),
        ),
      ],
    ),
  );
}
