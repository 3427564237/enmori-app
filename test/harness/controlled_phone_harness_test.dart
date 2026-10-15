import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/controlled_phone_harness.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/controlled_phone_service_configuration.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

// Local filesystem plus explicit Auth/HTTP/connection doubles only. No Firebase,
// actual certificate validation, device, service or model is executed here.
Map<String, Object> handoff() => {
  'schemaVersion': 1,
  'projectId': ControlledPhoneServiceConfiguration.projectId,
  'email': 'synthetic-phone@example.invalid',
  'password': 'SyntheticNotAnActualCredential1!',
  'baseUri': 'https://127.0.0.1:42001/',
  'certificateBase64': base64Encode(
    ascii.encode(
      '-----BEGIN CERTIFICATE-----\nVEVTVCBPTkxZ\n-----END CERTIFICATE-----\n',
    ),
  ),
  'authEmulatorHost': '127.0.0.1:9099',
  'lifetime': 'until-explicit-stop-in-this-owned-process',
  'syntheticOwnerOnly': true,
};

Future<void> framesUntil(WidgetTester tester, bool Function() condition) async {
  for (var i = 0; i < 100; i++) {
    await tester.pump(const Duration(milliseconds: 200));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 5)),
    );
    if (condition()) return;
  }
  fail('The local launcher double did not reach its expected gate.');
}

Future<Directory> directory(WidgetTester tester) async {
  final value = (await tester.runAsync(
    () => Directory.systemTemp.createTemp('enmori-phone-launcher-'),
  ))!;
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.runAsync(() async {
      if (await value.exists()) await value.delete(recursive: true);
    });
  });
  return value;
}

File configFile(Directory directory) => File(
  '${directory.path}/${ControlledPhoneServiceConfiguration.cacheFileName}',
);
File readyFile(Directory directory) =>
    File('${directory.path}/${ControlledPhoneHarness.readyFileName}');

