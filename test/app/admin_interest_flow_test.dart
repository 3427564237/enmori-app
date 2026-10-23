import 'dart:convert';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/interest_admin_entry.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:enmori/features/interests/data/backend_admin_interest_repository.dart';
import 'package:enmori/features/interests/data/backend_interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'Profile Admin create is reread and then selectable by an ordinary session',
    (tester) async {
      final peer = _CataloguePeer();
      final harness = await _start(tester, peer);
      await _tap(tester, find.byKey(const Key('my-profile-button')));
      await _tap(tester, find.byKey(const Key('profile-admin-interests')));
      expect(find.byKey(const Key('admin-interest-page')), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('admin-interest-name')),
        'Astronomy',
      );
      await _tap(tester, find.byKey(const Key('admin-interest-create')));
      expect(find.byKey(const Key('admin-interest-confirmed')), findsOneWidget);
      expect(peer.creates, 1);
      expect(peer.catalogueReadsAfterCreate, greaterThanOrEqualTo(1));
      expect(find.textContaining('tag-new-opaque'), findsWidgets);
      expect(peer.selected, isEmpty);

      // Replace the observed session, preserving server catalogue data. A normal
      // user must select/save the server ID through the existing editor itself.
      peer.admin = false;
      harness.auth.emit(const AuthSessionAuthenticated(subject: 'ordinary'));
      await _frames(tester);
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      await _tap(tester, find.byKey(const Key('my-profile-button')));
      expect(find.byKey(const Key('profile-admin-interests')), findsNothing);
      await _tap(tester, find.byKey(const Key('profile-edit-interests')));
      await _tap(
        tester,
        find.byKey(const Key('interest-option-tag-new-opaque')),
      );
      await _tap(tester, find.byKey(const Key('interest-save')));
      await _tap(tester, find.byKey(const Key('interest-done')));
      expect(peer.selected, ['tag-new-opaque']);
      expect(find.byKey(const Key('route-own-profile')), findsOneWidget);
      expect(find.text('Astronomy'), findsOneWidget);
      expect(peer.creates, 1);
      expect(harness.auth.watchCount, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'ordinary direct Admin route cannot expose a create action or write',
    (tester) async {
      final peer = _CataloguePeer()..admin = false;
      final harness = await _start(tester, peer);
      await _tap(tester, find.byKey(const Key('my-profile-button')));
      expect(find.byKey(const Key('profile-admin-interests')), findsNothing);
      harness.container.read(appRouterProvider).go(AppRoutes.adminInterests);
      await _frames(tester);
      final create = find.byKey(const Key('admin-interest-create'));
      if (create.evaluate().isNotEmpty) {
        expect(tester.widget<FilledButton>(create).onPressed, isNull);
      }
      expect(peer.creates, 0);
      await _tap(tester, find.byType(BackButton));
      expect(find.byKey(const Key('route-own-profile')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'old visible Profile callback cannot open Admin after same-UID replacement',
    (tester) async {
      final peer = _CataloguePeer();
      final harness = await _start(tester, peer);
      var opens = 0;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: harness.container,
          child: MaterialApp(
            home: Scaffold(
              body: InterestAdminEntry(
                onOpen: () async {
                  opens++;
                },
              ),
            ),
          ),
        ),
      );
      await _frames(tester);
      final oldTap = tester
          .widget<ListTile>(find.byKey(const Key('profile-admin-interests')))
          .onTap!;
      harness.auth.emit(AuthSessionAuthenticated(subject: 'admin'));
      await _frames(tester);
      oldTap();
      await _frames(tester);
      expect(opens, 0);
      expect(peer.creates, 0);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<_Harness> _start(WidgetTester tester, _CataloguePeer peer) async {
  final auth = FakeAuthRepository();
  final api = BackendApiClient(
    Uri.parse('https://synthetic.invalid'),
    auth.getIdToken,
    httpClient: MockClient(peer.respond),
  );
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      accountRepositoryProvider.overrideWithValue(
        FakeAccountRepository()
          ..statusResult = Success(
            OnboardingCompleted(testAccount(username: 'member_a')),
          ),
      ),
      interestRepositoryProvider.overrideWithValue(
        BackendInterestRepository(api),
      ),
      adminInterestRepositoryProvider.overrideWithValue(
        BackendAdminInterestRepository(api),
      ),
      eventRecommendationRepositoryProvider.overrideWithValue(
        FakeEventRecommendationRepository(),
      ),
    ],
  );
  addTearDown(auth.close);
  addTearDown(api.close);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  await tester.pump();
  auth.emit(const AuthSessionAuthenticated(subject: 'admin'));
  await _frames(tester);
  return _Harness(auth, container);
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      250,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _Harness {
  _Harness(this.auth, this.container);
  final FakeAuthRepository auth;
  final ProviderContainer container;
}

// A stateful synthetic HTTP peer, separate from the UI and both repositories.
// The Backend test independently exercises the actual routes/use cases/store.
final class _CataloguePeer {
  bool admin = true;
  int creates = 0, catalogueReadsAfterCreate = 0, revision = 0;
  final tags = <Map<String, Object?>>[
    {'interestTagId': 'tag-existing', 'displayName': 'Books'},
  ];
  List<String> selected = [];

  Future<http.Response> respond(http.Request request) async {
    final path = request.url.path;
    if (path == '/v1/me/interest-tag-admin-capability') {
      return _json({'canCreateInterestTags': admin});
    }
    if (path == '/v1/interest-tags') {
      if (creates > 0) catalogueReadsAfterCreate++;
      return _json({'interestTags': tags});
    }
    if (path == '/v1/admin/interest-tags' && request.method == 'POST') {
      if (!admin) return _error('AUTH_FORBIDDEN', 403);
      creates++;
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      final tag = <String, Object?>{
        'interestTagId': 'tag-new-opaque',
        'displayName': body['displayName'],
      };
      tags.add(tag);
      return _json({
        'interestTag': {...tag, 'lifecycleState': 'active', 'revision': 1},
      }, 201);
    }
    if (path == '/v1/me/interests') {
      if (request.method == 'PUT') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['expectedRevision'], revision);
        selected = (body['interestTagIds'] as List).cast<String>();
        revision++;
      }
      return _json({
        'interests': {
          'revision': revision,
          'interestTags': [
            for (final tag in tags)
              if (selected.contains(tag['interestTagId']))
                {...tag, 'lifecycleState': 'active'},
          ],
        },
      });
    }
    return _error('SERVICE_UNAVAILABLE', 503);
  }

  http.Response _error(String code, int status) => _json({
    'error': {
      'code': code,
      'message': 'Safe synthetic error',
      'requestId': 'synthetic',
    },
  }, status);
  http.Response _json(Object value, [int status = 200]) => http.Response(
    jsonEncode(value),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}
