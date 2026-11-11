import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/admin/data/backend_admin_repository.dart';
import 'package:enmori/features/admin/domain/admin_repository.dart';
import 'package:enmori/features/admin/presentation/admin_controller.dart';
import 'package:enmori/features/admin/presentation/admin_pages.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fakes.dart';
import 'admin_interest_test_support.dart';

const category = AdminCategory(
  'cat_12345678-1234-4123-8123-123456789012',
  'Arts',
  true,
  1,
);

class FakeValueAdmin implements AdminRepository {
  List<AdminCategory> values = [category];
  int writes = 0, statusReads = 0, categoryReads = 0;
  Completer<Result<AdminCategory>>? pendingWrite;
  Completer<Result<List<AdminCategory>>>? pendingRead;
  bool unknown = false;
  AdminClassification selected = const AdminClassification(
    'event-one',
    0,
    null,
  );
  @override
  Future<Result<AdminStatus>> status(bool Function() current) async {
    statusReads++;
    return Success(
      AdminStatus(DateTime.utc(2026, 11, 11), [
        AdminServiceStatus(
          'backend',
          true,
          'ready',
          DateTime.utc(2026, 11, 11),
          null,
          null,
        ),
        const AdminServiceStatus(
          'onepa',
          true,
          'unknown',
          null,
          null,
          'not_observed',
        ),
      ]),
    );
  }

  @override
  Future<Result<List<AdminCategory>>> categories(bool Function() current) {
    categoryReads++;
    return pendingRead?.future ?? Future.value(Success(List.of(values)));
  }

  @override
  Future<Result<AdminCategory>> create(
    String name,
    bool Function() current,
  ) async {
    writes++;
    if (pendingWrite != null) return pendingWrite!.future;
    if (unknown) return const Failure(adminUnavailable);
    final created = AdminCategory(
      'cat_22222222-2222-4222-8222-222222222222',
      name,
      true,
      1,
    );
    values = [...values, created];
    return Success(created);
  }

  @override
  Future<Result<AdminCategory>> rename(
    AdminCategory expected,
    String name,
    bool Function() current,
  ) async {
    writes++;
    final value = AdminCategory(
      expected.id,
      name,
      expected.active,
      expected.revision + 1,
    );
    values = [
      for (final c in values)
        if (c.id == value.id) value else c,
    ];
    return Success(value);
  }

  @override
  Future<Result<AdminCategory>> lifecycle(
    AdminCategory expected,
    bool active,
    bool Function() current,
  ) async {
    writes++;
    final value = AdminCategory(
      expected.id,
      expected.name,
      active,
      expected.revision + 1,
    );
    values = [
      for (final c in values)
        if (c.id == value.id) value else c,
    ];
    return Success(value);
  }

  @override
  Future<Result<AdminRecordPage>> records(
    String? cursor,
    bool Function() current,
  ) async => const Success(AdminRecordPage([], null));
  @override
  Future<Result<AdminClassification>> classification(
    String id,
    bool Function() current,
  ) async => Success(selected);
  @override
  Future<Result<AdminClassification>> assign(
    AdminClassification expected,
    String? id,
    bool Function() current,
  ) async {
    writes++;
    selected = AdminClassification(
      expected.eventId,
      expected.revision + 1,
      id == null ? null : ManagedEventCategory(id, category.name, true),
    );
    return Success(selected);
  }
}

final class ValueHarness {
  ValueHarness(this.container, this.auth, this.repo, this.capability);
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final FakeValueAdmin repo;
  final FakeAdminInterestRepository capability;
  static Future<ValueHarness> start({
    bool allowed = true,
    FakeValueAdmin? repository,
  }) async {
    final auth = FakeAuthRepository(),
        repo = repository ?? FakeValueAdmin(),
        capability = FakeAdminInterestRepository()..allowed = allowed;
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        adminInterestRepositoryProvider.overrideWithValue(capability),
        adminRepositoryProvider.overrideWithValue(repo),
      ],
    );
    container.listen(authSessionProvider, (_, _) {});
    auth.emit(const AuthSessionAuthenticated(subject: 'admin'));
    await container.read(authSessionProvider.future);
    container.listen(adminInterestCapabilityProvider, (_, _) {});
    await container.pump();
    await container.read(adminInterestCapabilityProvider.notifier).refresh();
    await container.pump();
    return ValueHarness(container, auth, repo, capability);
  }

  AdminController controller([String key = 'categories:']) =>
      container.read(adminControllerProvider(key).notifier);
  AdminState state([String key = 'categories:']) =>
      container.read(adminControllerProvider(key));
  Future<void> close() async {
    container.dispose();
    await auth.close();
  }
}

