import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/controlled_mobile_fixture_configuration.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.now().toUtc();
  Map<String, Object> configuration() => {
    'schemaVersion': 1,
    'projectId': 'demo-enmori-rmvp01a-r10',
    'baseUri': 'https://127.0.0.1:42001/',
    'issuedAt': now.toIso8601String(),
    'expiresAt': now.add(const Duration(minutes: 2)).toIso8601String(),
    'email': 'synthetic-mobile@example.invalid',
    'password': 'TestOnlyNotAnActualCredential1!',
    'certificateBase64': base64Encode(
      ascii.encode(
        '-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----\n',
      ),
    ),
  };

  test('read-and-unlink consumes the runtime file before sign-in and permits only one command', () async {
    final directory = await Directory.systemTemp.createTemp(
      'zhou-mobile-test-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final file = File('${directory.path}/configuration.json');
    await file.writeAsString(jsonEncode(configuration()));
    final selected = await ControlledMobileFixtureConfiguration.consume(
      file,
      now: now,
    );
    expect(await file.exists(), isFalse);
    final auth = _Auth();
    expect(await selected.signIn(auth), isA<Success<void>>());
    expect(await selected.signIn(auth), isA<Failure<void>>());
    expect(auth.commands, 1);
  });

  test('malformed and oversized files are deleted and diagnostics never include source input', () async {
    final directory = await Directory.systemTemp.createTemp(
      'zhou-mobile-test-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final file = File('${directory.path}/configuration.json');
    for (final text in [
      'sensitive-marker-invalid-json',
      'x' * (ControlledMobileFixtureConfiguration.maximumBytes + 1),
    ]) {
      await file.writeAsString(text);
      await expectLater(
        ControlledMobileFixtureConfiguration.consume(file, now: now),
        throwsA(
          isA<FormatException>().having(
            (error) => error.toString().contains('sensitive-marker'),
            'redacted',
            isFalse,
          ),
        ),
      );
      expect(await file.exists(), isFalse);
    }
  });

  test('unselected project, external/plaintext hosts, actual emails, path/query and expired payloads fail closed', () {
    final changes = <Map<String, Object>>[
      {'baseUri': 'http://127.0.0.1:42001/'},
      {'baseUri': 'https://backend.example/'},
      {'baseUri': 'https://secret@127.0.0.1:42001/'},
      {'baseUri': 'https://127.0.0.1:42001/path'},
      {'baseUri': 'https://127.0.0.1:42001/?secret=x'},
      {'projectId': 'unselected-project'},
      {'email': 'actual@example.com'},
      {'expiresAt': now.toIso8601String()},
      {'expiresAt': now.add(const Duration(minutes: 6)).toIso8601String()},
      {'unexpectedField': true},
    ];
    for (final change in changes) {
      expect(
        () => ControlledMobileFixtureConfiguration.parse(
          jsonEncode({...configuration(), ...change}),
          now: now,
        ),
        throwsA(isA<FormatException>()),
      );
    }
  });
}

final class _Auth implements AuthRepository {
  int commands = 0;
  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async {
    commands++;
    return const Success(null);
  }

  @override
  Future<Result<String>> getIdToken() async => throw UnimplementedError();
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => throw UnimplementedError();
  @override
  Future<Result<void>> signOut() async => const Success(null);
  @override
  Stream<AuthSession> watchSession() => const Stream.empty();
}
