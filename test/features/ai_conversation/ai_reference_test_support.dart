import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_owned_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const referenceTopic = '11111111-1111-4111-8111-111111111111';
const referenceMessage = '22222222-2222-4222-8222-222222222222';
const referenceCard = '33333333-3333-4333-8333-333333333333';
const referenceOccurrence = '44444444-4444-4444-8444-444444444444';
final referenceDate = DateTime.utc(2026, 10, 25);
const referenceSource = AiSourceCard(
  cardRef: referenceCard,
  kind: AiSourceKind.conversationMessage,
  version: 'source-v1',
  sourceOccurredAt: '2026-10-25T00:00:00.000Z',
  observedAt: '2026-10-25T01:00:00.000Z',
);
final referenceUser = AiMessage(
  messageId: 'saved-user',
  sequence: 1,
  role: AiRole.user,
  persistedAt: referenceDate,
  availability: AiAvailability.available,
  text: 'Saved source text',
);
final referenceProactive = AiMessage(
  messageId: referenceMessage,
  sequence: 2,
  role: AiRole.assistant,
  persistedAt: referenceDate.add(const Duration(hours: 1)),
  availability: AiAvailability.available,
  text: 'Synthetic requested follow-up body.',
  origin: AiMessageOrigin.proactive,
  occurrenceId: referenceOccurrence,
  sources: const [referenceSource],
);
const referenceUnknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'private failure must not be rendered',
);

final class AiReferenceRig {
  AiReferenceRig._();
  final auth = ReferenceAuth();
  final repo = ReferenceRepository();
  late ProviderContainer container;
  late ProviderSubscription<AiConversationState> conversationSubscription;
  late ProviderSubscription<AiOwnedSourcesState> sourceSubscription;
  static Future<AiReferenceRig> create(
    WidgetTester tester, {
    bool enabled = true,
    List<AiMessage>? messages,
    bool selectExistingConversation = true,
  }) async {
    final r = AiReferenceRig._();
    if (messages != null) r.repo.messages = messages;
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(r.repo),
        aiCompanionReferencesEnabledProvider.overrideWithValue(enabled),
        aiConversationUtcNowProvider.overrideWithValue(() => referenceDate),
      ],
    );
    r.conversationSubscription = r.container.listen(
      aiConversationControllerProvider,
      (_, _) {},
    );
    r.sourceSubscription = r.container.listen(
      aiOwnedSourcesControllerProvider,
      (_, _) {},
    );
    await tester.pump();
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
    await tester.pump();
    r.container
        .read(accountSettingsSnapshotProvider.notifier)
        .observe(
          const OwnSettings(
            checkInVisibility: CheckInVisibility.private,
            consent: OptionalProcessingConsent.accepted,
            revision: 1,
          ),
        );
    // Initialize this authority epoch before the fresh transcript observation.
    // A lazily rebuilt observer must never accept an earlier cached read.
    r.container.read(aiOwnedSourcesControllerProvider);
    if (selectExistingConversation) {
      await r.conversation.loadConversations();
      await r.conversation.selectConversation(referenceTopic);
    }
    await tester.pump();
    return r;
  }

  AiConversationController get conversation =>
      container.read(aiConversationControllerProvider.notifier);
  AiConversationState get conversationState =>
      container.read(aiConversationControllerProvider);
  AiOwnedSourcesController get sources =>
      container.read(aiOwnedSourcesControllerProvider.notifier);
  AiOwnedSourcesState get sourceState =>
      container.read(aiOwnedSourcesControllerProvider);
  void dispose() {
    sourceSubscription.close();
    conversationSubscription.close();
    container.dispose();
    unawaited(auth.sessions.close());
  }
}

final class ReferenceAuth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() async => const Success('fixture-token');
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signOut() async => const Success(null);
}

