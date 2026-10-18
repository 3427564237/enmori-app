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
  messageId: 'assistant',
  sequence: 2,
  role: AiRole.assistant,
  persistedAt: _assistant.persistedAt,
  availability: AiAvailability.unavailable,
);
const _unresolved = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'unsafe transport text',
);

void main() {
  testWidgets(
    'New conversation retains old messages and reserves a new target on next explicit send',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      expect(r.state.canStartNewConversation, isTrue);
      final oldConversation = r.state.conversationId;
      expect(r.state.messages, isNotEmpty);
      final deletes = r.repo.deletes.length;
      r.controller.startNewConversation();
      expect(r.state.conversationId, isNull);
      expect(r.state.messages, isEmpty);
      expect(r.state.canSend, isTrue);
      expect(r.repo.deletes.length, deletes);
      expect(r.repo.prepares, hasLength(1));
      await r.controller.send('new explicit input');
      expect(r.repo.prepares.last.conversationId, isNull);
      expect(oldConversation, isNotNull);
      r.dispose();
    },
  );

  testWidgets(
    'New conversation cannot bypass pending generation or an unknown outcome',
    (tester) async {
      final r = await _Rig.create(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.executeResult = reply.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      expect(r.state.canStartNewConversation, isFalse);
      final conversation = r.state.conversationId;
      r.controller.startNewConversation();
      expect(r.state.conversationId, conversation);
      reply.complete(const Failure(_unresolved));
      await tester.pump();
      expect(r.state.canStartNewConversation, isFalse);
      r.controller.startNewConversation();
      expect(r.state.conversationId, conversation);
      expect(r.repo.prepares, hasLength(1));
      r.dispose();
    },
  );

  testWidgets('ordinary composition disables AI without a transport', (
    tester,
  ) async {
    final r = await _Rig.create(tester, enabled: false);
    expect(r.state.canSend, isFalse);
    await r.controller.send('note');
    expect(r.repo.prepares, isEmpty);
    r.dispose();
  });

  testWidgets(
    'Cancel before token permanently fences late prepare and execute',
    (tester) async {
      final r = await _Rig.create(tester);
      final token = Completer<Result<String>>();
      r.auth.nextToken = token.future;
      final sending = r.controller.send('note');
      r.controller.cancel();
      await sending;
      token.complete(const Success('original'));
      await tester.pump();
      expect(r.repo.prepares, isEmpty);
      expect(r.repo.executes, isEmpty);
      expect(r.state.canSend, isTrue);
      r.dispose();
    },
  );

  testWidgets(
    'Cancel during prepare only invalidates late ticket with original token',
    (tester) async {
      final r = await _Rig.create(tester);
      final prepared = Completer<Result<AiTicket>>();
      r.repo.prepareResult = prepared.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      r.controller.cancel();
      expect(r.repo.prepares.single.abort.isAborted, isTrue);
      r.auth.token = 'refreshed';
      prepared.complete(Success(_ticket('A')));
      await tester.pump();
      expect(r.repo.executes, isEmpty);
      expect(r.repo.cancels.single.token, 'original');
      expect(r.repo.cancels.single.operationId, 'A');
      r.dispose();
    },
  );

  testWidgets(
    '15 seconds covers token and prepare together; late ticket cannot execute',
    (tester) async {
      final r = await _Rig.create(tester);
      final token = Completer<Result<String>>();
      final prepared = Completer<Result<AiTicket>>();
      r.auth.nextToken = token.future;
      r.repo.prepareResult = prepared.future;
      unawaited(r.controller.send('note'));
      await r.advance(tester, const Duration(seconds: 10));
      token.complete(const Success('original'));
      await tester.pump();
      await r.advance(tester, const Duration(seconds: 5));
      expect(r.state.phase, AiConversationPhase.timedOut);
      prepared.complete(Success(_ticket('A')));
      await tester.pump();
      expect(r.repo.executes, isEmpty);
      r.dispose();
    },
  );

  testWidgets(
    '75 seconds includes full execute body, and late body is dropped',
    (tester) async {
      final r = await _Rig.create(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.executeResult = reply.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      await r.advance(tester, const Duration(seconds: 74));
      expect(r.state.phase, AiConversationPhase.waiting);
      await r.advance(tester, const Duration(seconds: 1));
      expect(r.state.phase, AiConversationPhase.timedOut);
      expect(r.repo.executes.single.abort.isAborted, isTrue);
      expect(r.repo.cancels.single.token, 'original');
      reply.complete(Success(_reply('A')));
      await tester.pump();
      expect(r.state.messages, isEmpty);
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      expect(r.state.canCheckResult, isTrue);
      r.dispose();
    },
  );

  testWidgets(
    'a stalled clock jump across the total 90-second bound rejects a body',
    (tester) async {
      final r = await _Rig.create(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.executeResult = reply.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      r.elapsed = const Duration(seconds: 90);
      reply.complete(Success(_reply('A')));
      await tester.pump();
      expect(r.state.phase, AiConversationPhase.timedOut);
      expect(r.state.messages, isEmpty);
      r.dispose();
    },
  );

  testWidgets(
    'execute and cancel pin original identity; ordinary read uses fresh token',
    (tester) async {
      final r = await _Rig.create(tester);
      final prepared = Completer<Result<AiTicket>>();
      final reply = Completer<Result<AiReply>>();
      r.repo.prepareResult = prepared.future;
      r.repo.executeResult = reply.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      r.auth.token = 'refreshed';
      prepared.complete(Success(_ticket('A')));
      await tester.pump();
      expect(r.repo.executes.single.token, 'original');
      r.controller.cancel();
      await tester.pump();
      expect(r.repo.cancels.single.token, 'original');
      await r.controller.checkResult();
      expect(r.repo.reads.single.token, 'refreshed');
      expect(r.state.canSend, isFalse);
      r.dispose();
    },
  );

  testWidgets(
    'same UID new session clears content and rejects old page disposal and body',
    (tester) async {
      final r = await _Rig.create(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.executeResult = reply.future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      final oldKey = r.state.sessionKey;
      r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
      await tester.pump();
      expect(r.state.sessionKey, isNot(same(oldKey)));
      r.controller.detach(sessionKey: oldKey);
      reply.complete(Success(_reply('A')));
      await tester.pump();
      expect(r.state.messages, isEmpty);
      expect(r.state.conversationId, isNull);
      r.repo.executeResult = Future.value(Success(_reply('B')));
      await r.controller.send('note');
      expect(r.state.phase, AiConversationPhase.success);
      expect(r.repo.executes, hasLength(2));
      r.dispose();
    },
  );

  testWidgets('logout cancels original handle and drops old user content', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.controller.send('note');
    expect(r.state.messages, hasLength(2));
    r.auth.sessions.add(const AuthSessionUnauthenticated());
    await tester.pump();
    expect(r.state.phase, AiConversationPhase.unauthenticated);
    expect(r.state.messages, isEmpty);
    expect(r.state.canSend, isFalse);
    r.dispose();
  });

  testWidgets(
    'A readback permits B Retry once; cancelled unresolved B never permits C',
    (tester) async {
      final r = await _Rig.create(tester);
      r.repo.executeResult = Future.value(const Failure(_unresolved));
      await r.controller.send('note');
      r.repo.readResult = Future.value(
        Success(
          AiReadback(
            operationId: 'A',
            state: AiOutcomeState.userSaved,
            userMessage: _user,
          ),
        ),
      );
      await r.controller.checkResult();
      expect(r.state.canRetry, isTrue);
      final replyB = Completer<Result<AiReply>>();
      r.repo.executeResult = replyB.future;
      unawaited(r.controller.retry('note'));
      await tester.pump();
      expect(r.repo.prepares.last.userMessageId, 'user');
      expect(r.repo.executes.last.operationId, 'B');
      r.controller.cancel();
      r.repo.readResult = Future.value(
        const Success(
          AiReadback(operationId: 'B', state: AiOutcomeState.unresolved),
        ),
      );
      await r.controller.checkResult();
      expect(r.repo.reads.last.operationId, 'B');
      await r.controller.retry('note');
      await r.controller.send('note');
      expect(r.repo.executes, hasLength(2));
      expect(r.state.canRetry, isFalse);
      expect(r.state.canSend, isFalse);
      r.dispose();
    },
  );

  testWidgets(
    'readback U then successful Retry merges U+A once with original timestamp',
    (tester) async {
      final r = await _Rig.create(tester);
      r.repo.executeResult = Future.value(const Failure(_unresolved));
      await r.controller.send('note');
      r.repo.readResult = Future.value(
        Success(
          AiReadback(
            operationId: 'A',
            state: AiOutcomeState.userSaved,
            userMessage: _user,
          ),
        ),
      );
      await r.controller.checkResult();
      await r.controller.retry('changed');
      expect(r.repo.executes, hasLength(1));
      r.repo.executeResult = Future.value(Success(_reply('B')));
      await r.controller.retry('note');
      expect(r.state.messages.map((m) => m.messageId), ['user', 'assistant']);
      expect(r.state.messages.first.persistedAt, _date);
      expect(r.state.canRetry, isFalse);
      r.dispose();
    },
  );

  testWidgets(
    'unavailable assistant never resurrects from earlier or later available DTO',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final oldPage = Completer<Result<AiMessagePage>>();
      r.repo.messagesResult = oldPage.future;
      final loading = r.controller.loadMessages();
      await tester.pump();
      r.repo.messagesResult = Future.value(
        Success(AiMessagePage(messages: [_tombstone, _user])),
      );
      await r.controller.loadMessages();
      oldPage.complete(Success(AiMessagePage(messages: [_user, _assistant])));
      await loading;
      expect(r.state.messages.last.availability, AiAvailability.unavailable);
      expect(r.state.messages.last.text, isNull);
      r.repo.messagesResult = Future.value(
        Success(AiMessagePage(messages: [_user, _assistant])),
      );
      await r.controller.loadMessages();
      expect(r.state.messages.last.text, isNull);
      r.dispose();
    },
  );

  testWidgets(
    'changed user timestamp is rejected rather than duplicated or overwritten',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      r.repo.messagesResult = Future.value(
        Success(
          AiMessagePage(
            messages: [
              AiMessage(
                messageId: 'user',
                sequence: 1,
                role: AiRole.user,
                persistedAt: _date.add(const Duration(days: 1)),
                availability: AiAvailability.available,
                text: 'note',
              ),
            ],
          ),
        ),
      );
      await r.controller.loadMessages();
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.messages, isEmpty);
      expect(r.state.canSend, isFalse);
      r.dispose();
    },
  );

  testWidgets(
    'unknown read stays safe; only explicit no_effect enables new send',
    (tester) async {
      final r = await _Rig.create(tester);
      r.repo.executeResult = Future.value(const Failure(_unresolved));
      await r.controller.send('note');
      r.repo.readResult = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiOperationUnavailable,
            message: 'gone',
          ),
        ),
      );
      await r.controller.checkResult();
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      r.repo.readResult = Future.value(
        const Success(
          AiReadback(operationId: 'A', state: AiOutcomeState.noEffect),
        ),
      );
      await r.controller.checkResult();
      expect(r.state.canSend, isTrue);
      expect(r.repo.executes, hasLength(1));
      r.dispose();
    },
  );

  testWidgets('ordinary read has an independent 15-second full-body deadline', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.controller.send('note');
    final read = Completer<Result<AiReadback>>();
    r.repo.readResult = read.future;
    unawaited(r.controller.checkResult());
    await tester.pump();
    await r.advance(tester, const Duration(seconds: 15));
    expect(r.repo.reads.single.abort.isAborted, isTrue);
    expect(r.state.readBusy, isFalse);
    expect(r.state.canSend, isFalse);
    read.complete(
      const Success(
        AiReadback(operationId: 'A', state: AiOutcomeState.noEffect),
      ),
    );
    await tester.pump();
    expect(r.state.canSend, isFalse);
    r.dispose();
  });

  testWidgets(
    'ordinary token cannot dispatch after monotonic 15-second limit',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final token = Completer<Result<String>>();
      r.auth.nextToken = token.future;
      final reading = r.controller.checkResult();
      r.elapsed = const Duration(seconds: 15);
      token.complete(const Success('fresh'));
      await reading;
      expect(r.repo.reads, isEmpty);
      expect(r.state.canSend, isFalse);
      r.dispose();
    },
  );

  testWidgets('ordinary full body cannot beat a delayed deadline timer', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    await r.controller.send('note');
    final read = Completer<Result<AiReadback>>();
    r.repo.readResult = read.future;
    final reading = r.controller.checkResult();
    await tester.pump();
    r.elapsed = const Duration(seconds: 15);
    read.complete(
      const Success(
        AiReadback(operationId: 'A', state: AiOutcomeState.noEffect),
      ),
    );
    await reading;
    expect(r.repo.reads.single.abort.isAborted, isTrue);
    expect(r.state.canSend, isFalse);
    r.dispose();
  });

  testWidgets(
    'delete hides immediately; unknown repeats DELETE until confirmed success',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      final deleted = Completer<Result<void>>();
      r.repo.deleteResult = deleted.future;
      final deleting = r.controller.deleteConversation();
      expect(r.state.messages, isEmpty);
      expect(r.state.phase, AiConversationPhase.deleting);
      deleted.complete(const Failure(_unresolved));
      await deleting;
      expect(r.state.phase, AiConversationPhase.deleteUnknown);
      expect(r.state.canSend, isFalse);
      expect(r.state.canCheckResult, isFalse);
      r.repo.deleteResult = Future.value(const Success(null));
      await r.controller.deleteConversation();
      expect(r.repo.deletes, hasLength(2));
      expect(r.state.phase, AiConversationPhase.deleted);
      r.dispose();
    },
  );

  testWidgets(
    'navigation clears data and cancels; returning to retained page can read again',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send('note');
      r.controller.leave();
      expect(r.state.messages, isEmpty);
      r.repo.messagesResult = Future.value(
        Success(AiMessagePage(messages: [_user, _assistant])),
      );
      await r.controller.loadMessages();
      expect(r.state.messages, hasLength(2));
      r.dispose();
    },
  );

  testWidgets(
    'route recreation retains references, never message bodies or ticket keys',
    (tester) async {
      final r = await _Rig.create(tester);
      r.repo.executeResult = Completer<Result<AiReply>>().future;
      unawaited(r.controller.send('note'));
      await tester.pump();
      r.subscription.close();
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump();
      r.listen();
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.messages, isEmpty);
      expect(r.state.conversationId, 'conversation');
      expect(r.state.canSend, isFalse);
      expect(r.state.canCheckResult, isTrue);
      r.dispose();
    },
  );

  testWidgets('invalid scalar text never requests a token or operation', (
    tester,
  ) async {
    final r = await _Rig.create(tester);
    for (final text in [' ', String.fromCharCode(0xd800), 'a' * 2401]) {
      await r.controller.send(text);
    }
    expect(r.auth.tokenCalls, 0);
    expect(r.repo.prepares, isEmpty);
    r.dispose();
  });

  for (final entry in <AppFailureKind, AiConversationPhase>{
    AppFailureKind.aiContextNotPermitted: AiConversationPhase.limited,
    AppFailureKind.aiBusy: AiConversationPhase.busy,
    AppFailureKind.aiUnavailable: AiConversationPhase.unavailable,
    AppFailureKind.aiReplyRejected: AiConversationPhase.rejected,
    AppFailureKind.aiAuthorityChanged: AiConversationPhase.authorityChanged,
    AppFailureKind.authRequired: AiConversationPhase.unauthenticated,
    AppFailureKind.unexpected: AiConversationPhase.unavailable,
  }.entries) {
    testWidgets(
      '${entry.key.name} maps safely and never automatically resends',
      (tester) async {
        final r = await _Rig.create(tester);
        r.repo.executeResult = Future.value(
          Failure(
            AppFailure(kind: entry.key, message: 'untrusted backend text'),
          ),
        );
        await r.controller.send('note');
        expect(r.state.phase, entry.value);
        expect(r.state.canSend, isFalse);
        expect(r.state.canRetry, isFalse);
        expect(r.state.statusMessage, isNot('untrusted backend text'));
        await tester.pump(const Duration(seconds: 1));
        expect(r.repo.executes, hasLength(1));
        r.dispose();
      },
    );
  }
}

