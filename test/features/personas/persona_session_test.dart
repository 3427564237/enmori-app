import 'dart:async';
import 'dart:collection';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/domain/persona_session.dart';
import 'package:flutter_test/flutter_test.dart';

const fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
const unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Unavailable',
);
const stale = AppFailure(
  kind: AppFailureKind.personaRevisionPreconditionFailed,
  message: 'Stale',
);
const keyA = '00000000-0000-4000-8000-000000000001';
const keyB = '00000000-0000-4000-8000-000000000002';
final persona = Persona(
  personaId: 'a' * 64,
  fields: fields,
  createdAt: DateTime.utc(2026),
  updatedAt: DateTime.utc(2026),
  revision: 1,
);
PersonaCollection collection(int revision, {bool populated = false}) =>
    PersonaCollection(
      items: populated ? [persona] : [],
      stateRevision: revision,
    );
PersonaMutation mutation(int revision) =>
    PersonaMutation(persona: persona, stateRevision: revision);
Future<void> tick() async {
  await Future<void>.delayed(Duration.zero);
}

void main() {
  late _Repository repository;
  late PersonaSession session;
  setUp(() {
    repository = _Repository();
    var keyCount = 0;
    session = PersonaSession(
      repository,
      newKey: () => keyCount++ == 0 ? keyA : keyB,
    );
  });
  tearDown(() => session.dispose());

  test('loading failure never becomes empty or zero Active; successful retry clears failure', () async {
    repository.reads.add(Future.value(const Failure(unavailable)));
    await session.load();
    expect(session.state.collection, isNull);
    expect(session.state.isCurrent, isFalse);
    await session.load();
    expect(session.state.isCurrent, isTrue);
    expect(session.state.failure, isNull);
    expect(session.state.message, isNull);
  });

  test(
    'GET 12 followed by GET 11 never regresses the shared collection',
    () async {
      final old = Completer<Result<PersonaCollection>>();
      final fresh = Completer<Result<PersonaCollection>>();
      repository.reads.addAll([old.future, fresh.future]);
      final first = session.load();
      final second = session.load();
      fresh.complete(Success(collection(12)));
      await second;
      old.complete(Success(collection(11, populated: true)));
      await first;
      expect(session.state.collection!.stateRevision, 12);
      expect(session.state.isCurrent, isTrue);
    },
  );

  test(
    'single read at 12 invalidates full set 11 until eligible set reread',
    () async {
      repository.current = collection(11);
      await session.load();
      repository.single = Success(mutation(12));
      await session.readPersona(persona.personaId);
      expect(session.state.isCurrent, isFalse);
      expect(session.state.message, contains('Reload'));
      await session.load();
      expect(session.state.isCurrent, isFalse);
      repository.current = collection(12);
      await session.load();
      expect(session.state.isCurrent, isTrue);
    },
  );

  test(
    'timeout recovery 412 keeps envelope; original late success settles once',
    () async {
      await session.load();
      final first = _Attempt();
      final second = _Attempt();
      repository.attempts.addAll([first, second]);
      final creating = session.create(fields);
      first.foreground.complete(const Failure(unavailable));
      expect(await creating, isFalse);
      expect(
        session.state.pendingCreate!.status,
        PersonaCreateStatus.uncertain,
      );
      final retry = session.retryCreate();
      second.complete(const Failure(stale));
      await retry;
      await tick();
      expect(repository.commands[0], same(repository.commands[1]));
      expect(
        session.state.pendingCreate!.status,
        PersonaCreateStatus.recoveryClosed,
      );
      expect(session.state.pendingCreate!.canRetry, isFalse);
      expect(session.endUnresolvedCreate(), isFalse);
      repository.current = collection(1, populated: true);
      first.completion.complete(Success(mutation(1)));
      await tick();
      expect(session.state.pendingCreate, isNull);
      expect(session.state.lastConfirmedCreateKey, keyA);
      expect(session.state.confirmedWriteCount, 1);
      expect(session.state.collection!.stateRevision, 1);
    },
  );

  test(
    'explicit disposition requires a later read and detaches old replies',
    () async {
      await session.load();
      final old = _Attempt();
      final fresh = _Attempt();
      repository.attempts.addAll([old, fresh]);
      final create = session.create(fields);
      old.foreground.complete(const Failure(unavailable));
      await create;
      expect(session.endUnresolvedCreate(), isFalse);
      await session.load();
      expect(session.endUnresolvedCreate(), isTrue);
      final next = session.create(fields);
      old.completion.complete(Success(mutation(1)));
      await tick();
      expect(session.state.pendingCreate!.command.idempotencyKey, keyB);
      expect(session.state.confirmedWriteCount, 0);
      repository.current = collection(1, populated: true);
      fresh.complete(Success(mutation(1)));
      await next;
      expect(session.state.lastConfirmedCreateKey, keyB);
    },
  );

  test(
    'a read begun before uncertainty cannot permit ending that command',
    () async {
      await session.load();
      final read = Completer<Result<PersonaCollection>>();
      repository.reads.add(read.future);
      final loading = session.load();
      final attempt = _Attempt();
      repository.attempts.add(attempt);
      final creating = session.create(fields);
      attempt.foreground.complete(const Failure(unavailable));
      await creating;
      read.complete(Success(collection(0)));
      await loading;
      expect(session.state.pendingCreate!.canEnd, isFalse);
      attempt.completion.complete(const Failure(unavailable));
    },
  );

  test(
    'late error from another attempt cannot downgrade confirmed success',
    () async {
      await session.load();
      final a = _Attempt();
      final b = _Attempt();
      repository.attempts.addAll([a, b]);
      final create = session.create(fields);
      a.foreground.complete(const Failure(unavailable));
      await create;
      final retry = session.retryCreate();
      repository.current = collection(1, populated: true);
      b.complete(Success(mutation(1)));
      await retry;
      await tick();
      a.completion.complete(const Failure(stale));
      await tick();
      expect(session.state.confirmedWriteCount, 1);
      expect(session.state.pendingCreate, isNull);
      expect(session.state.failure, isNull);
    },
  );

  test(
    'proven unsent retry never clears an earlier ambiguous command',
    () async {
      await session.load();
      final a = _Attempt();
      final b = _Attempt(dispatched: false);
      repository.attempts.addAll([a, b]);
      final create = session.create(fields);
      a.foreground.complete(const Failure(unavailable));
      await create;
      final retry = session.retryCreate();
      b.complete(const Failure(unavailable));
      await retry;
      await tick();
      expect(session.state.pendingCreate, isNotNull);
      a.completion.complete(const Failure(unavailable));
    },
  );

  test('dispose makes delayed dispatch and old success inert, even same owner relogin', () async {
    await session.load();
    final a = _Attempt();
    repository.attempts.add(a);
    final create = session.create(fields);
    final originalKey = session.state.sessionKey;
    session.dispose();
    final replacement = PersonaSession(repository, newKey: () => keyB);
    addTearDown(replacement.dispose);
    expect(repository.eligibilities.single(), isFalse);
    a.complete(Success(mutation(1)));
    await create;
    expect(replacement.state.sessionKey, isNot(same(originalKey)));
    expect(replacement.state.collection, isNull);
    expect(replacement.state.confirmedWriteCount, 0);
  });

  test('confirmed edit followed by failed read retains write success, not current data', () async {
    repository.current = collection(1, populated: true);
    await session.load();
    repository.reads.add(Future.value(const Failure(unavailable)));
    expect(await session.edit(persona, fields), isTrue);
    expect(session.state.confirmedWriteCount, 1);
    expect(session.state.isCurrent, isFalse);
    expect(session.state.message, contains('saved, but'));
  });

  test('DELETE 204 does not fabricate revision, old pre-write read cannot confirm it', () async {
    repository.current = collection(1, populated: true);
    await session.load();
    final oldRead = Completer<Result<PersonaCollection>>();
    final afterRead = Completer<Result<PersonaCollection>>();
    repository.reads.addAll([oldRead.future, afterRead.future]);
    final before = session.load();
    final deleting = session.delete(persona);
    await tick();
    oldRead.complete(Success(collection(1, populated: true)));
    await before;
    expect(session.state.isCurrent, isFalse);
    afterRead.complete(Success(collection(2)));
    await deleting;
    expect(session.state.isCurrent, isTrue);
    expect(session.state.collection!.stateRevision, 2);
  });

  test('success pending reread cannot replace higher revision with old create response', () async {
    await session.load();
    final a = _Attempt();
    repository.attempts.add(a);
    final create = session.create(fields);
    a.foreground.complete(const Failure(unavailable));
    await create;
    repository.current = collection(12);
    await session.load();
    a.completion.complete(Success(mutation(1)));
    await tick();
    expect(session.state.confirmedWriteCount, 1);
    expect(session.state.collection!.stateRevision, 12);
  });
}

final class _Attempt {
  _Attempt({this.dispatched = true});
  final foreground = Completer<Result<PersonaMutation>>();
  final completion = Completer<Result<PersonaMutation>>();
  final bool dispatched;
  void complete(Result<PersonaMutation> result) {
    completion.complete(result);
    if (!foreground.isCompleted) foreground.complete(result);
  }

  PersonaCreateAttempt get value => PersonaCreateAttempt(
    foreground: foreground.future,
    completion: completion.future,
    wasDispatched: () => dispatched,
  );
}

final class _Repository implements PersonaRepository {
  PersonaCollection current = collection(0);
  Result<PersonaMutation> single = Success(mutation(0));
  final reads = Queue<Future<Result<PersonaCollection>>>();
  final attempts = Queue<_Attempt>();
  final commands = <PersonaCreateCommand>[];
  final eligibilities = <bool Function()>[];
  @override
  Future<Result<PersonaCollection>> readAll({bool Function()? isEligible}) =>
      reads.isNotEmpty ? reads.removeFirst() : Future.value(Success(current));
  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async => single;
  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    commands.add(command);
    eligibilities.add(isEligible);
    return attempts.removeFirst().value;
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => Success(mutation(expectedStateRevision + 1));
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
