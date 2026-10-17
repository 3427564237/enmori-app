import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:http/http.dart' as http;

const _input = 'I read a book today.';
const _ordinaryBudget = Duration(seconds: 15);

/// Test-only child of the guarded Auth/Firestore SDK host. The host supplies
/// model/compiler doubles, verifies Note/provenance and owns final physical
/// cleanup. This client proves neither real-model behavior nor a device journey.
/// Token bytes arrive only on stdin; no content, identifiers or keys are output.
Future<void> main(List<String> arguments) async {
  http.Client? client;
  StreamIterator<String>? input;
  Map<String, Object> output;
  try {
    final base = _guardedBase(arguments);
    // The parent pipe already owns the selected synthetic identity. Interactive
    // entry, argv tokens and ambient credential discovery are not supported.
    if (stdin.hasTerminal) throw const _Blocked('configuration');
    final lines = StreamIterator(
      stdin.transform(utf8.decoder).transform(const LineSplitter()),
    );
    input = lines;
    final token = await _line(lines);
    if (token == null || token.isEmpty || token.contains(RegExp(r'\s'))) {
      throw const _Blocked('configuration');
    }
    client = http.Client();
    final repository = AiWireRepository(
      HttpAiWireTransport.isolatedLoopback(baseUri: base, client: client),
    );
    output = await _Probe(repository, token, () async {
      // Only the host inspects real store data. No target identifier or content
      // crosses this acknowledgement; a failed host assertion requests cleanup.
      stdout.writeln(jsonEncode({'checkpoint': 'beforeDelete'}));
      await stdout.flush();
      if (await _line(lines) != 'verified') {
        throw const _Blocked('beforeDelete');
      }
    }).run();
  } catch (_) {
    output = {
      'result': 'blocked',
      'steps': ['configuration:blocked'],
      'cleanup': 'not-required',
    };
  } finally {
    client?.close();
    await input?.cancel();
  }
  stdout.writeln(jsonEncode(output));
  if (output['result'] != 'pass') exitCode = 2;
}

Future<String?> _line(StreamIterator<String> input) async {
  try {
    return await input.moveNext().timeout(_ordinaryBudget)
        ? input.current
        : null;
  } catch (_) {
    return null;
  }
}

Uri _guardedBase(List<String> arguments) {
  const project = 'demo-enmori-rmvp01a-r10';
  final environment = Platform.environment;
  final profile = environment['ENMORI_CONTROLLED_PROFILE_DIRECTORY'];
  final credentials = RegExp(
    r'(?:^|_)(?:ACCESS_KEY|API_KEY|APPLICATION_CREDENTIALS|CLIENT_SECRET|'
    r'CREDENTIAL|CREDENTIALS|PASSWORD|PRIVATE_KEY|SECRET|SERVICE_ACCOUNT|TOKEN)'
    r'(?:_|$)',
  );
  if (environment['ENMORI_ENVIRONMENT'] != 'test' ||
      environment['GCLOUD_PROJECT'] != project ||
      environment['GOOGLE_CLOUD_PROJECT'] != project ||
      environment['FIREBASE_AUTH_EMULATOR_HOST'] != '127.0.0.1:9099' ||
      environment['FIRESTORE_EMULATOR_HOST'] != '127.0.0.1:8080' ||
      profile == null ||
      profile.isEmpty ||
      ![
        'APPDATA',
        'HOME',
        'USERPROFILE',
        'XDG_CONFIG_HOME',
      ].every((name) => environment[name] == profile) ||
      environment.keys.any(
        (name) =>
            credentials.hasMatch(name.toUpperCase()) ||
            const {
              'CLOUDSDK_CONFIG',
              'FIREBASE_CONFIG',
            }.contains(name.toUpperCase()),
      ) ||
      arguments.length != 1 ||
      !arguments.single.startsWith('--base-uri=')) {
    throw const _Blocked('configuration');
  }
  final base = Uri.tryParse(arguments.single.substring('--base-uri='.length));
  if (base == null ||
      base.scheme != 'http' ||
      base.host != '127.0.0.1' ||
      !base.hasPort ||
      base.port < 1 ||
      base.port > 65535 ||
      base.userInfo.isNotEmpty ||
      !const {'', '/'}.contains(base.path) ||
      base.hasQuery ||
      base.hasFragment) {
    throw const _Blocked('configuration');
  }
  return base;
}

final class _Probe {
  _Probe(this.repository, this.token, this.beforeDelete);

  final AiConversationRepository repository;
  final String token;
  final Future<void> Function() beforeDelete;
  final List<String> steps = [];
  AiTicket? currentTicket;
  String? ownConversation;
  String cleanup = 'not-required';