void main() {
  testWidgets(
    'startup clears stale handoff, publishes fresh readiness, invalid handoff fails safely and retry rotates nonce',
    (tester) async {
      final cache = await directory(tester);
      await tester.runAsync(
        () => configFile(cache).writeAsString(jsonEncode(handoff())),
      );
      await tester.runAsync(
        () => readyFile(cache)
            .writeAsString(jsonEncode({'schemaVersion': 1, 'nonce': 'stale'})),
      );
      var connections = 0;
      await tester.pumpWidget(
        ControlledPhoneHarness(
          cacheDirectory: cache,
          connectionFactory: (_) async {
            connections++;
            throw StateError('synthetic-private-marker');
          },
        ),
      );
      await framesUntil(
        tester,
        () => readyFile(cache).existsSync() && !configFile(cache).existsSync(),
      );
      final first = jsonDecode(readyFile(cache).readAsStringSync()) as Map;
      expect(first.keys, unorderedEquals(['schemaVersion', 'nonce']));
      expect(first['schemaVersion'], 1);
      expect(first['nonce'], matches(RegExp(r'^[0-9a-f]{64}$')));
      expect(connections, 0);
      await tester.runAsync(
        () => configFile(cache).writeAsString('synthetic-private-marker'),
      );
      await framesUntil(
        tester,
        () => find
            .byKey(const Key('controlled-phone-retry'))
            .evaluate()
            .isNotEmpty,
      );
      expect(configFile(cache).existsSync(), isFalse);
      expect(readyFile(cache).existsSync(), isFalse);
      expect(find.textContaining('synthetic-private-marker'), findsNothing);
      expect(connections, 0);
      await tester.tap(find.byKey(const Key('controlled-phone-retry')));
      await framesUntil(tester, () => readyFile(cache).existsSync());
      final second = jsonDecode(readyFile(cache).readAsStringSync()) as Map;
      expect(second['nonce'], isNot(first['nonce']));
      expect(connections, 0);
    },
  );

  testWidgets(
    'mounts Auth observation before sign-in, Settings and Profile use shared HTTP and signout closes only local handles',
    (tester) async {
      final cache = await directory(tester);
      final auth = _Auth();
      final paths = <String>[];
      var releases = 0;
      final client = _Client(paths);
      addTearDown(auth.dispose);
      await tester.pumpWidget(
        ControlledPhoneHarness(
          cacheDirectory: cache,
          connectionFactory: (_) async => ControlledPhoneConnection(
            auth: auth,
            client: client,
            release: () async {
              releases++;
            },
          ),
        ),
      );
      await framesUntil(tester, () => readyFile(cache).existsSync());
      await tester.runAsync(
        () => configFile(cache).writeAsString(jsonEncode(handoff())),
      );
      await framesUntil(tester, () => auth.events.contains('signIn'));
      expect(
        auth.events.indexOf('watch'),
        lessThan(auth.events.indexOf('signIn')),
      );
      expect(configFile(cache).existsSync(), isFalse);
      expect(readyFile(cache).existsSync(), isFalse);
      expect(
        find.textContaining(
          'Connected scope: AI, Persona and Account Settings only.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('home-browse-activities')), findsNothing);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('ai-settings')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-settings')), findsOneWidget);
      expect(paths, contains('/v1/me/settings'));
      final profile = find.byKey(const Key('settings-profile'));
      await tester.ensureVisible(profile);
      await tester.tap(profile);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-profile-edit')), findsOneWidget);
      expect(paths, contains('/v1/me/profile'));
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      final signOut = find.byKey(const Key('settings-sign-out'));
      if (signOut.evaluate().isEmpty) {
        await tester.scrollUntilVisible(
          signOut,
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-settings')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
      }
      await tester.ensureVisible(signOut);
      await tester.tap(signOut);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('controlled-phone-retry')), findsOneWidget);
      expect(auth.events.where((e) => e == 'signOut'), hasLength(1));
      expect(client.closes, 1);
      expect(releases, 1);
      expect(
        paths.every((p) => ['/v1/me/settings', '/v1/me/profile'].contains(p)),
        isTrue,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'connection construction failure deletes private readiness and never mounts a successful fallback',
    (tester) async {
      final cache = await directory(tester);
      var attempts = 0;
      await tester.pumpWidget(
        ControlledPhoneHarness(
          cacheDirectory: cache,
          connectionFactory: (_) async {
            attempts++;
            throw StateError('synthetic-private-marker');
          },
        ),
      );
      await framesUntil(tester, () => readyFile(cache).existsSync());
      await tester.runAsync(
        () => configFile(cache).writeAsString(jsonEncode(handoff())),
      );
      await framesUntil(
        tester,
        () => find
            .byKey(const Key('controlled-phone-retry'))
            .evaluate()
            .isNotEmpty,
      );
      expect(attempts, 1);
      expect(configFile(cache).existsSync(), isFalse);
      expect(readyFile(cache).existsSync(), isFalse);
      expect(find.byKey(const Key('ai-network-harness-banner')), findsNothing);
      expect(find.textContaining('synthetic-private-marker'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}

final class _Auth implements AuthRepository {
  final events = <String>[];
  final sessions = StreamController<AuthSession>.broadcast(sync: true);
  @override
  Stream<AuthSession> watchSession() {
    events.add('watch');
    return sessions.stream;
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async {
    events.add('signIn');
    sessions.add(const AuthSessionAuthenticated(subject: 'synthetic-owner'));
    return const Success(null);
  }

  @override
  Future<Result<void>> signOut() async {
    events.add('signOut');
    if (!sessions.isClosed) sessions.add(const AuthSessionUnauthenticated());
    return const Success(null);
  }

  @override
  Future<Result<String>> getIdToken() async =>
      const Success('synthetic-not-a-service-token');
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => throw StateError('Not selected');
  Future<void> dispose() => sessions.close();
}

final class _Client extends MockClient {
  _Client(List<String> paths)
    : super((request) async {
        paths.add(request.url.path);
        final body = request.url.path == '/v1/me/settings'
            ? {
                'settings': {
                  'checkInVisibility': 'private',
                  'optionalProcessingConsent': 'rejected',
                  'revision': 0,
                },
              }
            : {
                'profile': {
                  'username': 'synthetic_owner',
                  'displayName': 'Synthetic owner',
                  'profileVisibility': 'private',
                  'revision': 0,
                },
              };
        return http.Response(
          jsonEncode(body),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });
  int closes = 0;
  @override
  void close() {
    closes++;
    super.close();
  }
}
