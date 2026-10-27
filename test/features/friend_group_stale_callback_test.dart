// Regression from ZHOU PR190 exact-head independent review, 26 October 2026.
import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/discovery_providers.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'repeated Next activation must not skip beyond all eligible people',
    (tester) async {
      final rig = await _mount(tester);
      final next = tester
          .widget<TextButton>(
            find.byKey(const Key('friend-recommendations-next-group')),
          )
          .onPressed!;
      next();
      next();
      next();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Person 2'), findsOneWidget);
      expect(find.text('Person 4'), findsNothing);
      await _dispose(tester, rig);
    },
  );

  testWidgets(
    'an old Next callback cannot move a replacement same-UID session',
    (tester) async {
      final rig = await _mount(tester);
      final next = tester
          .widget<TextButton>(
            find.byKey(const Key('friend-recommendations-next-group')),
          )
          .onPressed!;
      rig.auth.sessions.add(AuthSessionAuthenticated(subject: 'fixture-owner'));
      await tester.pumpAndSettle();
      expect(find.text('Person 0'), findsNothing);
      await tester.tap(find.byTooltip('Reload recommendations'));
      await tester.pumpAndSettle();
      expect(find.text('Person 0'), findsOneWidget);
      next();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Person 0'), findsOneWidget);
      await _dispose(tester, rig);
    },
  );

  testWidgets('disposed group callbacks cannot touch the retired widget', (
    tester,
  ) async {
    final rig = await _mount(tester);
    final next = tester
        .widget<TextButton>(
          find.byKey(const Key('friend-recommendations-next-group')),
        )
        .onPressed!;
    await _dispose(tester, rig);
    expect(next, returnsNormally);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'repeated Previous activation must not produce a negative group',
    (tester) async {
      final rig = await _mount(tester);
      await tester.tap(
        find.byKey(const Key('friend-recommendations-next-group')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Person 2'), findsOneWidget);
      final previous = tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Previous group'))
          .onPressed!;
      previous();
      previous();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Person 0'), findsOneWidget);
      await _dispose(tester, rig);
    },
  );
}

Future<({ProviderContainer container, _Auth auth})> _mount(
  WidgetTester tester,
) async {
  final auth = _Auth();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      friendDiscoveryRepositoryProvider.overrideWithValue(_Friends()),
    ],
  );
  container.listen(authSessionProvider, (_, _) {});
  auth.sessions.add(AuthSessionAuthenticated(subject: 'fixture-owner'));
  await container.read(authSessionProvider.future);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: ThemeData(splashFactory: NoSplash.splashFactory),
        home: Scaffold(
          body: SingleChildScrollView(
            child: FriendDiscoveryPanel(
              home: false,
              onOpenProfile: (_) async {},
              onOpenRequests: () async {},
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  expect(find.text('Person 0'), findsOneWidget);
  return (container: container, auth: auth);
}

Future<void> _dispose(
  WidgetTester tester,
  ({ProviderContainer container, _Auth auth}) rig,
) async {
  await tester.pumpWidget(const SizedBox.shrink());
  rig.container.dispose();
  await rig.auth.sessions.close();
  await tester.pump();
}

final class _Friends implements FriendDiscoveryRepository {
  @override
  Future<Result<int>> pendingCount() async => const Success(0);

  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => Success([
    for (var i = 0; i < 5; i++)
      FriendSuggestion(
        username: 'person_$i',
        displayName: 'Person $i',
        sharedInterests: const [],
        commonEventCount: 0,
        reason: 'Same shared region',
        ignoreVersion: 'revision-$i',
      ),
  ]);
}

final class _Auth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() async => const Success('synthetic-token');
  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signOut() async => const Success(null);
}
