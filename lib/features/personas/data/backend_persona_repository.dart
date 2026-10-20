import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../domain/persona_repository.dart';

final class BackendPersonaRepository implements PersonaRepository {
  BackendPersonaRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async => _collectionResult(
    await _client.getPersona('/v1/me/personas', isEligible: isEligible),
  );

  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async {
    if (!isPersonaId(personaId)) return const Failure(_invalidRequest);
    return _mutationResult(
      await _client.getPersona(
        '/v1/me/personas/$personaId',
        isEligible: isEligible,
      ),
      expectedId: personaId,
    );
  }

  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    final fields = command.fields.normalized;
    final invalid =
        !_validFields(command.fields) ||
            !isPersonaStateRevision(command.expectedStateRevision)
        ? _invalidFields
        : command.idempotencyKey.length != 36 ||
              !_createKey.hasMatch(command.idempotencyKey)
        ? _invalidKey
        : null;
    if (invalid != null) {
      final result = Future<Result<PersonaMutation>>.value(Failure(invalid));
      return PersonaCreateAttempt(
        foreground: result,
        completion: result,
        wasDispatched: () => false,
      );
    }
    final attempt = _client.postPersonaCreate(
      body: {
        ..._fieldsBody(fields),
        'expectedStateRevision': command.expectedStateRevision,
      },
      idempotencyKey: command.idempotencyKey,
      isEligible: isEligible,
    );
    Result<PersonaMutation> parse(Result<JsonObject> value) {
      final parsed = _mutationResult(value);
      if (parsed case Success<PersonaMutation>(:final value)) {
        if (value.persona.fields != fields ||
            value.persona.revision != 1 ||
            value.stateRevision != command.expectedStateRevision + 1 ||
            value.persona.createdAt != value.persona.updatedAt) {
          return const Failure(_invalidResponse);
        }
      }
      return parsed;
    }

