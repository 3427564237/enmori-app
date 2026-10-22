import 'dart:async';
import 'dart:convert';

import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/weather/weather_providers.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';

import 'friend_ignore_flow_test.dart' as ignore;
import 'located_check_in_flow_test.dart' show LocationFake;
import '../support/fakes.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/check_in/data/backend_check_in_place_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controller.dart';
import 'package:enmori/features/check_in/presentation/located_check_in_controller.dart';
import 'package:enmori/features/check_in/presentation/located_check_in_actions.dart';
import 'package:enmori/features/friends/data/backend_friend_ignore_repository.dart';
import 'package:enmori/features/friends/presentation/friend_ignore_controller.dart';
import 'package:enmori/features/friends/presentation/ignored_people_page.dart';

void main() {
  for (final replacement in [false, true]) {
    testWidgets(
      'visible Ignore is bound before repaint; same UID replacement=$replacement',
      (tester) async {
        final f = await ignore.setup();
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: f.container,
            child: MaterialApp(
              theme: ThemeData(splashFactory: NoSplash.splashFactory),
              home: Scaffold(
                body: SingleChildScrollView(
                  child: FriendDiscoveryPanel(
                    home: true,
                    onOpenProfile: (_) async {},
                    onOpenRequests: () async {},
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        if (replacement) {
          await tester.runAsync(() async {
            f.auth.emit(AuthSessionAuthenticated(subject: 'owner'));
            await Future<void>.delayed(Duration.zero);
            f.container.read(friendIgnoreControllerProvider);
          });
        }
        await tester.ensureVisible(find.byTooltip('Ignore @alpha'));
        await tester.tap(find.byTooltip('Ignore @alpha'));
        await tester.runAsync(() => Future<void>.delayed(Duration.zero));
        expect(f.repo.writes, replacement ? 0 : 1);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  for (final operation in [
    'removeLocation',
    'removeWeather',
    'replaceLocation',
  ]) {
    for (final replacement in [false, true]) {
      test(
        'pending $operation token is fenced; same UID replacement=$replacement',
        () async {
          final auth = FakeAuthRepository(),
              token = Completer<Result<String>>(),
              entered = Completer<void>();
          var puts = 0;
          final client = BackendApiClient(
            Uri.https('controlled.invalid'),
            () {
              entered.complete();
              return token.future;
            },
            httpClient: MockClient((request) async {
              puts++;
              return http.Response('{}', 503);
            }),
          );
          final record = CheckIn(
            checkInId: 'fixture',
            note: 'Fixture',
            createdAt: DateTime.utc(2026),
            checkInVisibility: CheckInVisibility.private,
          );
          final own = FakeCheckInRepository()..readResult = Success(record);
          final c = ProviderContainer(
            overrides: [
              authRepositoryProvider.overrideWithValue(auth),
              checkInRepositoryProvider.overrideWithValue(own),
              checkInPlaceRepositoryProvider.overrideWithValue(
                BackendCheckInPlaceRepository(client),
              ),
              foregroundLocationProvider.overrideWithValue(LocationFake()),
            ],
          );
          addTearDown(c.dispose);
          addTearDown(auth.close);
          addTearDown(client.close);
          c.listen(authSessionProvider, (_, _) {});
          auth.emit(AuthSessionAuthenticated(subject: 'owner'));
          await c.read(authSessionProvider.future);
          c.listen(locatedCheckInControllerProvider('edit'), (_, _) {});
          final controller = c.read(
            locatedCheckInControllerProvider('edit').notifier,
          );
          await controller.read('fixture');
          final pending = operation == 'replaceLocation'
              ? controller.replaceLocation(expectedEpoch: controller.epoch)
              : controller.remove(
                  location: operation == 'removeLocation',
                  expectedEpoch: controller.epoch,
                );
          await entered.future;
          if (replacement) {
            auth.emit(AuthSessionAuthenticated(subject: 'owner'));
            await c.pump();
          }
          token.complete(const Success('synthetic'));
          await pending;
          expect(puts, replacement ? 0 : 1);
        },
      );
    }
  }

  for (final replace in [false, true]) {
    testWidgets(
      'visible Save must retain rendered author; replacement=$replace',
      (tester) async {
        final sessions = StreamController<AuthSession>();
        addTearDown(sessions.close);
        late ProviderContainer c;
        final writes = <http.Request>[];
        final client = BackendApiClient(
          Uri.https('controlled.invalid'),
          () async {
            final session =
                c.read(authSessionProvider).asData!.value
                    as AuthSessionAuthenticated;
            return Success('${session.subject}-token');
          },
          httpClient: MockClient((request) async {
            writes.add(request);
            return http.Response(
              jsonEncode({
                'error': {
                  'code': 'SERVICE_UNAVAILABLE',
                  'message': 'Synthetic',
                  'requestId': 'synthetic',
                },
              }),
              503,
              headers: {'content-type': 'application/json'},
            );
          }),
        );
        addTearDown(client.close);
        c = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
            checkInPlaceRepositoryProvider.overrideWithValue(
              BackendCheckInPlaceRepository(client),
            ),
          ],
        );
        addTearDown(c.dispose);
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: c,
            child: MaterialApp(
              theme: ThemeData(splashFactory: NoSplash.splashFactory),
              home: Scaffold(
                body: SingleChildScrollView(
                  child: LocatedCheckInActions(
                    draftKey: 'stale-save',
                    note: 'Synthetic A-only draft',
                    visibility: CheckInVisibility.private,
                    openAttribution: (_) async => false,
                  ),
                ),
              ),
            ),
          ),
        );
        sessions.add(AuthSessionAuthenticated(subject: 'synthetic-a'));
        await tester.pumpAndSettle();
        if (replace) {
          await tester.runAsync(() async {
            sessions.add(AuthSessionAuthenticated(subject: 'synthetic-b'));
            await Future<void>.delayed(Duration.zero);
            c.read(locatedCheckInControllerProvider('stale-save'));
          });
        }
        await tester.ensureVisible(
          find.text('Save Check-in'),
        ); // No frame pumped.
        await tester.tap(find.text('Save Check-in'));
        await tester.runAsync(() => Future<void>.delayed(Duration.zero));
        if (replace) {
          expect(writes, isEmpty);
        } else {
          expect(writes, hasLength(1));
          expect(
            (jsonDecode(writes.single.body) as Map)['note'],
            'Synthetic A-only draft',
          );
          expect(
            writes.single.headers['Authorization'],
            'Bearer synthetic-a-token',
          );
        }
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  for (final replace in [false, true]) {
    test('pending Check-in dispatch; replacement=$replace', () async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final token = Completer<Result<String>>(), entered = Completer<void>();
      final writes = <http.Request>[];
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () {
          if (!entered.isCompleted) entered.complete();
          return token.future;
        },
        httpClient: MockClient((request) async {
          writes.add(request);
          return http.Response(
            jsonEncode({
              'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': 'Synthetic',
                'requestId': 'synthetic',
              },
            }),
            503,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.close);
      final c = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => sessions.stream),
          checkInPlaceRepositoryProvider.overrideWithValue(
            BackendCheckInPlaceRepository(client),
          ),
        ],
      );
      addTearDown(c.dispose);
      final sub = c.listen(
        locatedCheckInControllerProvider('probe'),
        (_, _) {},
      );
      addTearDown(sub.close);
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic-a'));
      await c.pump();
      final controller = c.read(
        locatedCheckInControllerProvider('probe').notifier,
      );
      final pending = controller.save(
        expectedEpoch: controller.epoch,
        note: 'Synthetic A-only draft',
        visibility: CheckInVisibility.private,
      );
      await entered.future;
      if (replace) {
        sessions.add(AuthSessionAuthenticated(subject: 'synthetic-b'));
        await c.pump();
      }
      token.complete(
        Success(replace ? 'synthetic-b-token' : 'synthetic-a-token'),
      );
      await pending;
      expect(c.read(locatedCheckInControllerProvider('probe')).value, isNull);
      if (replace) {
        expect(writes, isEmpty);
      } else {
        expect(writes, hasLength(1));
        expect(
          writes.single.headers['Authorization'],
          'Bearer synthetic-a-token',
        );
        expect(
          (jsonDecode(writes.single.body) as Map)['note'],
          'Synthetic A-only draft',
        );
      }
    });
  }
  for (final replace in [false, true]) {
    testWidgets('Restore visible button; same-UID replacement=$replace', (
      tester,
    ) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      var puts = 0;
      final version = 'a' * 64;
      final client = BackendApiClient(
        Uri.https('controlled.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          if (request.method == 'PUT') puts++;
          final person = {
            'username': 'member_target',
            'displayName': 'Synthetic target',
            'ignored': request.method != 'PUT',
            'version': version,
          };
          return http.Response(
            jsonEncode(
              request.method == 'GET' &&
                      !request.url.path.endsWith('/member_target')
                  ? {
                      'people': [person],
                    }
                  : person,
            ),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.close);
      final c = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => sessions.stream),
          friendIgnoreRepositoryProvider.overrideWithValue(
            BackendFriendIgnoreRepository(client),
          ),
        ],
      );
      addTearDown(c.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: c,
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: const IgnoredPeoplePage(),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic-a'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(find.text('Restore'), findsOneWidget);
      if (replace) {
        await tester.runAsync(() async {
          sessions.add(AuthSessionAuthenticated(subject: 'synthetic-a'));
          await Future<void>.delayed(Duration.zero);
          c.read(friendIgnoreControllerProvider);
        });
      }
      await tester.tap(find.text('Restore'));
      await tester.runAsync(() => Future<void>.delayed(Duration.zero));
      expect(puts, replace ? 0 : 1);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
