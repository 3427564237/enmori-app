import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final _date = DateTime.utc(2026, 10, 12);
final _user = AiMessage(
  messageId: 'user',
  sequence: 1,
  role: AiRole.user,
  persistedAt: _date,
  availability: AiAvailability.available,
  text: 'note',
);
final _assistant = AiMessage(
  messageId: 'assistant',
  sequence: 2,
  role: AiRole.assistant,
  persistedAt: _date.add(const Duration(seconds: 1)),
  availability: AiAvailability.available,
  text: 'reply',
);
final _tombstone = AiMessage(
  messageId: _assistant.messageId,
  sequence: _assistant.sequence,
  role: AiRole.assistant,
  persistedAt: _assistant.persistedAt,
  availability: AiAvailability.unavailable,
);
const _unknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'not a confirmed outcome',
);
const _busy = AppFailure(kind: AppFailureKind.aiBusy, message: 'busy');

void main() {
  for (final failure in [
    AppFailureKind.authRequired,
    AppFailureKind.aiAuthorityChanged,
    AppFailureKind.conversationUnavailable,
  ]) {
    testWidgets('$failure invalidates older concurrent history success', (
      tester,
    ) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final oldPage = Completer<Result<AiMessagePage>>();
      final latestPage = Completer<Result<AiMessagePage>>();
      r.repo.messagesResult = oldPage.future;
      final oldRead = r.controller.loadMessages();
      await tester.pump();
      r.repo.messagesResult = latestPage.future;
      final latestRead = r.controller.loadMessages();
      await tester.pump();
      expect(r.repo.messageReads, hasLength(2));

      latestPage.complete(
        Failure(AppFailure(kind: failure, message: 'private detail')),
      );
      await latestRead;
      expect(r.state.messages, isEmpty);
      expect(r.repo.messageReads.first.abort.isAborted, isTrue);
      final failedPhase = r.state.phase;
      oldPage.complete(Success(AiMessagePage(messages: [_user, _assistant])));
      await oldRead;
      await tester.pump();
      expect(r.state.messages, isEmpty);
      expect(r.state.phase, failedPhase);
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
    });
  }

  for (final tombstoneRequestIsOlder in [true, false]) {
    testWidgets(
      'tombstone dominates when its request is ${tombstoneRequestIsOlder ? 'older' : 'newer'}',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.controller.send('note');
        final older = Completer<Result<AiMessagePage>>();
        final newer = Completer<Result<AiMessagePage>>();
        r.repo.messagesResult = older.future;
        final oldRead = r.controller.loadMessages();
        await tester.pump();
        r.repo.messagesResult = newer.future;
        final newRead = r.controller.loadMessages();
        await tester.pump();
        if (tombstoneRequestIsOlder) {
          newer.complete(Success(AiMessagePage(messages: [_user, _assistant])));
          await newRead;
          expect(r.state.messages.last.text, 'reply');
          older.complete(Success(AiMessagePage(messages: [_tombstone])));
          await oldRead;
        } else {
          newer.complete(Success(AiMessagePage(messages: [_tombstone])));
          await newRead;
          expect(r.state.messages.last.text, isNull);
          older.complete(Success(AiMessagePage(messages: [_user, _assistant])));
          await oldRead;
        }
        expect(r.state.messages.map((message) => message.messageId), [
          'user',
          'assistant',
        ]);
        expect(r.state.messages.last.availability, AiAvailability.unavailable);
        expect(r.state.messages.last.text, isNull);
        expect(r.state.messages.first.persistedAt, _user.persistedAt);
        r.repo.messagesResult = Future.value(
          Success(AiMessagePage(messages: [_assistant])),
        );
        await r.controller.loadMessages();
        expect(r.state.messages.last.text, isNull);
        expect(r.state.canRetry, isFalse);
      },
    );
  }

  testWidgets(
    'new reserved conversation no_effect starts a new untargeted Send',
    (tester) async {
      final r = await _Rig.create(tester);
      r.repo.executeResult = Future.value(const Failure(_unknown));
      await r.controller.send('note');
      expect(r.state.conversationId, 'conversation-A');
      r.repo.readState = AiOutcomeState.noEffect;
      await r.controller.checkResult();
      expect(r.state.conversationId, isNull);
      expect(r.state.canSend, isTrue);
      expect(r.state.canCheckResult, isFalse);
      r.repo.prepareResult = Future.value(const Failure(_busy));
      await r.controller.send('new note');
      expect(r.repo.prepares.last.conversationId, isNull);
      expect(r.repo.prepares.last.userMessageId, isNull);
      expect(r.repo.executes, hasLength(1));
    },
  );

  testWidgets(
    'existing conversation no_effect preserves its target and saved messages',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final target = r.state.conversationId;
      r.repo.executeResult = Future.value(const Failure(_unknown));
      await r.controller.send('another note');
      expect(r.repo.prepares.last.conversationId, target);
      r.repo.readState = AiOutcomeState.noEffect;
      await r.controller.checkResult();
      expect(r.state.conversationId, target);
      expect(r.state.messages, hasLength(2));
      expect(r.state.canSend, isTrue);
      r.repo.prepareResult = Future.value(const Failure(_busy));
      await r.controller.send('third note');
      expect(r.repo.prepares.last.conversationId, target);
      expect(r.repo.prepares.last.userMessageId, isNull);
    },
  );

  for (final failure in [
    AppFailureKind.aiOutcomeUnresolved,
    AppFailureKind.unexpected,
  ]) {
    testWidgets(
      '$failure after execute aborts and cancels only the original handle',
      (tester) async {
        final r = await _Rig.create(tester);
        final reply = Completer<Result<AiReply>>();
        r.repo.executeResult = reply.future;
        final sending = r.controller.send('note');
        await tester.pump();
        final dispatched = r.repo.executes.single;
        r.auth.token = 'refreshed-token';
        reply.complete(
          Failure(AppFailure(kind: failure, message: 'private wire detail')),
        );
        await sending;
        await tester.pump();
        expect(dispatched.abort.isAborted, isTrue);
        expect(r.repo.cancels, hasLength(1));
        expect(r.repo.cancels.single.token, 'original-token');
        expect(r.repo.cancels.single.ticket, same(dispatched.ticket));
        expect(r.repo.cancels.single.abort, isNot(same(dispatched.abort)));
        expect(r.state.canSend, isFalse);
        expect(r.state.canRetry, isFalse);
        expect(r.state.messages, isEmpty);
        await r.controller.checkResult();
        expect(r.repo.operationReads.single.token, 'refreshed-token');
        expect(
          r.repo.operationReads.single.operationId,
          dispatched.ticket!.operationId,
        );
        expect(r.repo.executes, hasLength(1));
      },
    );
  }

  testWidgets(
    'Retry token cancellation requires readback before another Retry',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final token = Completer<Result<String>>();
      r.auth.nextToken = token.future;
      final retrying = r.controller.retry('note');
      r.controller.cancel();
      await retrying;
      token.complete(const Success('late-token'));
      await tester.pump();
      expect(r.repo.prepares, hasLength(1));
      await r.expectBlockedUntilReadback();
      expect(r.repo.executes, hasLength(2));
    },
  );

  testWidgets(
    'Retry prepare cancellation invalidates late ticket and retains saved U',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final prepared = Completer<Result<AiTicket>>();
      r.repo.prepareResult = prepared.future;
      final retrying = r.controller.retry('note');
      await tester.pump();
      expect(r.repo.prepares.last.userMessageId, 'user');
      r.controller.cancel();
      await retrying;
      expect(r.repo.prepares.last.abort.isAborted, isTrue);
      prepared.complete(Success(_ticket('B', 'conversation-A')));
      await tester.pump();
      expect(r.repo.executes, hasLength(1));
      expect(r.repo.cancels.last.ticket!.operationId, 'B');
      expect(r.repo.cancels.last.token, 'original-token');
      r.repo.prepareResult = null;
      await r.expectBlockedUntilReadback();
    },
  );

  testWidgets('Retry prepare failure preserves the saved-input restriction', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.userSaved();
    r.repo.prepareResult = Future.value(const Failure(_busy));
    await r.controller.retry('note');
    expect(r.state.phase, AiConversationPhase.busy);
    expect(r.repo.prepares.last.userMessageId, 'user');
    expect(r.repo.executes, hasLength(1));
    r.repo.prepareResult = null;
    await r.expectBlockedUntilReadback();
  });

  testWidgets('Retry token failure cannot turn a saved input into a new Send', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.userSaved();
    r.auth.nextToken = Future.value(
      const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'token unavailable',
        ),
      ),
    );
    await r.controller.retry('note');
    expect(r.repo.prepares, hasLength(1));
    await r.expectBlockedUntilReadback();
  });

  testWidgets(
    'leave drops saved content but keeps Retry blocked until fresh readback',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final target = r.state.conversationId;
      r.controller.leave();
      expect(r.state.messages, isEmpty);
      expect(r.state.conversationId, target);
      await r.expectBlockedUntilReadback();
      expect(r.state.messages.single.persistedAt, _user.persistedAt);
    },
  );

  testWidgets(
    'direct detach preserves unresolved Retry intent across controller recreation',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final target = r.state.conversationId;
      final session = r.state.sessionKey;
      r.controller.detach(sessionKey: session);
      // Rebuild the feature controller while retaining the same app Auth session.
      r.container.invalidate(aiConversationControllerProvider);
      await tester.pump(const Duration(milliseconds: 1));
      expect(r.state.sessionKey, same(session));
      expect(r.state.conversationId, target);
      expect(r.state.messages, isEmpty);
      await r.expectBlockedUntilReadback();
    },
  );

  testWidgets('leave preserves confirmed deletion and cannot reopen Send', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.controller.send('note');
    await r.controller.deleteConversation();
    r.controller.leave();
    expect(r.state.phase, AiConversationPhase.deleted);
    expect(r.state.messages, isEmpty);
    expect(r.state.canSend, isFalse);
    expect(r.state.canRetry, isFalse);
    expect(r.state.canDelete, isFalse);
    expect(r.state.canCheckResult, isFalse);
    await r.controller.send('new note');
    await r.controller.loadMessages();
    expect(r.repo.prepares, hasLength(1));
    expect(r.repo.messageReads, isEmpty);
    expect(r.repo.deletes, hasLength(1));
  });

  testWidgets(
    'leave preserves unknown deletion and Check again deletes the same target',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final target = r.state.conversationId;
      r.repo.deleteResult = const Failure(_unknown);
      await r.controller.deleteConversation();
      r.controller.leave();
      expect(r.state.phase, AiConversationPhase.deleteUnknown);
      expect(r.state.messages, isEmpty);
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      expect(r.state.canDelete, isTrue);
      expect(r.state.canCheckResult, isFalse);
      await r.controller.loadMessages();
      expect(r.repo.messageReads, isEmpty);
      r.repo.deleteResult = const Success(null);
      await r.controller.deleteConversation();
      expect(r.repo.deletes, hasLength(2));
      expect(r.repo.deletes.map((call) => call.conversationId), [
        target,
        target,
      ]);
      expect(r.state.phase, AiConversationPhase.deleted);
    },
  );
}