  Future<Map<String, Object>> run() async {
    var completed = false;
    try {
      final first = await _send('A');
      final firstTicket = currentTicket!;
      final firstPair = [first.userMessage, first.assistantMessage];
      await _read('A', firstPair);
      final second = await _send('B', previous: firstTicket);
      await _read('B', [
        ...firstPair,
        second.userMessage,
        second.assistantMessage,
      ]);
      await beforeDelete();
      completed = true;
    } catch (error) {
      steps.add('${error is _Blocked ? error.step : 'internal'}:blocked');
      final ticket = currentTicket;
      if (ticket != null) {
        final cancelled = await _bounded(
          _ordinaryBudget,
          (abort) =>
              repository.cancel(token: token, abort: abort, ticket: ticket),
        );
        steps.add('cancel:${cancelled is Success<void> ? 'pass' : 'blocked'}');
      }
    } finally {
      final conversation = ownConversation;
      if (conversation != null) {
        // Only the new conversation from prepare A is eligible. A failed or
        // timed-out delete stays unresolved; it is never an execute rollback.
        final deleted = await _bounded(
          _ordinaryBudget,
          (abort) => repository.deleteConversation(
            token: token,
            abort: abort,
            conversationId: conversation,
          ),
        );
        cleanup = deleted is Success<void> ? 'confirmed' : 'unresolved';
        steps.add(
          'deleteConversation:${deleted is Success<void> ? 'pass' : 'blocked'}',
        );
      }
    }
    return {
      'result': completed && cleanup == 'confirmed' ? 'pass' : 'blocked',
      'steps': steps,
      if (!completed || cleanup != 'confirmed') 'cleanup': cleanup,
    };
  }

  Future<AiReply> _send(String round, {AiTicket? previous}) async {
    currentTicket = null;
    // An unacknowledged prepare cannot prove absence; the parent still owns
    // final service cleanup when this child has no usable ticket/target handle.
    cleanup = 'unresolved';
    final attempt = Stopwatch()..start();
    try {
      final ticket = _value(
        await _bounded(
          _ordinaryBudget,
          (abort) => repository.prepare(
            token: token,
            abort: abort,
            conversationId: previous?.conversationId,
          ),
        ),
        'prepare$round',
      );
      currentTicket = ticket;
      if (previous == null) {
        ownConversation = ticket.conversationId;
      } else if (ticket.conversationId != previous.conversationId ||
          ticket.operationId == previous.operationId ||
          ticket.operationKey == previous.operationKey) {
        throw _Blocked('prepare$round');
      }
      steps.add('prepare$round:pass');
      final remaining = const Duration(seconds: 90) - attempt.elapsed;
      final budget = remaining < const Duration(seconds: 75)
          ? remaining
          : const Duration(seconds: 75);
      final reply = _value(
        await _bounded(
          budget,
          (abort) => repository.execute(
            token: token,
            abort: abort,
            ticket: ticket,
            text: _input,
          ),
        ),
        'execute$round',
      );
      final sequence = previous == null ? 1 : 3;
      if (reply.operationId != ticket.operationId ||
          reply.conversationId != ownConversation ||
          reply.userMessage.sequence != sequence ||
          reply.assistantMessage.sequence != sequence + 1 ||
          reply.userMessage.role != AiRole.user ||
          reply.assistantMessage.role != AiRole.assistant ||
          reply.userMessage.text != _input ||
          reply.userMessage.messageId == reply.assistantMessage.messageId ||
          !_available(reply.userMessage) ||
          !_available(reply.assistantMessage)) {
        throw _Blocked('execute$round');
      }
      steps.add('execute$round:pass');
      return reply;
    } finally {
      attempt.stop();
    }
  }

  Future<void> _read(String round, List<AiMessage> expected) async {
    final page = _value(
      await _bounded(
        _ordinaryBudget,
        (abort) => repository.readMessages(
          token: token,
          abort: abort,
          conversationId: ownConversation!,
        ),
      ),
      'readMessages$round',
    );
    if (page.nextCursor != null ||
        page.messages.length != expected.length ||
        page.messages.map((row) => row.messageId).toSet().length !=
            expected.length) {
      throw _Blocked('readMessages$round');
    }
    for (var index = 0; index < expected.length; index++) {
      final actual = page.messages[index];
      if (!_same(actual, expected[index]) ||
          actual.sequence != index + 1 ||
          actual.role != (index.isEven ? AiRole.user : AiRole.assistant) ||
          (index.isEven && actual.text != _input)) {
        throw _Blocked('readMessages$round');
      }
    }
    steps.add('readMessages$round:pass');
  }
}

bool _available(AiMessage message) =>
    message.availability == AiAvailability.available &&
    message.persistedAt.isUtc &&
    message.text != null;

bool _same(AiMessage actual, AiMessage expected) =>
    actual.messageId == expected.messageId &&
    actual.sequence == expected.sequence &&
    actual.role == expected.role &&
    actual.persistedAt == expected.persistedAt &&
    actual.availability == expected.availability &&
    actual.text == expected.text;

T _value<T>(Result<T> result, String step) => switch (result) {
  Success<T>(:final value) => value,
  Failure<T>() => throw _Blocked(step),
};

final class _Blocked implements Exception {
  const _Blocked(this.step);
  final String step;
}

Future<Result<T>> _bounded<T>(
  Duration budget,
  Future<Result<T>> Function(AiAbortSignal) operation,
) async {
  const unknown = Failure<Never>(
    AppFailure(kind: AppFailureKind.aiOutcomeUnresolved, message: ''),
  );
  if (budget <= Duration.zero) return unknown;
  final abort = AiAbortSignal();
  final elapsed = Stopwatch()..start();
  final timer = Timer(budget, abort.abort);
  try {
    final result = await Future.any([
      operation(abort),
      abort.whenAborted.then<Result<T>>((_) => unknown),
    ]);
    if (elapsed.elapsed >= budget) {
      abort.abort();
      return unknown;
    }
    return result;
  } catch (_) {
    abort.abort();
    return unknown;
  } finally {
    timer.cancel();
    elapsed.stop();
  }
}