    return PersonaCreateAttempt(
      foreground: attempt.foreground.then(parse),
      completion: attempt.completion.then(parse),
      wasDispatched: () => attempt.dispatched,
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!isPersonaId(personaId)) return const Failure(_invalidRequest);
    if (!_validFields(fields) ||
        !_validVersions(expectedRevision, expectedStateRevision)) {
      return const Failure(_invalidFields);
    }
    final result = _mutationResult(
      await _client.putPersona(
        '/v1/me/personas/$personaId',
        body: {
          ..._fieldsBody(fields.normalized),
          'expectedRevision': expectedRevision,
          'expectedStateRevision': expectedStateRevision,
        },
        isEligible: isEligible,
      ),
      expectedId: personaId,
    );
    if (result case Success<PersonaMutation>(:final value)) {
      if (value.persona.fields != fields.normalized) {
        return const Failure(_invalidResponse);
      }
    }
    return result;
  }

  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!isPersonaId(personaId)) return const Failure(_invalidRequest);
    if (!_validVersions(expectedRevision, expectedStateRevision)) {
      return const Failure(_invalidFields);
    }
    final result = _collectionResult(
      await _client.putPersona(
        '/v1/me/persona-selection',
        body: {
          'personaId': personaId,
          'expectedRevision': expectedRevision,
          'expectedStateRevision': expectedStateRevision,
        },
        isEligible: isEligible,
      ),
    );
    if (result case Success<PersonaCollection>(:final value)) {
      if (value.activePersonaId != personaId) {
        return const Failure(_invalidResponse);
      }
    }
    return result;
  }

  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!isPersonaId(personaId)) return const Failure(_invalidRequest);
    if (!_validVersions(expectedRevision, expectedStateRevision)) {
      return const Failure(_invalidFields);
    }
    return _client.deletePersona(
      '/v1/me/personas/$personaId',
      body: {
        'expectedRevision': expectedRevision,
        'expectedStateRevision': expectedStateRevision,
      },
      isEligible: isEligible,
    );
  }

  bool _validFields(PersonaFields fields) =>
      PersonaFields.nameValidationMessage(fields.displayName) == null &&
      fields.expressionFields.values.every(isPersonaExpressionText);
  bool _validVersions(int target, int state) =>
      target >= 1 &&
      isPersonaStateRevision(target) &&
      isPersonaStateRevision(state);

  JsonObject _fieldsBody(PersonaFields fields) => {
    'displayName': fields.displayName,
    'tone': fields.tone.name,
    'responseLength': fields.responseLength.name,
    'formatStyle': fields.formatStyle.name,
    ...fields.expressionFields,
  };

  Result<PersonaMutation> _mutationResult(
    Result<JsonObject> response, {
    String? expectedId,
  }) {
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value;
    if (!_keys(body, {'persona', 'stateRevision'})) {
      return const Failure(_invalidResponse);
    }
    final stateRevision = body['stateRevision'];
    final persona = _parsePersona(body['persona']);
    if (!_revision(stateRevision, minimum: 0) ||
        persona == null ||
        (expectedId != null && persona.personaId != expectedId)) {
      return const Failure(_invalidResponse);
    }
    return Success(
      PersonaMutation(persona: persona, stateRevision: stateRevision as int),
    );
  }

  Result<PersonaCollection> _collectionResult(Result<JsonObject> response) {
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value;
    if (!_keys(body, {'personas'})) return const Failure(_invalidResponse);
    final raw = body['personas'];
    if (raw is! Map<String, dynamic> ||
        !_keys(
          raw,
          {'items', 'stateRevision'},
          optional: {'activePersonaId'},
        )) {
      return const Failure(_invalidResponse);
    }
    final rawItems = raw['items'];
    final revision = raw['stateRevision'];
    if (rawItems is! List ||
        rawItems.length > 5 ||
        !_revision(revision, minimum: 0)) {
      return const Failure(_invalidResponse);
    }
    final personas = <Persona>[];
    final ids = <String>{};
    for (final item in rawItems) {
      final persona = _parsePersona(item);
      if (persona == null || !ids.add(persona.personaId)) {
        return const Failure(_invalidResponse);
      }
      if (personas.isNotEmpty) {
        final previous = personas.last;
        final timeOrder = previous.createdAt.compareTo(persona.createdAt);
        if (timeOrder > 0 ||
            (timeOrder == 0 &&
                previous.personaId.compareTo(persona.personaId) > 0)) {
          return const Failure(_invalidResponse);
        }
      }
      personas.add(persona);
    }
    final active = raw['activePersonaId'];
    if (raw.containsKey('activePersonaId') &&
        (active is! String || !ids.contains(active))) {
      return const Failure(_invalidResponse);
    }
    return Success(
      PersonaCollection(
        items: personas,
        stateRevision: revision as int,
        activePersonaId: active as String?,
      ),
    );
  }

  Persona? _parsePersona(Object? value) {
    if (value is! Map<String, dynamic> ||
        !_keys(value, {
          'personaId',
          'displayName',
          'tone',
          'responseLength',
          'formatStyle',
          'createdAt',
          'updatedAt',
          'revision',
        }, optional: _expressionKeys)) {
      return null;
    }
    final id = value['personaId'];
    final name = value['displayName'];
    final tone = _enumValue(PersonaTone.values, value['tone']);
    final length = _enumValue(
      PersonaResponseLength.values,
      value['responseLength'],
    );
    final format = _enumValue(PersonaFormatStyle.values, value['formatStyle']);
    final created = _timestamp(value['createdAt']);
    final updated = _timestamp(value['updatedAt']);
    final revision = value['revision'];
    if (id is! String ||
        !isPersonaId(id) ||
        name is! String ||
        PersonaFields.nameValidationMessage(name) != null ||
        normalizePersonaName(name) != name ||
        tone == null ||
        length == null ||
        format == null ||
        created == null ||
        updated == null ||
        _expressionKeys.any(
          (key) =>
              value.containsKey(key) &&
              (value[key] is! String ||
                  !isPersonaExpressionText(value[key] as String)),
        ) ||
        !_revision(revision, minimum: 1)) {
      return null;
    }
    return Persona(
      personaId: id,
      fields: PersonaFields(
        displayName: name,
        tone: tone,
        responseLength: length,
        formatStyle: format,
        relationship: value['relationship'] as String? ?? '',
        shortIntroduction: value['shortIntroduction'] as String? ?? '',
        description: value['description'] as String? ?? '',
        personality: value['personality'] as String? ?? '',
        communicationStyle: value['communicationStyle'] as String? ?? '',
        interests: value['interests'] as String? ?? '',
        extraInstructions: value['extraInstructions'] as String? ?? '',
      ),
      createdAt: created,
      updatedAt: updated,
      revision: revision as int,
    );
  }
}

const _expressionKeys = {
  'relationship',
  'shortIntroduction',
  'description',
  'personality',
  'communicationStyle',
  'interests',
  'extraInstructions',
};

bool _keys(
  Map<String, Object?> value,
  Set<String> required, {
  Set<String> optional = const {},
}) =>
    required.every(value.containsKey) &&
    value.keys.every((key) => required.contains(key) || optional.contains(key));

bool _revision(Object? value, {required int minimum}) =>
    value is int && value >= minimum && value <= personaMaximumRevision;

T? _enumValue<T extends Enum>(List<T> values, Object? raw) {
  for (final value in values) {
    if (value.name == raw) return value;
  }
  return null;
}

DateTime? _timestamp(Object? raw) {
  if (raw is! String || raw.length != 24 || !_utcTimestamp.hasMatch(raw)) {
    return null;
  }
  final parsed = DateTime.tryParse(raw);
  return parsed != null && parsed.toUtc().toIso8601String() == raw
      ? parsed
      : null;
}

final _createKey = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);
final _utcTimestamp = RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$');
const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid response.',
);
const _invalidFields = AppFailure(
  kind: AppFailureKind.personaInvalid,
  message:
      'Use a name of 1–50 characters, valid style options and valid versions.',
);
const _invalidRequest = AppFailure(
  kind: AppFailureKind.requestInvalid,
  message: 'Request parameters are invalid.',
);
const _invalidKey = AppFailure(
  kind: AppFailureKind.idempotencyKeyInvalid,
  message: 'Provide a valid request key and try again.',
);
