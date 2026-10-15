import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

final class AuthDouble implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast(sync: true);
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() async =>
      const Success('synthetic-test-token');
  @override
  Future<Result<void>> signOut() async {
    sessions.add(const AuthSessionUnauthenticated());
    return const Success(null);
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => throw StateError('Registration is outside this composition');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'one observed owner and HTTPS client serve Home, Profile, interests, Friend, Footprint and Persona',
    (tester) async {
      final auth = AuthDouble(), paths = <String>[];
      final client = MockClient((request) async {
        expect(request.url.origin, 'https://127.0.0.1:42001');
        expect(request.headers['authorization'], 'Bearer synthetic-test-token');
        paths.add(request.url.path);
        final body = switch (request.url.path) {
          '/v1/me/onboarding' => {
            'status': 'completed',
            'account': {
              'username': 'synthetic_owner',
              'optionalProcessingConsent': 'accepted',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-15T00:00:00.000Z',
            },
          },
          '/v1/me/profile' => {
            'profile': {
              'username': 'synthetic_owner',
              'displayName': 'Synthetic owner',
              'profileVisibility': 'private',
              'revision': 0,
            },
          },
          '/v1/me/interests' => {'interestTags': [], 'revision': 1},
          '/v1/interest-tags' => {'interestTags': []},
          '/v1/me/friend-requests' => {'requests': [], 'nextCursor': null},
          '/v1/me/friends' => {'friends': [], 'nextCursor': null},
          '/v1/me/check-ins' => {'checkIns': [], 'nextCursor': null},
          '/v1/me/personas' => {
            'personas': {'items': [], 'stateRevision': 0},
          },
          _ => {
            'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Unavailable'},
          },
        };
        return http.Response(
          jsonEncode(body),
          body.containsKey('error') ? 503 : 200,
          headers: {'content-type': 'application/json'},
        );
      });
      const zone = MethodChannel('com.enmori.app/time_zone');
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        zone,
        (call) async => switch (call.method) {
          'ianaTimeZone' => 'Etc/UTC',
          'currentDate' => '2026-10-15',
          'formatInstants' => <String>[],
          _ => null,
        },
      );
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      expect(paths, isEmpty);
      expect(find.textContaining('No public registration'), findsOneWidget);
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'owned-fixture'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      final router = GoRouter.of(
        tester.element(find.byKey(const Key('route-home'))),
      );
      for (final path in [
        AppRoutes.profile,
        AppRoutes.interests,
        '/friends',
        '/friends/list',
        AppRoutes.checkInHistory,
        AppRoutes.personas,
      ]) {
        router.go(path);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
      expect(
        paths,
        containsAll([
          '/v1/me/onboarding',
          '/v1/me/profile',
          '/v1/me/interests',
          '/v1/interest-tags',
          '/v1/me/friend-requests',
          '/v1/me/friends',
          '/v1/me/check-ins',
          '/v1/me/personas',
        ]),
      );
      await auth.signOut();
      await tester.pumpAndSettle();
      expect(find.textContaining('No public registration'), findsOneWidget);
      expect(find.byKey(const Key('route-home')), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      client.close();
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        zone,
        null,
      );
    },
  );
  testWidgets(
    'replacing the connection removes the old authenticated route tree',
    (tester) async {
      final auth = AuthDouble();
      final client = MockClient((_) async => http.Response('{}', 503));
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      auth.sessions.add(const AuthSessionAuthenticated(subject: 'old-owner'));
      await tester.pumpAndSettle();
      final replacement = AuthDouble();
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42002/'),
          auth: replacement,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pumpAndSettle();
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'late-old-owner'),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('No public registration'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      await replacement.sessions.close();
      client.close();
    },
  );
}