AiTicket _ticket(String id) => AiTicket(
  operationId: id,
  operationKey: 'opaque-key-$id',
  conversationId: 'conversation',
  preparationExpiresAt: _date.add(const Duration(minutes: 5)),
);
AiReply _reply(String id) => AiReply(
  operationId: id,
  conversationId: 'conversation',
  userMessage: _user,
  assistantMessage: _assistant,
);

final class _Rig {
  _Rig(this.auth, this.repo);
  final _Auth auth;
  final _Repository repo;
  late ProviderContainer container;
  late ProviderSubscription<AiConversationState> subscription;
  Duration elapsed = Duration.zero;
  static Future<_Rig> create(WidgetTester tester, {bool enabled = true}) async {
    final r = _Rig(_Auth(), _Repository());
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(
          enabled ? r.repo : null,
        ),
        aiConversationNowProvider.overrideWithValue(() => r.elapsed),
        aiConversationUtcNowProvider.overrideWithValue(
          () => _date.add(r.elapsed),
        ),
      ],
    );
    r.listen();
    await tester.pump();
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
    await tester.pump();
    return r;
  }

  void listen() {
    subscription = container.listen(
      aiConversationControllerProvider,
      (_, _) {},
    );
  }

  AiConversationState get state =>
      container.read(aiConversationControllerProvider);
  AiConversationController get controller =>
      container.read(aiConversationControllerProvider.notifier);
  Future<void> advance(WidgetTester tester, Duration duration) async {
    elapsed += duration;
    await tester.pump(duration);
  }

  void dispose() {
    subscription.close();
    container.dispose();
    unawaited(auth.sessions.close());
  }
}

