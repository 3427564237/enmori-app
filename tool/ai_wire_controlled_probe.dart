import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';

const controlledProbeInput = 'Synthetic controlled AI wire probe.';

/// Non-content observations only. An in-process fixture operator can consume
/// cleanupConversationId when delete is blocked; it is never printed or saved.
/// A successful HTTP sequence does not establish Note/model/physical cleanup.
final class AiWireProbeResult {
  const AiWireProbeResult({required this.steps, this.cleanupConversationId});

  final List<String> steps;
  final String? cleanupConversationId;
  bool get passed => steps.every((step) => step.endsWith(':pass'));
}

/// Creates only a new Conversation. No retry, fallback, old ticket replay or
/// arbitrary Conversation deletion is available through this probe.
Future<AiWireProbeResult> runAiWireControlledProbe({
  required AiConversationRepository repository,
  required String token,
}) async {
  final steps = <String>[];
  AiTicket? ticket;
  String? cleanupConversation;
  final total = Stopwatch()..start();
  try {
    final prepared = await _bounded(
      const Duration(seconds: 15),
      (abort) => repository.prepare(token: token, abort: abort),
    );
    if (prepared case Failure<AiTicket>(:final failure)) {
      steps.add('prepare:blocked:${failure.kind.name}');
      return AiWireProbeResult(steps: List.unmodifiable(steps));
    }
    ticket = (prepared as Success<AiTicket>).value;
    steps.add('prepare:pass');
    final remaining = const Duration(seconds: 90) - total.elapsed;
    final executeBudget = remaining < const Duration(seconds: 75)
        ? remaining
        : const Duration(seconds: 75);
    final executed = await _bounded(
      executeBudget,
      (abort) => repository.execute(
        token: token,
        abort: abort,
        ticket: ticket!,
        text: controlledProbeInput,
      ),
    );
    if (executed case Failure<AiReply>(:final failure)) {
      steps.add('execute:blocked:${failure.kind.name}');
      final cancelled = await _bounded(
        const Duration(seconds: 15),
        (abort) =>
            repository.cancel(token: token, abort: abort, ticket: ticket!),
      );
      steps.add(_status('cancel', cancelled));
    } else {
      steps.add('execute:pass');
      final reply = (executed as Success<AiReply>).value;
      final outcome = await _bounded(
        const Duration(seconds: 15),
        (abort) => repository.readOperation(
          token: token,
          abort: abort,
          conversationId: ticket!.conversationId,
          operationId: ticket.operationId,
        ),
      );
      if (outcome case Success<AiReadback>(:final value)) {
        final consistent =
            value.state == AiOutcomeState.assistantSaved &&
            _same(value.userMessage, reply.userMessage) &&
            _same(value.assistantMessage, reply.assistantMessage);
        steps.add(
          consistent ? 'readOutcome:pass' : 'readOutcome:blocked:identity',
        );
      } else {
        steps.add(_status('readOutcome', outcome));
      }
      final page = await _bounded(
        const Duration(seconds: 15),
        (abort) => repository.readMessages(
          token: token,
          abort: abort,
          conversationId: ticket!.conversationId,
        ),
      );
      if (page case Success<AiMessagePage>(:final value)) {
        final consistent =
            value.messages.length == 2 &&
            _same(value.messages[0], reply.userMessage) &&
            _same(value.messages[1], reply.assistantMessage);
        steps.add(
          consistent ? 'readMessages:pass' : 'readMessages:blocked:identity',
        );
      } else {
        steps.add(_status('readMessages', page));
      }
    }
  } finally {
    total.stop();
    if (ticket != null) {
      // This is explicit own-fixture teardown, never an execute rollback or a
      // claim that physical content/provenance/control cleanup has completed.
      final deleted = await _bounded(
        const Duration(seconds: 15),
        (abort) => repository.deleteConversation(
          token: token,
          abort: abort,
          conversationId: ticket!.conversationId,
        ),
      );
      steps.add(_status('deleteConversation', deleted));
      if (deleted is Failure<void>) cleanupConversation = ticket.conversationId;
    }
  }
  return AiWireProbeResult(
    steps: List.unmodifiable(steps),
    cleanupConversationId: cleanupConversation,
  );
}

