import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/data/backend_own_avatar_repository.dart';
import 'package:enmori/features/account/domain/own_avatar.dart';
import 'package:enmori/features/account/own_avatar_providers.dart';
import 'package:enmori/features/account/presentation/authenticated_avatar.dart';
import 'package:enmori/features/account/presentation/own_avatar_view.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'own_avatar_test.dart' as fixture;

class _VisibleRepository implements VisibleAvatarRepository {
  AvatarPhoto? photo = fixture.photo;
  int reads = 0;
  Completer<Result<AvatarPhoto?>>? pending;
  @override
  Future<Result<AvatarPhoto?>> readForUsername(
    String username,
    bool Function() current,
  ) async {
    reads++;
    return pending?.future ?? Success(photo);
  }
}

void main() {
  test('shared client uses explicit confirmation and exact authenticated projection; malformed state fails closed', () async {
    final requests = <http.Request>[];
    var response = <String, Object?>{
      'avatar': {
        'pngBase64': fixture.png,
        'sourceSha256': 'a' * 64,
        'revision': 1,
        'visibleToAuthenticatedUsers': false,
      },
    };
    final api = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic-token'),
      httpClient: MockClient((request) async {
        requests.add(request);
        return http.Response(jsonEncode(response), 200);
      }),
    );
    addTearDown(api.close);
    final repository = BackendOwnAvatarRepository(api, shared: true);
    expect(
      (await repository.read(
        () => true,
      ) as Success<OwnAvatar>).value.visibleToAuthenticatedUsers,
      isFalse,
    );
    response = {
      'avatar': {
        'pngBase64': fixture.png,
        'sourceSha256': 'a' * 64,
        'revision': 2,
        'visibleToAuthenticatedUsers': true,
      },
    };
    await repository.save(
      photo: fixture.photo,
      expectedRevision: 1,
      visibleToAuthenticatedUsers: true,
      current: () => true,
    );
    expect(requests.last.url.path, '/v1/me/profile/shared-avatar');
    expect(jsonDecode(requests.last.body), {
      'pngBase64': fixture.png,
      'expectedRevision': 1,
      'visibleToAuthenticatedUsers': true,
    });
    response = {
      'avatar': {'pngBase64': fixture.png, 'sourceSha256': 'a' * 64},
    };
    expect(
      await repository.readForUsername('someone', () => true),
      isA<Success<AvatarPhoto?>>(),
    );
    expect(requests.last.url.path, '/v1/users/someone/avatar');
    expect(requests.last.headers['authorization'], 'Bearer synthetic-token');
    response = {
      'avatar': {
        'pngBase64': null,
        'sourceSha256': null,
        'revision': 3,
        'visibleToAuthenticatedUsers': true,
      },
    };
    expect(await repository.read(() => true), isA<Failure<OwnAvatar>>());
    expect(
      await repository.readForUsername('someone', () => true),
      isA<Failure<AvatarPhoto?>>(),
    );
    final count = requests.length;
    await repository.readForUsername('someone', () => false);
    expect(requests, hasLength(count));
  });

  testWidgets(
    'visible avatar clears on background, refreshes removal and ignores a previous session read',
    (tester) async {
      final repository = _VisibleRepository();
      final sessions = StreamController<AuthSession>.broadcast();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => sessions.stream),
          visibleAvatarRepositoryProvider.overrideWithValue(repository),
        ],
      );
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(
              body: AuthenticatedAvatar(username: 'someone', size: 48),
            ),
          ),
        ),
      );
      sessions.add(const AuthSessionAuthenticated(subject: 'a'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNotNull,
      );
      container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNull,
      );
      repository.photo = null;
      container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNull,
      );
      final old = Completer<Result<AvatarPhoto?>>();
      repository.pending = old;
      container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      repository.pending = null;
      sessions.add(const AuthSessionAuthenticated(subject: 'b'));
      await tester.pumpAndSettle();
      old.complete(Success(fixture.photo));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNull,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      container.dispose();
      await sessions.close();
    },
  );

  testWidgets(
    'returning from another route rereads visible avatar instead of restoring old photo',
    (tester) async {
      final repository = _VisibleRepository();
      final navigator = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'viewer')),
            ),
            visibleAvatarRepositoryProvider.overrideWithValue(repository),
          ],
          child: MaterialApp(
            navigatorKey: navigator,
            home: const Scaffold(
              body: AuthenticatedAvatar(username: 'someone', size: 48),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNotNull,
      );
      navigator.currentState!.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Other route')),
        ),
      );
      await tester.pumpAndSettle();
      repository.photo = null;
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNull,
      );
      expect(repository.reads, greaterThan(1));
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