AiTicket _ticket(String operation, String conversation) => AiTicket(
  operationId: operation,
  operationKey: 'key-$operation',
  conversationId: conversation,
  preparationExpiresAt: _date.add(const Duration(minutes: 5)),
);

final class _Rig {
  final auth = _Auth();
  final repo = _Repository();
  late final ProviderContainer container;
  late final ProviderSubscription<AiConversationState> subscription;

  static Future<_Rig> create(WidgetTester tester) async {
    final r = _Rig();
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(r.repo),
        aiConversationNowProvider.overrideWithValue(() => Duration.zero),
        aiConversationUtcNowProvider.overrideWithValue(() => _date),
      ],
    );
    r.subscription = r.container.listen(
      aiConversationControllerProvider,
      (_, _) {},
    );
    addTearDown(() {
      r.subscription.close();
      r.container.dispose();
      unawaited(r.auth.sessions.close());
    });
    await tester.pump();
    r.auth.sessions.add(
      AuthSessionAuthenticated(subject: 'same-session-owner'),
    );
    await tester.pump();
    // Riverpod schedules its provider refresh on a zero-duration Timer.
    await tester.pump(const Duration(milliseconds: 1));
    return r;
  }

  AiConversationState get state =>
      container.read(aiConversationControllerProvider);
  AiConversationController get controller =>
      container.read(aiConversationControllerProvider.notifier);

  Future<void> userSaved() async {
    repo.executeResult = Future.value(const Failure(_unknown));
    await controller.send('note');
    repo.readState = AiOutcomeState.userSaved;
    await controller.checkResult();
    expect(state.canRetry, isTrue);
    expect(state.canSend, isFalse);
  }

  Future<void> expectBlockedUntilReadback() async {
    final prepareCount = repo.prepares.length;
    expect(state.canSend, isFalse);
    expect(state.canRetry, isFalse);
    expect(state.canCheckResult, isTrue);
    await controller.send('note');
    await controller.retry('note');
    expect(repo.prepares, hasLength(prepareCount));
    await controller.checkResult();
    expect(state.canRetry, isTrue);
    expect(state.canSend, isFalse);
    repo.executeResult = Future.value(const Failure(_unknown));
    await controller.retry('note');
    expect(repo.prepares.last.userMessageId, _user.messageId);
    expect(repo.prepares.last.conversationId, 'conversation-A');
  }
}

