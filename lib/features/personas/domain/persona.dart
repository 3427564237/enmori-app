enum PersonaTone { neutral, warm, encouraging }

enum PersonaResponseLength { concise, balanced, detailed }

enum PersonaFormatStyle { plain, bulleted }

const personaMaximumRevision = 9007199254740991;

final class PersonaFields {
  const PersonaFields({
    required this.displayName,
    required this.tone,
    required this.responseLength,
    required this.formatStyle,
  });

  final String displayName;
  final PersonaTone tone;
  final PersonaResponseLength responseLength;
  final PersonaFormatStyle formatStyle;

  PersonaFields get normalized => PersonaFields(
    displayName: normalizePersonaName(displayName),
    tone: tone,
    responseLength: responseLength,
    formatStyle: formatStyle,
  );

  static String? nameValidationMessage(String value) {
    final normalized = normalizePersonaName(value);
    if (!_wellFormed(value) ||
        normalized.isEmpty ||
        normalized.runes.length > 50 ||
        _prohibitedNameCharacters.hasMatch(normalized)) {
      return 'Use a name of 1–50 characters, valid style options and valid versions.';
    }
    return null;
  }

  @override
  bool operator ==(Object other) =>
      other is PersonaFields &&
      displayName == other.displayName &&
      tone == other.tone &&
      responseLength == other.responseLength &&
      formatStyle == other.formatStyle;

  @override
  int get hashCode =>
      Object.hash(displayName, tone, responseLength, formatStyle);
}

// ECMAScript trim, deliberately excluding Dart's additional U+0085 trimming.
final _edgeWhitespace = RegExp(
  r'^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$',
  unicode: true,
);
final _prohibitedNameCharacters = RegExp(
  r'[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]',
  unicode: true,
);

String normalizePersonaName(String value) =>
    value.replaceAll(_edgeWhitespace, '');

bool _wellFormed(String value) {
  for (var i = 0; i < value.length; i++) {
    final unit = value.codeUnitAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++i >= value.length) return false;
      final next = value.codeUnitAt(i);
      if (next < 0xdc00 || next > 0xdfff) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

bool isPersonaId(String value) =>
    value.length == 64 && RegExp(r'^[a-f0-9]{64}$').hasMatch(value);

bool isPersonaStateRevision(int value) =>
    value >= 0 && value <= personaMaximumRevision;

final class Persona {
  const Persona({
    required this.personaId,
    required this.fields,
    required this.createdAt,
    required this.updatedAt,
    required this.revision,
  });

  final String personaId;
  final PersonaFields fields;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int revision;
}

final class PersonaCollection {
  PersonaCollection({
    required List<Persona> items,
    required this.stateRevision,
    this.activePersonaId,
  }) : items = List.unmodifiable(items);

  final List<Persona> items;
  final int stateRevision;
  final String? activePersonaId;

  Persona? get activePersona {
    for (final persona in items) {
      if (persona.personaId == activePersonaId) return persona;
    }
    return null;
  }
}

final class PersonaMutation {
  const PersonaMutation({required this.persona, required this.stateRevision});

  final Persona persona;
  final int stateRevision;
}

final class PersonaCreateCommand {
  const PersonaCreateCommand({
    required this.fields,
    required this.expectedStateRevision,
    required this.idempotencyKey,
  });

  final PersonaFields fields;
  final int expectedStateRevision;
  final String idempotencyKey;
}