bool _same(AiMessage? a, AiMessage b) =>
    a != null &&
    a.messageId == b.messageId &&
    a.sequence == b.sequence &&
    a.role == b.role &&
    a.persistedAt == b.persistedAt &&
    a.availability == b.availability &&
    a.text == b.text;

String _status<T>(String name, Result<T> result) => switch (result) {
  Success<T>() => '$name:pass',
  Failure<T>(:final failure) => '$name:blocked:${failure.kind.name}',
};

Future<Result<T>> _bounded<T>(
  Duration budget,
  Future<Result<T>> Function(AiAbortSignal) operation,
) async {
  final abort = AiAbortSignal();
  const unknown = Failure<Never>(
    AppFailure(
      kind: AppFailureKind.aiOutcomeUnresolved,
      message: 'The controlled probe could not confirm the operation.',
    ),
  );
  if (budget <= Duration.zero) return unknown;
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
    return unknown;
  } finally {
    timer.cancel();
    elapsed.stop();
  }
}

/// Explicit invocation only; ordinary bootstrap never imports this tool.
/// A selected synthetic Backend operator owns fixture source and final sweeps.
/// No token may be supplied in argv, build settings, output, files or logs.
Future<void> main(List<String> arguments) async {
  final values = <String, String>{};
  var loopback = false;
  for (final argument in arguments) {
    if (argument == '--isolated-loopback') {
      loopback = true;
    } else if (argument.startsWith('--base-uri=') ||
        argument.startsWith('--fixture-source=')) {
      final separator = argument.indexOf('=');
      final name = argument.substring(2, separator);
      if (values.containsKey(name)) {
        stderr.writeln('Duplicate controlled probe option.');
        exitCode = 2;
        return;
      }
      values[name] = argument.substring(separator + 1);
    } else {
      stderr.writeln('Unsupported controlled probe option.');
      exitCode = 2;
      return;
    }
  }
  final base = Uri.tryParse(values['base-uri'] ?? '');
  final source = values['fixture-source'] ?? '';
  if (base == null || !RegExp(r'^[A-Za-z0-9._-]{1,80}$').hasMatch(source)) {
    stderr.writeln(
      'Declare --base-uri and a non-content --fixture-source label.',
    );
    exitCode = 2;
    return;
  }
  final client = http.Client();
  try {
    final transport = loopback
        ? HttpAiWireTransport.isolatedLoopback(baseUri: base, client: client)
        : HttpAiWireTransport(baseUri: base, client: client);
    final previousEcho = stdin.hasTerminal ? stdin.echoMode : null;
    String? token;
    try {
      if (previousEcho != null) stdin.echoMode = false;
      token = stdin.readLineSync(encoding: utf8);
    } finally {
      if (previousEcho != null) stdin.echoMode = previousEcho;
    }
    if (token == null || token.isEmpty) {
      stderr.writeln(
        'A selected synthetic identity token is required on stdin.',
      );
      exitCode = 2;
      return;
    }
    final result = await runAiWireControlledProbe(
      repository: AiWireRepository(transport),
      token: token,
    );
    token = null;
    stdout.writeln(
      jsonEncode({
        'fixtureSource': source,
        'steps': result.steps,
        'result': result.passed ? 'pass' : 'blocked',
        'operatorFixtureCleanupRequired': result.cleanupConversationId != null,
        'evidence': 'HTTP client only; Backend evidence is separate.',
      }),
    );
    if (!result.passed) exitCode = 2;
  } catch (_) {
    stderr.writeln('The controlled probe could not run in this configuration.');
    exitCode = 2;
  } finally {
    client.close();
  }
}