final class _Auth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  String token = 'original-token';
  Future<Result<String>>? nextToken;
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() {
    final pending = nextToken;
    nextToken = null;
    return pending ?? Future.value(Success(token));
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

final class _Call {
  _Call(
    this.token,
    this.abort, {
    this.conversationId,
    this.operationId,
    this.userMessageId,
    this.ticket,
  });
  final String token;
  final AiAbortSignal abort;
  final String? conversationId, operationId, userMessageId;
  final AiTicket? ticket;
}

// Domain fake deliberately ignores abort so tests exercise controller fencing
// against late completions. Wire syntax is independently tested in ai_wire_client.
final class _Repository implements AiConversationRepository {
  final prepares = <_Call>[];
  final executes = <_Call>[];
  final cancels = <_Call>[];
  final messageReads = <_Call>[];
  final operationReads = <_Call>[];
  final deletes = <_Call>[];
  Future<Result<AiTicket>>? prepareResult;
  Future<Result<AiReply>>? executeResult;
  Future<Result<AiMessagePage>>? messagesResult;
  Result<void> deleteResult = const Success(null);
  AiOutcomeState readState = AiOutcomeState.unresolved;

  @override
  Future<Result<AiTicket>> prepare({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
  }) async {
    prepares.add(
      _Call(
        token,
        abort,
        conversationId: conversationId,
        userMessageId: userMessageId,
      ),
    );
    final operation = String.fromCharCode(64 + prepares.length);
    return prepareResult ??
        Success(
          _ticket(operation, conversationId ?? 'conversation-$operation'),
        );
  }

  @override
  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  }) async {
    executes.add(_Call(token, abort, ticket: ticket));
    return executeResult ??
        Success(
          AiReply(
            operationId: ticket.operationId,
            conversationId: ticket.conversationId,
            userMessage: _user,
            assistantMessage: _assistant,
          ),
        );
  }

  @override
  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  }) async {
    cancels.add(_Call(token, abort, ticket: ticket));
    return const Success(null);
  }

  @override
  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  }) async {
    operationReads.add(
      _Call(
        token,
        abort,
        conversationId: conversationId,
        operationId: operationId,
      ),
    );
    return Success(
      AiReadback(
        operationId: operationId,
        state: readState,
        userMessage: readState == AiOutcomeState.userSaved ? _user : null,
      ),
    );
  }

  @override
  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  }) async {
    messageReads.add(_Call(token, abort, conversationId: conversationId));
    return messagesResult ??
        Success(AiMessagePage(messages: [_user, _assistant]));
  }

  @override
  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) async {
    deletes.add(_Call(token, abort, conversationId: conversationId));
    return deleteResult;
  }
}
