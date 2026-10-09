import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'same UID new auth session clears shared data and rejects old completion',
    () async {
      final auth = StreamController<AuthSession>();
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => auth.stream),
          personaRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(() {
        container.dispose();
        unawaited(auth.close());
      });
      final subscription = container.listen(
        personaSessionControllerProvider,
        (_, _) {},
      );
      addTearDown(subscription.close);
      auth.add(AuthSessionAuthenticated(subject: 'same-synthetic-owner'));
      await container.pump();
      final controller = container.read(
        personaSessionControllerProvider.notifier,
      );
      await controller.load();
      final before = container.read(personaSessionControllerProvider);
      expect(before.isCurrent, isTrue);
      final creating = controller.create(_fields);
      auth.add(AuthSessionAuthenticated(subject: 'same-synthetic-owner'));
      await container.pump();
      final after = container.read(personaSessionControllerProvider);
      expect(after.sessionKey, isNot(same(before.sessionKey)));
      expect(after.collection, isNull);
      expect(repository.isEligible!(), isFalse);
      repository.response.complete(
        Success(PersonaMutation(persona: _persona, stateRevision: 1)),
      );
      expect(await creating, isFalse);
      await container.pump();
      expect(
        container.read(personaSessionControllerProvider).confirmedWriteCount,
        0,
      );
      expect(
        container.read(personaSessionControllerProvider).pendingCreate,
        isNull,
      );
    },
  );

  test('auth observation error removes authority even when AsyncError retains old data', () async {
    final auth = StreamController<AuthSession>();
    final container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((ref) => auth.stream),
        personaRepositoryProvider.overrideWithValue(_Repository()),
      ],
    );
    addTearDown(() {
      container.dispose();
      unawaited(auth.close());
    });
    final sub = container.listen(personaSessionControllerProvider, (_, _) {});
    addTearDown(sub.close);
    auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
    await container.pump();
    await container.read(personaSessionControllerProvider.notifier).load();
    final old = container.read(personaSessionSourceProvider)!;
    auth.addError(StateError('synthetic observation error'));
    await container.pump();
    expect(container.read(personaSessionSourceProvider), isNull);
    expect(old.isActive, isFalse);
    expect(container.read(personaSessionControllerProvider).collection, isNull);
  });
}

const _fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
final _persona = Persona(
  personaId: 'a' * 64,
  fields: _fields,
  createdAt: DateTime.utc(2026),
  updatedAt: DateTime.utc(2026),
  revision: 1,
);

final class _Repository implements PersonaRepository {
  final response = Completer<Result<PersonaMutation>>();
  bool Function()? isEligible;
  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async => Success(PersonaCollection(items: [], stateRevision: 0));
  @override
  Future<Result<PersonaMutation>> readOne(
    String id, {
    bool Function()? isEligible,
  }) async => Success(PersonaMutation(persona: _persona, stateRevision: 0));
  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    this.isEligible = isEligible;
    return PersonaCreateAttempt(
      foreground: response.future,
      completion: response.future,
      wasDispatched: () => true,
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String id, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) => throw UnimplementedError();
  @override
  Future<Result<PersonaCollection>> activate(
    String id, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) => throw UnimplementedError();
  @override
  Future<Result<void>> delete(
    String id, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) => throw UnimplementedError();
}
