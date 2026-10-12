import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// These are controlled HTTP DTOs through the actual AiWireRepository, not a
// replacement domain repository. No Backend/model/persistence claim is made.
final _date = DateTime.utc(2026, 10, 12, 12);
final _conversation = _id(1);
final _userId = _id(2);
final _assistantId = _id(3);
const _operationKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const _userTime = '2026-10-12T11:00:00.000Z';

String _id(int number) =>
    '00000000-0000-4000-8000-${number.toRadixString(16).padLeft(12, '0')}';

Map<String, Object?> _user({
  String? id,
  int sequence = 5,
  String time = _userTime,
}) => {
  'messageId': id ?? _userId,
  'sequence': sequence,
  'role': 'user',
  'persistedAt': time,
  'availability': 'available',
  'text': 'note',
};

Map<String, Object?> _assistant({
  bool unavailable = false,
  int sequence = 6,
  String? id,
}) => {
  'messageId': id ?? _assistantId,
  'sequence': sequence,
  'role': 'assistant',
  'persistedAt': '2026-10-12T11:01:00.000Z',
  'availability': unavailable ? 'unavailable' : 'available',
  if (!unavailable) 'text': 'accepted reply',
};

AiWireResponse _json(Object? body, [int status = 200]) =>
    AiWireResponse(statusCode: status, body: jsonEncode(body));

AiWireResponse _page(
  List<Map<String, Object?>> messages, {
  String? nextCursor,
}) => _json({'messages': messages, 'nextCursor': ?nextCursor});

String _cursor(int before) => base64Url
    .encode(utf8.encode(jsonEncode({'v': 1, 'before': before})))
    .replaceAll('=', '');

