import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/isolated_persona_pages.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/fakes.dart';

void main() {
  for (final supplied in [false, true]) {
    testWidgets('ordinary build omits Persona entry/routes (pages=$supplied)', (
      tester,
    ) async {
      final pages = _TestPages();
      final fixture = await _pumpApp(
        tester,
        pages: supplied ? pages : null,
        isolated: false,
      );
      expect(find.byKey(const Key('home-manage-personas')), findsNothing);
      expect(_personaPaths(fixture), isEmpty);
      for (final path in [
        AppRoutes.personas,
        AppRoutes.managePersonas,
        AppRoutes.newPersona,
        AppRoutes.editPersona('synthetic-persona'),
      ]) {
        fixture.router.go(path);
        await tester.pumpAndSettle();
        expect(pages.built, isEmpty);
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'isolated flag without complete pages omits Persona entry/routes',
    (tester) async {
      final fixture = await _pumpApp(tester);
      expect(find.byKey(const Key('home-manage-personas')), findsNothing);
      expect(_personaPaths(fixture), isEmpty);
      expect(find.byKey(const Key('home-friends')), findsOneWidget);
    },
  );

  testWidgets(
    'Home traverses all four surfaces and Back refreshes recommendations once',
    (tester) async {
      final pages = _TestPages();
      final fixture = await _pumpApp(tester, pages: pages);
      expect(_personaPaths(fixture), [
        '/personas',
        '/personas/manage',
        '/personas/new',
        '/personas/:personaId/edit',
      ]);
      expect(fixture.events.views.length, 1);
      await _tap(tester, 'home-manage-personas');
      expect(fixture.router.state.uri.path, AppRoutes.personas);
      await _tap(tester, 'test-manage');
      expect(fixture.router.state.uri.path, AppRoutes.managePersonas);
      await _tap(tester, 'test-create');
      expect(fixture.router.state.uri.path, AppRoutes.newPersona);
      await _tap(tester, 'test-back');
      expect(fixture.router.state.uri.path, AppRoutes.managePersonas);
      await _tap(tester, 'test-edit');
      expect(fixture.router.state.uri.path, '/personas/synthetic-persona/edit');
      expect(pages.lastEditId, 'synthetic-persona');
      await _tap(tester, 'test-back');
      await _tap(tester, 'test-back');
      await _tap(tester, 'test-back');
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(fixture.events.views.length, 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'edit ID is encoded once and delivered as one decoded parameter',
    (tester) async {
      final pages = _TestPages(editId: 'synthetic/id %');
      final fixture = await _pumpApp(tester, pages: pages);
      await _tap(tester, 'home-manage-personas');
      await _tap(tester, 'test-manage');
      await _tap(tester, 'test-edit');
      expect(pages.lastEditId, 'synthetic/id %');
      expect(
        fixture.router.state.uri.toString(),
        '/personas/synthetic%2Fid%20%25/edit',
      );
      // Transport/domain validation remains feature-owned. Navigation does not
      // interpret an ID as a second route or silently normalize it.
      expect(tester.takeException(), isNull);
    },
  );

  for (final gate in [
    RouterGateState.unauthenticated,
    RouterGateState.signInRequired,
    RouterGateState.onboardingRequired,
    RouterGateState.unavailable,
    RouterGateState.configurationUnavailable,
    RouterGateState.forbidden,
    RouterGateState.resolving,
  ]) {
    testWidgets('Persona route cannot bypass $gate', (tester) async {
      final pages = _TestPages();
      final fixture = await _pumpApp(tester, pages: pages, gate: gate);
      for (final path in [
        AppRoutes.personas,
        AppRoutes.managePersonas,
        AppRoutes.newPersona,
        AppRoutes.editPersona('synthetic-persona'),
      ]) {
        fixture.router.go(path);
        await _pumpFrames(tester);
      }
      expect(pages.built, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('account replacement removes old stack and old callbacks', (
    tester,
  ) async {
    final pages = _TestPages();
    final fixture = await _pumpApp(tester, pages: pages);
    await _tap(tester, 'home-manage-personas');
    await _tap(tester, 'test-manage');
    final oldCreate = pages.retainedCreate!;
    final oldRouter = fixture.router;
    fixture.subject = 'member-b';
    fixture.container.invalidate(currentAuthSubjectProvider);
    await _pumpFrames(tester);
    expect(fixture.router, isNot(same(oldRouter)));
    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(find.byKey(const Key('test-management')), findsNothing);
    oldCreate();
    await _pumpFrames(tester);
    expect(fixture.router.state.uri.path, AppRoutes.home);
    expect(tester.takeException(), isNull);
  });

  testWidgets('disposed page callback and auth-loss callback cannot navigate', (
    tester,
  ) async {
    final pages = _TestPages();
    final fixture = await _pumpApp(tester, pages: pages);
    await _tap(tester, 'home-manage-personas');
    final disposedManage = pages.retainedManage!;
    await _tap(tester, 'test-back');
    disposedManage();
    await _pumpFrames(tester);
    expect(fixture.router.state.uri.path, AppRoutes.home);

    await _tap(tester, 'home-manage-personas');
    final oldManage = pages.retainedManage!;
    fixture.gate = RouterGateState.signInRequired;
    fixture.container.invalidate(routerGateProvider);
    // The gate changed before its redirect frame; stale UI still cannot push.
    oldManage();
    await _pumpFrames(tester);
    expect(fixture.router.state.uri.path, AppRoutes.signIn);
    expect(find.byKey(const Key('test-management')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('form owns discard confirmation before invoking router Back', (
    tester,
  ) async {
    final pages = _TestPages(guardCreate: true);
    final fixture = await _pumpApp(tester, pages: pages);
    await _tap(tester, 'home-manage-personas');
    await _tap(tester, 'test-manage');
    await _tap(tester, 'test-create');
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(fixture.router.state.uri.path, AppRoutes.newPersona);
    await _tap(tester, 'test-back');
    expect(find.text('Discard unsaved changes?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(fixture.router.state.uri.path, AppRoutes.newPersona);
    await _tap(tester, 'test-back');
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    expect(fixture.router.state.uri.path, AppRoutes.managePersonas);
    expect(tester.takeException(), isNull);
  });

  testWidgets('route opened without a parent returns to overview', (
    tester,
  ) async {
    final pages = _TestPages();
    final fixture = await _pumpApp(tester, pages: pages);
    fixture.router.go(AppRoutes.editPersona('synthetic-persona'));
    await tester.pumpAndSettle();
    await _tap(tester, 'test-back');
    expect(fixture.router.state.uri.path, AppRoutes.personas);
    await _tap(tester, 'test-back');
    expect(fixture.router.state.uri.path, AppRoutes.home);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Manage Personas remains reachable on small enlarged-text Home', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final pages = _TestPages();
    await _pumpApp(
      tester,
      pages: pages,
      textScaler: const TextScaler.linear(2),
    );
    expect(
      MediaQuery.textScalerOf(
        tester.element(find.byKey(const Key('route-home'))),
      ).scale(10),
      20,
    );
    final semantics = tester.ensureSemantics();
    try {
      final action = find.byKey(const Key('home-manage-personas'));
      await tester.scrollUntilVisible(
        action,
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('route-home')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.ensureVisible(action);
      await tester.pumpAndSettle();
      expect(tester.getSemantics(action).label, 'Manage Personas');
      await _tap(tester, 'home-manage-personas');
      expect(find.byKey(const Key('test-overview')), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      semantics.dispose();
    }
  });
}

List<String> _personaPaths(_Fixture fixture) => fixture
    .router
    .configuration
    .routes
    .whereType<GoRoute>()
    .map((route) => route.path)
    .where((path) => path.startsWith('/personas'))
    .toList();

Future<_Fixture> _pumpApp(
  WidgetTester tester, {
  _TestPages? pages,
  bool isolated = true,
  RouterGateState gate = RouterGateState.authenticated,
  TextScaler? textScaler,
}) async {
  final fixture = _Fixture()..gate = gate;
  final container = ProviderContainer(
    overrides: [
      routerGateProvider.overrideWith((ref) => fixture.gate),
      currentAuthSubjectProvider.overrideWith((ref) => fixture.subject),
      authSessionProvider.overrideWith(
        (ref) => Stream.value(const AuthSessionUnauthenticated()),
      ),
      isolatedSlicesEnabledProvider.overrideWithValue(isolated),
      isolatedPersonaPagesProvider.overrideWithValue(pages?.builders),
      eventRecommendationRepositoryProvider.overrideWithValue(fixture.events),
    ],
  );
  fixture.container = container;
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: textScaler == null
          ? const EnmoriApp()
          : MediaQuery(
              data: MediaQueryData(textScaler: textScaler),
              child: const EnmoriApp(),
            ),
    ),
  );
  await _pumpFrames(tester);
  return fixture;
}

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.pump();
  if (key == 'home-manage-personas') {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('route-home')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _pumpFrames(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _Fixture {
  RouterGateState gate = RouterGateState.authenticated;
  String subject = 'member-a';
  late final ProviderContainer container;
  final events = FakeEventRecommendationRepository();
  GoRouter get router => container.read(appRouterProvider);
}

// Test-only surfaces validate assembly and callbacks, never product completion.
final class _TestPages {
  _TestPages({this.editId = 'synthetic-persona', this.guardCreate = false});
  final String editId;
  final bool guardCreate;
  final built = <String>[];
  String? lastEditId;
  VoidCallback? retainedManage;
  VoidCallback? retainedCreate;

  IsolatedPersonaPages get builders => IsolatedPersonaPages(
    overview: (context, {required onManage, required onBack}) {
      built.add('overview');
      retainedManage = onManage;
      return _surface('overview', [
        _button('manage', onManage),
        _button('back', onBack),
      ]);
    },
    management:
        (context, {required onCreate, required onEdit, required onBack}) {
          built.add('management');
          retainedCreate = onCreate;
          return _surface('management', [
            _button('create', onCreate),
            _button('edit', () => onEdit(editId)),
            _button('back', onBack),
          ]);
        },
    create: (context, {required onBack}) {
      built.add('create');
      return guardCreate
          ? _GuardedForm(onBack: onBack)
          : _surface('create', [_button('back', onBack)]);
    },
    edit: (context, {required personaId, required onBack}) {
      built.add('edit');
      lastEditId = personaId;
      return _surface('edit', [_button('back', onBack)]);
    },
  );
}

Widget _surface(String name, List<Widget> children) => Scaffold(
  key: Key('test-$name'),
  body: Column(children: children),
);

Widget _button(String key, VoidCallback action) =>
    TextButton(key: Key('test-$key'), onPressed: action, child: Text(key));

final class _GuardedForm extends StatefulWidget {
  const _GuardedForm({required this.onBack});
  final VoidCallback onBack;
  @override
  State<_GuardedForm> createState() => _GuardedFormState();
}

final class _GuardedFormState extends State<_GuardedForm> {
  bool allowPop = false;
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: allowPop,
    child: _surface('create', [
      _button('back', () async {
        final discard = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Discard unsaved changes?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Keep editing'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Discard'),
              ),
            ],
          ),
        );
        if (!mounted || discard != true) return;
        setState(() => allowPop = true);
        // PopScope must observe the new state before the permitted route pop.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onBack();
        });
      }),
    ]),
  );
}
