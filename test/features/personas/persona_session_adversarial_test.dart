import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Unavailable',
);
const _stale = AppFailure(
  kind: AppFailureKind.personaRevisionPreconditionFailed,
  message: 'Stale',
);
final _persona = Persona(
  personaId: 'a' * 64,
  fields: _fields,
  createdAt: DateTime.utc(2026),
  updatedAt: DateTime.utc(2026),
  revision: 1,
);

void main() {
  test('observed signout prevents a late token dispatch before provider rebuild flush', () async {
    final auth = StreamController<AuthSession>(sync: true);
    final token = Completer<Result<String>>();
    var tokenCalls = 0;
    var sends = 0;
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () => ++tokenCalls == 1
          ? Future.value(const Success('synthetic'))
          : token.future,
      httpClient: MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'personas': {'items': [], 'stateRevision': 0},
            }),
            200,
          );
        }
        sends++;
        return http.Response(
          jsonEncode({
            'error': {
              'code': 'AUTH_REQUIRED',
              'message': 'Expired',
              'requestId': 'synthetic',
            },
          }),
          401,
        );
      }),
    );
    final container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((ref) => auth.stream),
        personaRepositoryProvider.overrideWithValue(
          BackendPersonaRepository(client),
        ),
      ],
    );
    final sub = container.listen(personaSessionControllerProvider, (_, _) {});
    addTearDown(() {
      sub.close();
      container.dispose();
      client.close();
      unawaited(auth.close());
    });
    auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
    await container.pump();
    final controller = container.read(
      personaSessionControllerProvider.notifier,
    );
    await controller.load();
    final creating = controller.create(_fields);
    auth.add(const AuthSessionUnauthenticated());
    token.complete(const Success('late-old-token'));
    await creating;
    await container.pump();
    expect(sends, 0);
  });

  for (final entry in [
    ('PERSONA_INVALID', 422),
    ('PERSONA_REVISION_PRECONDITION_FAILED', 412),
  ]) {
    test(
      'real immediate ${entry.$2} is definite non-application with no earlier attempt',
      () async {
        final client = BackendApiClient(
          Uri.parse('https://example.invalid'),
          () async => const Success('synthetic'),
          httpClient: MockClient((request) async {
            if (request.method == 'GET') {
              return http.Response(
                jsonEncode({
                  'personas': {'items': [], 'stateRevision': 0},
                }),
                200,
              );
            }
            return http.Response(
              jsonEncode({
                'error': {
                  'code': entry.$1,
                  'message': 'Safe error',
                  'requestId': 'synthetic',
                },
              }),
              entry.$2,
            );
          }),
        );
        final session = PersonaSession(
          BackendPersonaRepository(client),
          newKey: () => '11111111-1111-4111-8111-111111111111',
        );
        addTearDown(() {
          session.dispose();
          client.close();
        });
        await session.load();
        expect(await session.create(_fields), isFalse);
        await _tick();
        expect(
          session.state.pendingCreate,
          isNull,
          reason: 'A complete validated rejection is not a foreground timeout.',
        );
        expect(session.state.confirmedWriteCount, 0);
        if (entry.$2 == 412) {
          expect(
            session.state.isCurrent,
            isFalse,
            reason: 'A rejected owner revision requires a later accepted GET.',
          );
          expect(session.state.canStartNewCreate, isFalse);
          expect(await session.create(_fields), isFalse);
          await session.load();
          expect(session.state.isCurrent, isTrue);
          expect(session.state.canStartNewCreate, isTrue);
        }
      },
    );
  }

  test('old post-success reread cannot overwrite feedback for a newer failed write', () async {
    final repo = _Repository();
    final session = PersonaSession(repo, newKey: () => 'unused');
    addTearDown(session.dispose);
    await session.load();
    final delayedAfterFirstWrite = Completer<Result<PersonaCollection>>();
    repo.reads.add(delayedAfterFirstWrite.future);
    repo.edits.add(
      Future.value(
        Success(PersonaMutation(persona: _persona, stateRevision: 2)),
      ),
    );
    final first = session.edit(_persona, _fields);
    await _tick();
    // Opening another Persona page starts a new, independent current-set GET.
    repo.current = _collection(2);
    await session.load();
    expect(session.state.isCurrent, isTrue);
    repo.edits.add(Future.value(const Failure(_unavailable)));
    expect(await session.edit(_persona, _fields), isFalse);
    expect(
      session.state.message,
      'The change could not be confirmed. Reload before trying again.',
    );
    delayedAfterFirstWrite.complete(Success(_collection(2)));
    expect(await first, isTrue);
    expect(
      session.state.message,
      'The change could not be confirmed. Reload before trying again.',
      reason:
          'Older success must not describe the newer uncertain write as saved.',
    );
  });

  test('closed recovery copy survives the original attempt ending with a transport error', () async {
    final repo = _Repository();
    final session = PersonaSession(
      repo,
      newKey: () => '11111111-1111-4111-8111-111111111111',
    );
    addTearDown(session.dispose);
    await session.load();
    final firstForeground = Completer<Result<PersonaMutation>>();
    final firstCompletion = Completer<Result<PersonaMutation>>();
    repo.attempts.add(
      PersonaCreateAttempt(
        foreground: firstForeground.future,
        completion: firstCompletion.future,
        wasDispatched: () => true,
      ),
    );
    final creating = session.create(_fields);
    firstForeground.complete(const Failure(_unavailable));
    await creating;
    final rejected = Future<Result<PersonaMutation>>.value(
      const Failure(_stale),
    );
    repo.attempts.add(
      PersonaCreateAttempt(
        foreground: rejected,
        completion: rejected,
        wasDispatched: () => true,
      ),
    );
    await session.retryCreate();
    await _tick();
    expect(
      session.state.pendingCreate!.status,
      PersonaCreateStatus.recoveryClosed,
    );
    firstCompletion.complete(const Failure(_unavailable));
    await _tick();
    expect(session.state.pendingCreate!.canRetry, isFalse);
    expect(
      session.state.message,
      contains('can no longer be recovered'),
      reason: 'The approved closed-recovery state must not invite impossible recovery.',
    );
  });
}

PersonaCollection _collection(int revision) =>
    PersonaCollection(items: [_persona], stateRevision: revision);
Future<void> _tick() => Future<void>.delayed(Duration.zero);

final class _Repository implements PersonaRepository {
  PersonaCollection current = _collection(1);
  final reads = Queue<Future<Result<PersonaCollection>>>();
  final edits = Queue<Future<Result<PersonaMutation>>>();
  final attempts = Queue<PersonaCreateAttempt>();
  @override
  Future<Result<PersonaCollection>> readAll({bool Function()? isEligible}) =>
      reads.isEmpty ? Future.value(Success(current)) : reads.removeFirst();
  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async => Success(
    PersonaMutation(persona: _persona, stateRevision: current.stateRevision),
  );
  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) => attempts.removeFirst();
  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) => edits.removeFirst();
  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => Success(current);
  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => const Success(null);
}