final class _Auth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  String token = 'original';
  int tokenCalls = 0;
  Future<Result<String>>? nextToken;
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() {
    tokenCalls++;
    final next = nextToken;
    nextToken = null;
    return next ?? Future.value(Success(token));
  }

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

final class _Call {
  _Call(
    this.token,
    this.abort, {
    this.operationId,
    this.userMessageId,
    this.conversationId,
  });
  final String token;
  final AiAbortSignal abort;
  final String? operationId;
  final String? userMessageId;
  final String? conversationId;
}

final class _Repository implements AiConversationRepository {
  final prepares = <_Call>[],
      executes = <_Call>[],
      cancels = <_Call>[],
      reads = <_Call>[],
      deletes = <_Call>[];
  Future<Result<AiTicket>>? prepareResult;
  Future<Result<AiReply>>? executeResult;
  Future<Result<AiReadback>>? readResult;
  Future<Result<AiMessagePage>>? messagesResult;
  Future<Result<void>>? deleteResult;
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
        userMessageId: userMessageId,
        conversationId: conversationId,
      ),
    );
    return prepareResult ??
        Success(_ticket(String.fromCharCode(64 + prepares.length)));
  }

  @override
  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  }) async {
    executes.add(_Call(token, abort, operationId: ticket.operationId));
    return executeResult ?? Success(_reply(ticket.operationId));
  }

  @override
  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  }) async {
    cancels.add(_Call(token, abort, operationId: ticket.operationId));
    return const Success(null);
  }

  @override
  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  }) async {
    reads.add(_Call(token, abort, operationId: operationId));
    return readResult ??
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
  }) async => messagesResult ?? Success(AiMessagePage(messages: []));
  @override
  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) async {
    deletes.add(_Call(token, abort));
    return deleteResult ?? const Success(null);
  }
}