void main() {
  for (final unavailable in [false, true]) {
    final label = unavailable ? 'tombstone' : 'available assistant';
    testWidgets('R1 actual wire: fresh U plus $label revokes Retry', (
      tester,
    ) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      r.transport.pageResult = Future.value(
        _page([_user(), _assistant(unavailable: unavailable)]),
      );
      await r.controller.loadMessages();

      expect(r.state.messages.map((message) => message.messageId), [
        _userId,
        _assistantId,
      ]);
      expect(
        r.state.canRetry,
        isFalse,
        reason: 'New history evidence requires a fresh applicable outcome before Retry.',
      );
      await r.expectRetryBlocked();
      expect(r.transport.executes, hasLength(1));
    });

    testWidgets(
      'R1 actual wire: older user_saved cannot reopen Retry after newer $label page',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        final oldReadback = Completer<AiWireResponse>();
        r.transport.readbackResult = oldReadback.future;
        final checking = r.controller.checkResult();
        await tester.pump();
        r.transport.pageResult = Future.value(
          _page([_user(), _assistant(unavailable: unavailable)]),
        );
        await r.controller.loadMessages();
        oldReadback.complete(r.transport.userSavedBody());
        await checking;

        expect(
          r.state.canRetry,
          isFalse,
          reason: 'The older operation observation cannot erase newer history uncertainty.',
        );
        expect(
          r.state.messages.last.availability,
          unavailable ? AiAvailability.unavailable : AiAvailability.available,
        );
        await r.expectRetryBlocked();
        expect(r.transport.executes, hasLength(1));
      },
    );

    testWidgets(
      'R1 actual wire: newer delayed $label page revokes an earlier completed user_saved read',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        final readback = Completer<AiWireResponse>();
        final page = Completer<AiWireResponse>();
        r.transport.readbackResult = readback.future;
        final checking = r.controller.checkResult();
        await tester.pump();
        r.transport.pageResult = page.future;
        final loading = r.controller.loadMessages();
        await tester.pump();
        readback.complete(r.transport.userSavedBody());
        await checking;
        expect(
          r.state.canRetry,
          isFalse,
          reason: 'The newer ordinary read remains in progress.',
        );
        page.complete(_page([_user(), _assistant(unavailable: unavailable)]));
        await loading;
        expect(r.state.canRetry, isFalse);
        expect(r.state.messages, hasLength(2));
        await r.expectRetryBlocked();
      },
    );

    testWidgets(
      'R1 actual wire: paged $label then overlapping U cannot restore Retry',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        r.transport.pageResult = Future.value(
          _page([_assistant(unavailable: unavailable)], nextCursor: _cursor(6)),
        );
        await r.controller.loadMessages();
        final before = r.state.nextCursor;
        expect(before, _cursor(6));
        r.transport.pageResult = Future.value(_page([_user()]));
        await r.controller.loadMessages(before: before);
        expect(
          r.transport.messageReads.last.path,
          endsWith('?before=${_cursor(6)}'),
        );
        expect(r.state.messages.map((message) => message.messageId), [
          _userId,
          _assistantId,
        ]);
        expect(r.state.messages.first.persistedAt, DateTime.parse(_userTime));
        expect(r.state.canRetry, isFalse);
        await r.expectRetryBlocked();
      },
    );

    testWidgets(
      'R1 control: fresh user_saved clarifies history-only $label without inventing a permanent pair',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        r.transport.pageResult = Future.value(
          _page([_user(), _assistant(unavailable: unavailable)]),
        );
        await r.controller.loadMessages();
        await r.expectRetryBlocked();
        // This read starts after history was observed; only the server can
        // establish that the unpaired history row belongs to another input.
        await r.controller.checkResult();
        expect(r.state.canRetry, isTrue);
        expect(r.state.canSend, isFalse);
        expect(r.transport.prepares, hasLength(1));
        expect(r.transport.executes, hasLength(1));
      },
    );

    testWidgets(
      'R1 control: explicit assistant_saved $label is not undone by a subsequent user_saved',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        r.transport.readbackResult = Future.value(
          _json({
            'operationId': r.transport.currentOperationId,
            'state': 'assistant_saved',
            'userMessage': _user(),
            'assistantMessage': _assistant(unavailable: unavailable),
          }),
        );
        await r.controller.checkResult();
        expect(r.state.phase, AiConversationPhase.success);
        r.transport.readbackResult = Future.value(r.transport.userSavedBody());
        await r.controller.checkResult();
        expect(r.state.phase, AiConversationPhase.unknown);
        expect(r.state.messages, hasLength(2));
        await r.expectRetryBlocked();
        expect(r.transport.executes, hasLength(1));
      },
    );
  }

  testWidgets(
    'R1 control: explicit execute pair survives a contradictory user_saved',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      await r.controller.retry('note');
      expect(r.state.phase, AiConversationPhase.success);
      r.transport.readbackResult = Future.value(r.transport.userSavedBody());
      await r.controller.checkResult();
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.messages.map((message) => message.messageId), [
        _userId,
        _assistantId,
      ]);
      await r.expectRetryBlocked();
      expect(r.transport.executes, hasLength(2));
    },
  );

  testWidgets(
    'R1 control: abandoned older user_saved cannot reopen an explicit assistant_saved pair',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final oldRead = Completer<AiWireResponse>();
      r.transport.readbackResult = oldRead.future;
      final checking = r.controller.checkResult();
      await tester.pump();
      r.controller.leave();
      r.transport.readbackResult = Future.value(
        _json({
          'operationId': r.transport.currentOperationId,
          'state': 'assistant_saved',
          'userMessage': _user(),
          'assistantMessage': _assistant(unavailable: true),
        }),
      );
      await r.controller.checkResult();
      oldRead.complete(r.transport.userSavedBody());
      await checking;
      await tester.pump();
      expect(r.state.messages.last.availability, AiAvailability.unavailable);
      await r.expectRetryBlocked();
      expect(r.transport.executes, hasLength(1));
    },
  );

  testWidgets(
    'R1 control: assistant explicitly belonging to another U does not block the current U',
    (tester) async {
      final r = await _Rig.create(tester);
      final otherUser = _user(id: _id(40), sequence: 1);
      final otherAssistant = _assistant(id: _id(41), sequence: 2);
      r.transport.allowFirstSuccess = true;
      r.transport.retryUser = otherUser;
      r.transport.retryAssistant = otherAssistant;
      await r.controller.send('note');
      expect(r.state.phase, AiConversationPhase.success);
      r.transport.failExecute = true;
      await r.controller.send('note');
      await r.controller.checkResult();
      expect(r.state.canRetry, isTrue);
      // A fresh tombstone for an explicitly paired older assistant cannot
      // consume the current saved input's Retry target.
      r.transport.pageResult = Future.value(
        _page([_assistant(id: _id(41), sequence: 2, unavailable: true)]),
      );
      await r.controller.loadMessages();
      expect(r.state.canRetry, isTrue);
      expect(r.state.messages.map((message) => message.sequence), [1, 2, 5]);
      expect(r.transport.prepares, hasLength(2));
      expect(r.transport.executes, hasLength(2));
    },
  );

  testWidgets(
    'R1 control: independent new Send no_effect is not blocked by older U0 A0 history',
    (tester) async {
      final r = await _Rig.create(tester);
      r.transport.allowFirstSuccess = true;
      r.transport.retryUser = _user(id: _id(50), sequence: 1);
      r.transport.retryAssistant = _assistant(id: _id(51), sequence: 2);
      await r.controller.send('note');
      r.transport.failExecute = true;
      await r.controller.send('independent note');
      r.transport.readbackResult = Future.value(
        _json({
          'operationId': r.transport.currentOperationId,
          'state': 'no_effect',
        }),
      );
      await r.controller.checkResult();
      expect(r.state.canSend, isTrue);
      expect(r.state.canRetry, isFalse);
      expect(r.state.conversationId, _conversation);
      expect(r.state.messages.map((message) => message.messageId), [
        _id(50),
        _id(51),
      ]);
      await r.controller.send('another independent note');
      expect(r.transport.prepares, hasLength(3));
      expect(r.transport.executes, hasLength(3));
      expect(jsonDecode(r.transport.prepares.last.body!), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
        'conversationId': _conversation,
      });
    },
  );

  testWidgets(
    'R1 retained evidence: clearing a conflicting history page cannot let an old user_saved reopen Retry',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      final oldReadback = Completer<AiWireResponse>();
      r.transport.readbackResult = oldReadback.future;
      final checking = r.controller.checkResult();
      await tester.pump();
      r.transport.pageResult = Future.value(
        _page([_user(), _assistant(unavailable: true)]),
      );
      await r.controller.loadMessages();
      expect(r.state.messages.last.availability, AiAvailability.unavailable);

      // The wire DTO is structurally valid but contradicts immutable saved U.
      // Clearing displayed rows must not erase the newer assistant observation.
      r.transport.pageResult = Future.value(
        _page([_user(time: '2026-10-12T11:02:00.000Z')]),
      );
      await r.controller.loadMessages();
      expect(r.state.messages, isEmpty);
      expect(r.state.phase, AiConversationPhase.unknown);
      oldReadback.complete(r.transport.userSavedBody());
      await checking;
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.canSend, isFalse);
      await r.expectRetryBlocked();
      expect(r.transport.prepares, hasLength(1));
      expect(r.transport.executes, hasLength(1));
    },
  );

  testWidgets(
    'R2 pair integrity: a new Send cannot reassign an already accepted assistant to another U',
    (tester) async {
      final r = await _Rig.create(tester);
      final originalUserId = _id(60);
      final originalAssistantId = _id(61);
      r.transport.allowFirstSuccess = true;
      r.transport.retryUser = _user(id: originalUserId, sequence: 1);
      r.transport.retryAssistant = _assistant(
        id: originalAssistantId,
        sequence: 8,
      );
      await r.controller.send('note');
      expect(r.state.phase, AiConversationPhase.success);

      // Every field of A0 is unchanged. U1's canonical DTO and sequence still
      // pass the wire mapper, isolating the controller's established-pair guard.
      r.transport.retryUser = _user();
      await r.controller.send('note');
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.canSend, isFalse);
      expect(r.state.canCheckResult, isTrue);
      expect(r.state.messages.map((message) => message.messageId), [
        originalUserId,
        originalAssistantId,
      ]);
      expect(r.state.messages.last.sequence, 8);
      expect(r.state.messages.last.text, 'accepted reply');
      await r.expectRetryBlocked();
      expect(r.transport.prepares, hasLength(2));
      expect(r.transport.executes, hasLength(2));
    },
  );

  testWidgets(
    'R2 pair integrity: assistant_saved cannot attach a second assistant to accepted U',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      await r.controller.retry('note');
      expect(r.state.phase, AiConversationPhase.success);
      r.transport.readbackResult = Future.value(
        _json({
          'operationId': r.transport.currentOperationId,
          'state': 'assistant_saved',
          'userMessage': _user(),
          'assistantMessage': _assistant(id: _id(70), sequence: 7),
        }),
      );
      await r.controller.checkResult();
      expect(r.state.phase, AiConversationPhase.unknown);
      expect(r.state.canSend, isFalse);
      expect(r.state.canCheckResult, isTrue);
      expect(r.state.messages.map((message) => message.messageId), [
        _userId,
        _assistantId,
      ]);
      expect(r.state.messages.last.sequence, 6);
      await r.expectRetryBlocked();
      expect(r.transport.prepares, hasLength(2));
      expect(r.transport.executes, hasLength(2));
    },
  );

  testWidgets(
    'R1 control: a valid user-only page preserves Retry eligibility',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      r.transport.pageResult = Future.value(_page([_user()]));
      await r.controller.loadMessages();
      expect(r.state.canRetry, isTrue);
      expect(r.state.canSend, isFalse);
      expect(r.state.messages.single.messageId, _userId);
    },
  );

  testWidgets(
    'R1 control: an older unrelated assistant page does not consume U',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      r.transport.pageResult = Future.value(
        _page([
          _user(id: _id(20), sequence: 1, time: '2026-10-12T10:00:00.000Z'),
          _assistant(id: _id(21), sequence: 2),
        ]),
      );
      await r.controller.loadMessages(before: _cursor(5));
      expect(r.state.messages.map((message) => message.sequence), [1, 2, 5]);
      expect(r.state.canRetry, isTrue);
    },
  );

  for (final mutation in [
    'different ID',
    'changed sequence',
    'changed timestamp',
  ]) {
    testWidgets(
      'R2 actual wire: Retry rejects $mutation and preserves only original U',
      (tester) async {
        final r = await _Rig.create(tester);
        await r.userSaved();
        r.transport.retryUser = switch (mutation) {
          'different ID' => _user(
            id: _id(30),
            sequence: 7,
            time: '2026-10-12T11:02:00.000Z',
          ),
          'changed sequence' => _user(sequence: 7),
          _ => _user(time: '2026-10-12T11:02:00.000Z'),
        };
        r.transport.retryAssistant = _assistant(sequence: 8);
        await r.controller.retry('note');

        expect(
          jsonDecode(r.transport.prepares.last.body!)['userMessageId'],
          _userId,
        );
        expect(r.state.phase, AiConversationPhase.unknown);
        expect(r.state.canSend, isFalse);
        expect(r.state.canRetry, isFalse);
        expect(r.state.canCheckResult, isTrue);
        expect(
          r.state.messages,
          hasLength(1),
          reason: 'Reject the entire inconsistent reply before mutating known saved content.',
        );
        final original = r.state.messages.single;
        expect(original.messageId, _userId);
        expect(original.sequence, 5);
        expect(original.persistedAt, DateTime.parse(_userTime));
        expect(original.text, 'note');
        expect(r.transport.executes, hasLength(2));
        await r.expectRetryBlocked();
      },
    );
  }

  testWidgets(
    'R2 control actual wire: same U Retry succeeds uniquely with original timestamp',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.userSaved();
      await r.controller.retry('note');
      expect(jsonDecode(r.transport.prepares.last.body!), {
        'kind': 'retry',
        'purpose': 'checkin_conversation',
        'conversationId': _conversation,
        'userMessageId': _userId,
      });
      expect(r.state.phase, AiConversationPhase.success);
      expect(r.state.messages.map((message) => message.messageId), [
        _userId,
        _assistantId,
      ]);
      expect(r.state.messages.first.sequence, 5);
      expect(r.state.messages.first.persistedAt, DateTime.parse(_userTime));
      expect(r.state.canRetry, isFalse);
      r.transport.pageResult = Future.value(_page([_user(), _assistant()]));
      await r.controller.loadMessages();
      expect(r.state.messages, hasLength(2));
      expect(r.state.messages.first.persistedAt, DateTime.parse(_userTime));
    },
  );
}

