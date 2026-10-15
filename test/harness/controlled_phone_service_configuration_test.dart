import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/controlled_phone_service_configuration.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

const pem =
    '-----BEGIN CERTIFICATE-----\nVEVTVCBPTkxZ\n-----END CERTIFICATE-----\n';
Map<String, Object> handoff() => {
  'schemaVersion': 1,
  'projectId': 'demo-enmori-rmvp01a-r10',
  'baseUri': 'https://127.0.0.1:42001/',
  'email': 'synthetic-phone@example.invalid',
  'password': 'SyntheticNotAnActualCredential1!',
  'certificateBase64': base64Encode(ascii.encode(pem)),
  'authEmulatorHost': '127.0.0.1:9099',
  'lifetime': 'until-explicit-stop-in-this-owned-process',
  'syntheticOwnerOnly': true,
};

void main() {
  test(
    'exact process handoff retains only bounded public connection fields',
    () {
      final config = ControlledPhoneServiceConfiguration.parse(
        jsonEncode(handoff()),
      );
      expect(config.baseUri.toString(), 'https://127.0.0.1:42001/');
      expect(ascii.decode(config.certificate), pem);
      expect(() => config.certificate.add(0), throwsUnsupportedError);
    },
  );

  test('consume deletes a valid file before one sign-in, without granting a session', () async {
    final directory = await Directory.systemTemp.createTemp(
      'enmori-phone-config-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final file = File(
      '${directory.path}/${ControlledPhoneServiceConfiguration.cacheFileName}',
    );
    await file.writeAsString(jsonEncode(handoff()));
    final config = await ControlledPhoneServiceConfiguration.consume(file);
    expect(await file.exists(), isFalse);
    final auth = FakeAuthRepository();
    addTearDown(auth.close);
    final observed = <AuthSession>[];
    final subscription = auth.watchSession().listen(observed.add);
    addTearDown(subscription.cancel);
    expect(await config.signIn(auth), isA<Success<void>>());
    expect(await config.signIn(auth), isA<Failure<void>>());
    expect(auth.signInCount, 1);
    await Future<void>.delayed(Duration.zero);
    expect(observed, isEmpty);
    auth.emit(const AuthSessionAuthenticated(subject: 'synthetic-observed'));
    await Future<void>.delayed(Duration.zero);
    expect(observed, hasLength(1));
  });

  test(
    'pending or failed Auth command consumes the password without retry',
    () async {
      final config = ControlledPhoneServiceConfiguration.parse(
        jsonEncode(handoff()),
      );
      final auth = FakeAuthRepository()
        ..pendingSignIn = Completer<Result<void>>();
      addTearDown(auth.close);
      final original = config.signIn(auth);
      expect(await config.signIn(auth), isA<Failure<void>>());
      auth.pendingSignIn!.complete(
        const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Synthetic failure',
          ),
        ),
      );
      expect(await original, isA<Failure<void>>());
      expect(await config.signIn(auth), isA<Failure<void>>());
      expect(auth.signInCount, 1);
    },
  );

  test('malformed, oversized and invalid UTF8 handoffs are deleted with safe errors', () async {
    final directory = await Directory.systemTemp.createTemp(
      'enmori-phone-config-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final file = File(
      '${directory.path}/${ControlledPhoneServiceConfiguration.cacheFileName}',
    );
    for (final bytes in [
      utf8.encode('synthetic-private-marker-malformed'),
      utf8.encode(
        jsonEncode({...handoff(), 'projectId': 'unselected-project'}),
      ),
      List<int>.filled(
        ControlledPhoneServiceConfiguration.maximumBytes + 1,
        120,
      ),
      [0xff, 0xfe],
    ]) {
      await file.writeAsBytes(bytes);
      await expectLater(
        ControlledPhoneServiceConfiguration.consume(file),
        throwsA(
          isA<FormatException>()
              .having((e) => e.source, 'source redacted', isNull)
              .having(
                (e) => e.message,
                'fixed safe message',
                'Controlled phone service configuration invalid.',
              ),
        ),
      );
      expect(await file.exists(), isFalse);
    }
  });

  test(
    'throwing Auth errors are redacted and cannot reuse the password',
    () async {
      final config = ControlledPhoneServiceConfiguration.parse(
        jsonEncode(handoff()),
      );
      final auth = FakeAuthRepository()
        ..pendingSignIn = Completer<Result<void>>();
      addTearDown(auth.close);
      final original = config.signIn(auth);
      auth.pendingSignIn!.completeError(StateError('synthetic-private-marker'));
      final result = await original;
      expect(result, isA<Failure<void>>());
      expect(
        (result as Failure<void>).failure.message,
        'The controlled service identity is unavailable.',
      );
      expect(await config.signIn(auth), isA<Failure<void>>());
      expect(auth.signInCount, 1);
    },
  );

  test('symlink handoffs are rejected and unlinked without consuming the target', () async {
    final directory = await Directory.systemTemp.createTemp(
      'enmori-phone-config-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final target = File('${directory.path}/synthetic-target');
    await target.writeAsString(jsonEncode(handoff()));
    final link = Link(
      '${directory.path}/${ControlledPhoneServiceConfiguration.cacheFileName}',
    );
    await link.create(target.path);
    await expectLater(
      ControlledPhoneServiceConfiguration.consume(File(link.path)),
      throwsFormatException,
    );
    expect(await link.exists(), isFalse);
    expect(await target.exists(), isTrue);
  });

  test(
    'an unrelated filename is refused without deleting someone else\'s file',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'enmori-phone-config-',
      );
      addTearDown(() => directory.delete(recursive: true));
      final file = File('${directory.path}/unrelated-configuration.json');
      await file.writeAsString(jsonEncode(handoff()));
      await expectLater(
        ControlledPhoneServiceConfiguration.consume(file),
        throwsFormatException,
      );
      expect(await file.exists(), isTrue);
    },
  );

  final rejected = <String, Map<String, Object>>{
    'extra short-TTL field': {'issuedAt': '2026-10-15T00:00:00Z'},
    'wrong schema type': {'schemaVersion': 1.0},
    'wrong project': {'projectId': 'unselected-project'},
    'plaintext': {'baseUri': 'http://127.0.0.1:42001/'},
    'external host': {'baseUri': 'https://backend.invalid:42001/'},
    'implicit Android alias': {'baseUri': 'https://10.0.2.2:42001/'},
    'userinfo': {'baseUri': 'https://private@127.0.0.1:42001/'},
    'empty userinfo': {'baseUri': 'https://@127.0.0.1:42001/'},
    'missing explicit port': {'baseUri': 'https://127.0.0.1/'},
    'invalid port': {'baseUri': 'https://127.0.0.1:0/'},
    'path': {'baseUri': 'https://127.0.0.1:42001/private'},
    'query': {'baseUri': 'https://127.0.0.1:42001/?token=synthetic'},
    'fragment': {'baseUri': 'https://127.0.0.1:42001/#private'},
    'Auth host': {'authEmulatorHost': 'backend.invalid:9099'},
    'Auth port': {'authEmulatorHost': '127.0.0.1:8080'},
    'lifetime': {'lifetime': 'forever'},
    'owner claim': {'syntheticOwnerOnly': false},
    'actual email': {'email': 'someone@example.com'},
    'short password': {'password': 'short'},
    'password control': {'password': 'SyntheticNotARealPassword\n'},
    'certificate shape': {
      'certificateBase64': base64Encode(ascii.encode('not a PEM')),
    },
    'certificate oversize': {
      'certificateBase64': base64Encode(List<int>.filled(16385, 65)),
    },
    'multiple certificate blocks': {
      'certificateBase64': base64Encode(ascii.encode('$pem$pem')),
    },
  };
  for (final entry in rejected.entries) {
    test('rejects ${entry.key} without exposing the handoff', () {
      expect(
        () => ControlledPhoneServiceConfiguration.parse(
          jsonEncode({...handoff(), ...entry.value}),
        ),
        throwsA(
          isA<FormatException>().having(
            (e) => e.source,
            'source redacted',
            isNull,
          ),
        ),
      );
    });
  }

  test('missing and substituted exact-schema fields cannot pass by key count alone', () {
    for (final key in handoff().keys) {
      final missing = handoff()..remove(key);
      final substituted = {...missing, 'unknown': 'synthetic'};
      for (final raw in [missing, substituted]) {
        expect(
          () => ControlledPhoneServiceConfiguration.parse(jsonEncode(raw)),
          throwsFormatException,
        );
      }
    }
  });
}
