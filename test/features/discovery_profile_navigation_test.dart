import 'dart:convert';

import 'package:enmori/app/providers.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/discovery_card_page.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fakes.dart';

void main() {
  for (final home in [true, false]) {
    testWidgets(
      'discovery opens the existing profile from its current route, home=$home',
      (tester) async {
        final rig = await _mount(tester, home: home);
        await tester.tap(find.text('Demo person'));
        await tester.pumpAndSettle();
        expect(find.byType(DiscoveryCardPage), findsOneWidget);
        expect(rig.opened, isEmpty);
        expect(rig.paths.where((p) => p.endsWith('/profile')), isEmpty);
        await tester.tap(find.widgetWithText(OutlinedButton, 'View profile'));
        await tester.pumpAndSettle();
        expect(rig.opened, ['demo_person']);
        expect(find.text('Existing profile: demo_person'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(find.text('Demo person'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await _dispose(tester, rig);
      },
    );
  }

  testWidgets(
    'a stale discovery action cannot navigate a replacement same-UID session',
    (tester) async {
      final rig = await _mount(tester);
      await tester.tap(find.text('Demo person'));
      await tester.pumpAndSettle();
      final open = tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'View profile'),
          )
          .onPressed!;
      rig.auth.emit(AuthSessionAuthenticated(subject: 'viewer'));
      await tester.pumpAndSettle();
      open();
      await tester.pumpAndSettle();
      expect(rig.opened, isEmpty);
      expect(find.byType(DiscoveryCardPage), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _dispose(tester, rig);
    },
  );

  testWidgets(
    'an unavailable discovery card exposes no profile navigation action',
    (tester) async {
      final rig = await _mount(tester, cardAllowed: false);
      await tester.tap(find.text('Demo person'));
      await tester.pumpAndSettle();
      expect(find.text('View profile'), findsNothing);
      expect(find.text('This card is unavailable. Retry'), findsOneWidget);
      expect(rig.opened, isEmpty);
      await _dispose(tester, rig);
    },
  );
}

typedef _Rig = ({
  ProviderContainer container,
  FakeAuthRepository auth,
  BackendApiClient api,
  List<String> opened,
  List<String> paths,
});

Future<_Rig> _mount(
  WidgetTester tester, {
  bool home = true,
  bool cardAllowed = true,
}) async {
  final auth = FakeAuthRepository();
  final opened = <String>[], paths = <String>[];
  final api = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('fixture'),
    httpClient: MockClient((request) async {
      paths.add(request.url.path);
      if (request.url.path == '/v1/users/demo_person/discovery-card' &&
          cardAllowed) {
        return http.Response(
          jsonEncode({
            'card': {'username': 'demo_person', 'displayName': 'Demo person'},
          }),
          200,
        );
      }
      return http.Response(
        jsonEncode({
          'error': {'code': 'CONTENT_NOT_AVAILABLE', 'message': 'Unavailable'},
        }),
        403,
      );
    }),
  );
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      backendApiClientProvider.overrideWithValue(api),
      friendDiscoveryRepositoryProvider.overrideWithValue(_Discovery()),
    ],
  );
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'viewer'));
  await container.read(authSessionProvider.future);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: SingleChildScrollView(
              child: FriendDiscoveryPanel(
                home: home,
                onOpenRequests: () async {},
                onOpenProfile: (username) async {
                  expect(ModalRoute.of(context)?.isCurrent, isTrue);
                  opened.add(username);
                  await Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => Scaffold(
                        appBar: AppBar(),
                        body: Text('Existing profile: $username'),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return (
    container: container,
    auth: auth,
    api: api,
    opened: opened,
    paths: paths,
  );
}

Future<void> _dispose(WidgetTester tester, _Rig rig) async {
  await tester.pumpWidget(const SizedBox.shrink());
  rig.container.dispose();
  rig.api.close();
  await rig.auth.close();
  await tester.pump();
}

class _Discovery implements FriendDiscoveryRepository {
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => const Success([
    FriendSuggestion(
      username: 'demo_person',
      displayName: 'Demo person',
      sharedInterests: ['Music'],
      commonEventCount: 0,
      reason: 'Shared interests',
      ignoreVersion: 'revision-1',
    ),
  ]);
}