final class _Rig {
  final auth = _Auth();
  final transport = _Transport();
  late final ProviderContainer container;
  late final ProviderSubscription<AiConversationState> subscription;

  static Future<_Rig> create(WidgetTester tester) async {
    final r = _Rig();
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(
          AiWireRepository(r.transport),
        ),
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
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'review-owner'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 1));
    return r;
  }

  AiConversationState get state =>
      container.read(aiConversationControllerProvider);
  AiConversationController get controller =>
      container.read(aiConversationControllerProvider.notifier);

  Future<void> userSaved() async {
    await controller.send('note');
    await controller.checkResult();
    expect(
      state.canRetry,
      isTrue,
      reason: 'Fixture must reach authoritative user_saved through real wire decoding.',
    );
    expect(state.messages.single.messageId, _userId);
    expect(transport.executes, hasLength(1));
  }

  Future<void> expectRetryBlocked() async {
    final prepareCount = transport.prepares.length;
    final executeCount = transport.executes.length;
    expect(state.canRetry, isFalse);
    await controller.retry('note');
    expect(transport.prepares, hasLength(prepareCount));
    expect(transport.executes, hasLength(executeCount));
  }
}

final class _Auth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() async => const Success('review-token');
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

final class _Transport implements AiWireTransport {
  final prepares = <AiWireRequest>[];
  final executes = <AiWireRequest>[];
  final messageReads = <AiWireRequest>[];
  Future<AiWireResponse>? readbackResult;
  Future<AiWireResponse>? pageResult;
  Map<String, Object?>? retryUser;
  Map<String, Object?>? retryAssistant;
  bool allowFirstSuccess = false;
  bool failExecute = false;