final class ReferenceRepository
    implements
        AiConversationRepository,
        AiConversationHistoryRepository,
        AiOwnedSourcesRepository,
        AiCompanionReplyRepository {
  List<AiMessage> messages = [referenceUser, referenceProactive];
  Future<Result<AiMessageAnchor>>? nextAnchor;
  Future<Result<AiMessagePage>>? nextMessages;
  Future<Result<AiReply>>? nextExecute;
  Future<Result<AiReadback>>? nextOperation;
  Future<Result<AiSourceTarget>>? nextResolve;
  Future<Result<AiTopicReadState>>? nextRead, nextMark;
  String newConversationId = referenceTopic;
  AiTopicReadState readState = const AiTopicReadState(
    revision: 0,
    readThroughSequence: 0,
  );
  final messageReads = <({String conversationId, String? before})>[];
  final anchors = <AiMessageLocator>[];
  final resolves = <({AiMessageLocator message, AiSourceCard card})>[];
  final marks = <({String topic, int revision, int sequence})>[];
  final aborts = <AiAbortSignal>[];
  int readStates = 0, prepares = 0, executes = 0;
  final replies = <String>[];
  @override
  Future<Result<AiConversationHistoryPage>> listConversations({
    required String token,
    required AiAbortSignal abort,
    String? after,
  }) async => Success(
    AiConversationHistoryPage(
      conversations: [
        AiConversationSummary(
          conversationId: referenceTopic,
          lastMessageAt: referenceDate,
        ),
      ],
    ),
  );
  @override
  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  }) {
    messageReads.add((conversationId: conversationId, before: before));
    aborts.add(abort);
    return nextMessages ??
        Future.value(Success(AiMessagePage(messages: messages)));
  }

  @override
  Future<Result<AiMessageAnchor>> readMessageAnchor({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator locator,
  }) {
    anchors.add(locator);
    aborts.add(abort);
    return nextAnchor ??
        Future.value(
          Success(
            AiMessageAnchor(
              locator: locator,
              sequence: 2,
              pageBefore: 'eyJ2IjoxLCJiZWZvcmUiOjN9',
            ),
          ),
        );
  }

  @override
  Future<Result<AiMessageAnchor>> resolveDelivery({
    required String token,
    required AiAbortSignal abort,
    required String deliveryRef,
  }) => readMessageAnchor(
    token: token,
    abort: abort,
    locator: const AiMessageLocator(
      conversationId: referenceTopic,
      messageId: referenceMessage,
    ),
  );
  @override
  Future<Result<AiSourceTarget>> resolveSource({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator message,
    required AiSourceCard card,
  }) {
    resolves.add((message: message, card: card));
    aborts.add(abort);
    return nextResolve ??
        Future.value(const Success(AiCheckInTarget('source-checkin')));
  }

  @override
  Future<Result<AiTopicReadState>> readTopicReadState({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) {
    readStates++;
    aborts.add(abort);
    return nextRead ?? Future.value(Success(readState));
  }

  @override
  Future<Result<AiTopicReadState>> markTopicRead({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required int expectedRevision,
    required int readThroughSequence,
  }) {
    marks.add((
      topic: conversationId,
      revision: expectedRevision,
      sequence: readThroughSequence,
    ));
    aborts.add(abort);
    if (nextMark != null) return nextMark!;
    readState = AiTopicReadState(
      revision: expectedRevision + 1,
      readThroughSequence: readThroughSequence,
    );
    return Future.value(Success(readState));
  }

  @override
  Future<Result<AiTicket>> prepare({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
  }) async {
    prepares++;
    return Success(
      AiTicket(
        operationId: 'fixture-operation',
        operationKey: 'fixture-key',
        conversationId: conversationId ?? newConversationId,
        preparationExpiresAt: referenceDate.add(const Duration(hours: 2)),
      ),
    );
  }

  @override
  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  }) async {
    executes++;
    if (nextExecute != null) return nextExecute!;
    return Success(
      AiReply(
        operationId: ticket.operationId,
        conversationId: ticket.conversationId,
        userMessage: AiMessage(
          messageId: 'new-user',
          sequence: 3,
          role: AiRole.user,
          persistedAt: referenceDate.add(const Duration(hours: 1, minutes: 1)),
          availability: AiAvailability.available,
          text: text,
        ),
        assistantMessage: AiMessage(
          messageId: 'new-assistant',
          sequence: 4,
          role: AiRole.assistant,
          persistedAt: referenceDate.add(const Duration(hours: 1, minutes: 2)),
          availability: AiAvailability.available,
          text: 'A reply to the real user.',
        ),
      ),
    );
  }

  @override
  Future<Result<AiReply>> executeReply({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
    required String replyToMessageId,
  }) {
    replies.add(replyToMessageId);
    return execute(token: token, abort: abort, ticket: ticket, text: text);
  }

  @override
  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  }) async =>
      nextOperation ??
      Success(
        AiReadback(operationId: operationId, state: AiOutcomeState.unresolved),
      );
  @override
  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  }) async => const Success(null);
  @override
  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) async => const Success(null);
}
