import 'dart:convert';
import 'dart:io';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/friends/data/backend_friend_repository.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/presentation/my_friends_controller.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

class ControlledNetwork extends http.BaseClient {
  ControlledNetwork(this.delegate);
  final http.Client delegate;
  bool fail = false;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    if (fail) throw const SocketException('Synthetic offline test');
    return delegate.send(request);
  }

  @override
  void close() => delegate.close();
}

Future<void> until(WidgetTester tester, bool Function() condition) async {
  for (var n = 0; n < 300; n++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
  }
  throw StateError('The isolated My Friends state did not settle.');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'two-account My Friends acceptance, pages, privacy, unset name, reload and error recovery use real Backend',
    (tester) async {
      const url = String.fromEnvironment('ENMORI_API_BASE_URL');
      const password = String.fromEnvironment('ENMORI_TEST_PASSWORD');
      const certificate = String.fromEnvironment(
        'ENMORI_TEST_TLS_CERTIFICATE_BASE64',
      );
      final uri = Uri.parse(url);
      if (uri.scheme != 'https' ||
          uri.host != '10.0.2.2' ||
          password.isEmpty ||
          certificate.isEmpty) {
        throw StateError('Isolated Android HTTPS fixture required.');
      }
      final firebase = await Firebase.initializeApp(
        name: 'my-friends-android',
        options: const FirebaseOptions(
          apiKey: 'controlled-emulator-key',
          appId: '1:1234567890:android:controlledtest',
          messagingSenderId: '1234567890',
          projectId: 'demo-enmori-rmvp01a-r10',
        ),
      );
      addTearDown(firebase.delete);
      final auth = FirebaseAuth.instanceFor(app: firebase);
      await auth.useAuthEmulator('10.0.2.2', 9099);
      final context = SecurityContext(withTrustedRoots: false)
        ..setTrustedCertificatesBytes(base64Decode(certificate));
      final network = ControlledNetwork(IOClient(HttpClient(context: context)));
      final client = BackendApiClient(uri, () async {
        final token = await auth.currentUser?.getIdToken(true);
        return token == null
            ? const Failure(
                AppFailure(
                  kind: AppFailureKind.authRequired,
                  message: 'Test identity unavailable.',
                ),
              )
            : Success(token);
      }, httpClient: network);
      addTearDown(client.close);
      final scope = ProviderContainer(
        overrides: [
          isolatedSlicesEnabledProvider.overrideWithValue(true),
          authRepositoryProvider.overrideWithValue(
            FirebaseAuthRepository(auth),
          ),
          backendApiClientProvider.overrideWithValue(client),
          accountRepositoryProvider.overrideWithValue(
            BackendAccountRepository(client),
          ),
        ],
      );
      addTearDown(scope.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: scope, child: const EnmoriApp()),
      );
      final repository = BackendFriendRepository(client);

      Future<void> signIn(bool owner) async {
        await auth.signOut();
        await until(
          tester,
          () => scope.read(currentAuthSubjectProvider) == null,
        );
        await auth.signInWithEmailAndPassword(
          email: owner
              ? 'my-friends-owner@example.invalid'
              : 'my-friends-peer@example.invalid',
          password: password,
        );
        await until(
          tester,
          () => scope.read(routerGateProvider) == RouterGateState.authenticated,
        );
      }

      Future<void> openList() async {
        scope.read(appRouterProvider).go('/friends');
        await until(
          tester,
          () => find.byKey(const Key('open-my-friends')).evaluate().isNotEmpty,
        );
        await tester.tap(find.byKey(const Key('open-my-friends')));
        await until(
          tester,
          () =>
              find.byKey(const Key('route-my-friends')).evaluate().isNotEmpty &&
              scope.read(myFriendsControllerProvider).loaded,
        );
      }

      Future<void> profile(String visibility, String? name) async {
        final current = await client.get('/v1/me/profile');
        expect(current, isA<Success<JsonObject>>());
        final revision =
            ((current as Success<JsonObject>).value['profile']
                as Map)['revision'];
        expect(
          await client.put(
            '/v1/me/profile',
            body: {
              'displayName': name,
              'profileVisibility': visibility,
              'expectedRevision': revision,
            },
          ),
          isA<Success<JsonObject>>(),
        );
      }

      await signIn(true);
      final request = await repository.lookup('member_target_1', send: true);
      expect(
        (request as Success<FriendTarget>).value.relationship,
        RelationshipState.outgoingRequestPending,
      );
      await signIn(false);
      final inbox = (await repository.inbox() as Success<FriendInbox>).value;
      expect(inbox.requests.length, 1);
      expect(
        await repository.act(inbox.requests.single.requestRef, accept: true),
        isA<Success<String>>(),
      );
      await openList();
      expect(find.text('Member owner'), findsOneWidget);
      expect(scope.read(myFriendsControllerProvider).friends.length, 1);

      // Transport fault only; the product repository and Backend stay real.
      network.fail = true;
      await tester.tap(find.byKey(const Key('my-friends-reload')));
      await until(
        tester,
        () => scope.read(myFriendsControllerProvider).failure != null,
      );
      expect(find.text('Member owner'), findsNothing);
      expect(find.text('No friends available on this page.'), findsNothing);
      network.fail = false;
      await tester.tap(find.byKey(const Key('my-friends-reload')));
      await until(tester, () => scope.read(myFriendsControllerProvider).loaded);
      expect(find.text('Member owner'), findsOneWidget);

      await signIn(true);
      expect(find.byKey(const Key('route-my-friends')), findsNothing);
      await openList();
      final first = scope.read(myFriendsControllerProvider);
      expect(first.friends.length, 20);
      expect(first.nextCursor, isNotNull);
      await tester.scrollUntilVisible(
        find.byKey(const Key('my-friends-next')),
        500,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('route-my-friends')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.byKey(const Key('my-friends-next')));
      await until(tester, () => scope.read(myFriendsControllerProvider).loaded);
      final second = scope.read(myFriendsControllerProvider);
      expect(second.friends.length, 20);
      expect(
        first.friends
            .map((row) => row.username)
            .toSet()
            .intersection(second.friends.map((row) => row.username).toSet()),
        isEmpty,
      );
      await tester.scrollUntilVisible(
        find.byKey(const Key('my-friends-next')),
        500,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('route-my-friends')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.byKey(const Key('my-friends-next')));
      await until(tester, () => scope.read(myFriendsControllerProvider).loaded);
      expect(scope.read(myFriendsControllerProvider).friends.length, 2);
      expect(scope.read(myFriendsControllerProvider).nextCursor, isNull);

      await profile('private', 'Member owner');
      await signIn(false);
      await openList();
      expect(find.text('No friends available on this page.'), findsOneWidget);
      await signIn(true);
      await profile('friends_only', null);
      await signIn(false);
      await openList();
      expect(find.text('No friends available on this page.'), findsOneWidget);
      await signIn(true);
      await profile('public', 'Member owner');
      await signIn(false);
      await openList();
      expect(find.text('Member owner'), findsOneWidget);
      await tester.pageBack();
      await until(
        tester,
        () => find.byKey(const Key('open-my-friends')).evaluate().isNotEmpty,
      );
      await tester.tap(find.byKey(const Key('open-my-friends')));
      await until(tester, () => scope.read(myFriendsControllerProvider).loaded);
      expect(find.text('Member owner'), findsOneWidget);
      debugPrint(
        'MY_FRIENDS_ANDROID_TWO_ACCOUNT_ACCEPT_PAGING_PRIVACY_UNSET_RELOAD_ERROR: Pass',
      );
    },
  );
}