  String get currentOperationId => _id(100 + prepares.length);

  AiWireResponse userSavedBody() => _json({
    'operationId': currentOperationId,
    'state': 'user_saved',
    'userMessage': _user(),
  });

  @override
  Future<AiWireResponse> send(AiWireRequest request) async {
    if (request.path == '/v1/me/ai/operations') {
      prepares.add(request);
      return _json({
        'operationId': _id(100 + prepares.length),
        'operationKey': _operationKey,
        'conversationId': _conversation,
        'preparationExpiresAt': '2026-10-12T12:01:00.000Z',
      }, 201);
    }
    if (request.path.endsWith('/execute')) {
      executes.add(request);
      if (failExecute || (executes.length == 1 && !allowFirstSuccess)) {
        return _json({
          'error': {'code': 'AI_OUTCOME_UNRESOLVED', 'message': 'unknown'},
          'requestId': 'review-request',
        }, 503);
      }
      return _json({
        'operationId': request.path.split('/')[5],
        'conversationId': _conversation,
        'userMessage': retryUser ?? _user(),
        'assistantMessage': retryAssistant ?? _assistant(),
      });
    }
    if (request.path.endsWith('/cancel')) {
      return _json({
        'operationId': request.path.split('/')[5],
        'state': 'terminal',
      });
    }
    if (request.path.contains('/messages')) {
      messageReads.add(request);
      return pageResult ?? _page([_user()]);
    }
    if (request.path.contains('/operations/')) {
      return readbackResult ?? userSavedBody();
    }
    throw StateError(
      'Unexpected review fixture request: ${request.method} ${request.path}',
    );
  }
}