void main() {
  test('unknown writes lock further mutations until explicit read; no automatic replay', () async {
    final h = await ValueHarness.start();
    addTearDown(h.close);
    await h.controller().load('categories');
    h.repo.unknown = true;
    expect(await h.controller().save(name: 'Music'), false);
    expect(h.state().writeUncertain, true);
    await h.controller().save(name: 'Music');
    expect(h.repo.writes, 1);
    await h.controller().load('categories');
    expect(h.state().writeUncertain, false);
    expect(h.repo.writes, 1);
  });
  test(
    'capability refresh and failed read preserve an uncertain write lock',
    () async {
      final h = await ValueHarness.start();
      addTearDown(h.close);
      await h.controller().load('categories');
      h.repo.unknown = true;
      await h.controller().save(name: 'Music');
      await h.container
          .read(adminInterestCapabilityProvider.notifier)
          .refresh();
      await h.container.pump();
      expect(h.state().writeUncertain, true);
      h.repo.pendingRead = Completer()
        ..complete(const Failure(adminUnavailable));
      await h.controller().load('categories');
      await h.controller().save(name: 'Music');
      expect(h.state().writeUncertain, true);
      expect(h.repo.writes, 1);
    },
  );
  test(
    'mutation acknowledgement is not success until independent exact readback',
    () async {
      final h = await ValueHarness.start();
      addTearDown(h.close);
      await h.controller().load('categories');
      final read = Completer<Result<List<AdminCategory>>>();
      h.repo.pendingRead = read;
      final saving = h.controller().save(name: 'Music');
      await h.container.pump();
      expect(h.state().busy, true);
      expect(h.state().notice, isNull);
      read.complete(Success(h.repo.values));
      expect(await saving, true);
      expect(h.state().notice, 'saved');
      expect(h.repo.categoryReads, 2);
    },
  );
  test(
    'same-UID replacement discards late mutation and resets Admin state',
    () async {
      final h = await ValueHarness.start();
      addTearDown(h.close);
      await h.controller().load('categories');
      final pending = Completer<Result<AdminCategory>>();
      h.repo.pendingWrite = pending;
      final saving = h.controller().save(name: 'Music');
      await h.container.pump();
      h.auth.emit(AuthSessionAuthenticated(subject: 'admin'));
      await h.container.pump();
      pending.complete(const Success(category));
      expect(await saving, false);
      expect(h.state().categories, isEmpty);
      expect(h.state().notice, isNull);
    },
  );
  test('capability revocation clears cached audit/category data', () async {
    final h = await ValueHarness.start();
    addTearDown(h.close);
    await h.controller().load('categories');
    expect(h.state().categories, isNotEmpty);
    h.capability.allowed = false;
    await h.container.read(adminInterestCapabilityProvider.notifier).refresh();
    await h.container.pump();
    expect(h.state().allowed, false);
    expect(h.state().categories, isEmpty);
    await h.controller().save(name: 'Music');
    expect(h.repo.writes, 0);
  });
  test(
    'ordinary session cannot read status or write classifications',
    () async {
      final h = await ValueHarness.start(allowed: false);
      addTearDown(h.close);
      await h.controller().load('status');
      await h.controller().save(name: 'Music');
      expect(h.repo.statusReads, 0);
      expect(h.repo.writes, 0);
    },
  );
  test('repository rejects unexpected sensitive fields and malformed category responses', () async {
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () async => const Success('token'),
      httpClient: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'eventCategories': [
              {
                'eventCategoryId': category.id,
                'displayName': 'Arts',
                'lifecycleState': 'active',
                'revision': 1,
                'privateUser': 'must not pass',
              },
            ],
          }),
          200,
        ),
      ),
    );
    expect(
      await BackendAdminRepository(client).categories(() => true),
      isA<Failure<List<AdminCategory>>>(),
    );
  });
  test(
    'repository guarded PATCH sends only approved precondition and field',
    () async {
      final requests = <http.Request>[];
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async => const Success('token'),
        httpClient: MockClient((request) async {
          requests.add(request);
          return http.Response(
            jsonEncode({
              'eventCategory': {
                'eventCategoryId': category.id,
                'displayName': 'Art',
                'lifecycleState': 'active',
                'revision': 2,
              },
            }),
            200,
          );
        }),
      );
      expect(
        await BackendAdminRepository(client)
            .rename(category, 'Art', () => true),
        isA<Success<AdminCategory>>(),
      );
      expect(requests.single.method, 'PATCH');
      expect(jsonDecode(requests.single.body), {
        'expectedRevision': 1,
        'displayName': 'Art',
      });
    },
  );
  Future<ValueHarness> page(
    WidgetTester tester,
    String name, {
    bool allowed = true,
    double textScale = 1,
    Brightness brightness = Brightness.light,
  }) async {
    final h = await ValueHarness.start(allowed: allowed);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: h.container,
        child: MaterialApp(
          theme: ThemeData(brightness: brightness),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(textScale)),
            child: child!,
          ),
          home: AdminPanelPage(
            page: name,
            eventId: name == 'classification' ? 'event-one' : null,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      await h.close();
    });
    return h;
  }

  testWidgets(
    'status page shows unknown instead of successful probe and refresh has zero writes',
    (tester) async {
      final h = await page(tester, 'status');
      expect(find.text('Unknown'), findsOneWidget);
      expect(h.repo.statusReads, 1);
      await tester.tap(find.byTooltip('Refresh'));
      await tester.pumpAndSettle();
      expect(h.repo.statusReads, 2);
      expect(h.repo.writes, 0);
    },
  );
  testWidgets(
    'category create keeps draft after unknown outcome and offers read recovery',
    (tester) async {
      final h = await page(tester, 'categories');
      h.repo.unknown = true;
      await tester.enterText(
        find.byKey(const Key('admin-category-name')),
        'New Art',
      );
      await tester.pump();
      await tester.tap(find.text('Create category'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-category-name')))
            .controller!
            .text,
        'New Art',
      );
      expect(find.text('Read current state'), findsOneWidget);
      expect(h.repo.writes, 1);
      await tester.tap(find.text('Read current state'));
      await tester.pumpAndSettle();
      expect(h.repo.writes, 1);
    },
  );
  testWidgets(
    'session replacement clears draft and invalidates old confirmation',
    (tester) async {
      final h = await page(tester, 'categories');
      await tester.enterText(
        find.byKey(const Key('admin-category-name')),
        'Old draft',
      );
      await tester.tap(find.text('Arts'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Deactivate'));
      await tester.tap(find.text('Deactivate'));
      await tester.pumpAndSettle();
      h.auth.emit(AuthSessionAuthenticated(subject: 'admin'));
      await tester.pumpAndSettle();
      await h.container
          .read(adminInterestCapabilityProvider.notifier)
          .refresh();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(h.repo.writes, 0);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-category-name')))
            .controller!
            .text,
        isEmpty,
      );
    },
  );
  testWidgets(
    'classification assign and clear confirm through independent readback',
    (tester) async {
      final h = await page(tester, 'classification');
      expect(find.text('Current: Unassigned'), findsOneWidget);
      await tester.tap(find.text('Arts'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(find.text('Current: Arts'), findsOneWidget);
      expect(h.repo.writes, 1);
      await tester.tap(find.text('Clear ENMORI category'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(find.text('Current: Unassigned'), findsOneWidget);
      expect(h.repo.writes, 2);
    },
  );
  testWidgets(
    'unauthorized direct page exposes no operation records or controls',
    (tester) async {
      final h = await page(tester, 'categories', allowed: false);
      expect(find.byKey(const Key('admin-category-name')), findsNothing);
      expect(h.repo.categoryReads, 0);
    },
  );
  testWidgets(
    'small dark screen at large text keeps controls reachable without overflow',
    (tester) async {
      tester.view.physicalSize = const Size(375, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await page(
        tester,
        'categories',
        textScale: 2,
        brightness: Brightness.dark,
      );
      await tester.ensureVisible(find.text('Create category'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
}
