import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/presentation/enmori_localizations.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/language/data/platform_app_language_repository.dart';
import 'package:enmori/features/language/domain/app_language_repository.dart';
import 'package:enmori/features/language/language_providers.dart';
import 'package:enmori/features/language/presentation/app_language_control.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  const repository = PlatformAppLanguageRepository();
  String? stored;
  final calls = <String>[];

  setUp(() {
    stored = null;
    calls.clear();
    messenger.setMockMethodCallHandler(PlatformAppLanguageRepository.channel, (
      call,
    ) async {
      calls.add(call.method);
      if (call.method == 'readLanguage') return stored;
      stored = (call.arguments as Map)['language'] as String;
      return true;
    });
  });
  tearDown(
    () => messenger.setMockMethodCallHandler(
      PlatformAppLanguageRepository.channel,
      null,
    ),
  );

  test('legacy devices keep English; saved codes are explicit and invalid storage fails', () async {
    expect(
      (await repository.read() as Success<AppLanguage>).value,
      AppLanguage.english,
    );
    stored = 'zh';
    expect(
      (await repository.read() as Success<AppLanguage>).value,
      AppLanguage.chinese,
    );
    stored = 'not-a-supported-code';
    expect(await repository.read(), isA<Failure<AppLanguage>>());
  });

  test(
    'save requires platform acknowledgement and matching readback',
    () async {
      expect(
        (await repository.save(
          AppLanguage.chinese,
        ) as Success<AppLanguage>).value,
        AppLanguage.chinese,
      );
      expect(calls, ['writeLanguage', 'readLanguage']);
      messenger.setMockMethodCallHandler(
        PlatformAppLanguageRepository.channel,
        (call) async => call.method == 'writeLanguage' ? true : 'en',
      );
      expect(
        await repository.save(AppLanguage.chinese),
        isA<Failure<AppLanguage>>(),
      );
      messenger.setMockMethodCallHandler(
        PlatformAppLanguageRepository.channel,
        (call) async => false,
      );
      expect(
        await repository.save(AppLanguage.chinese),
        isA<Failure<AppLanguage>>(),
      );
    },
  );

  testWidgets(
    'confirmed choice translates app and Material controls without replacing the route',
    (tester) async {
      final fixture = await _start(tester);
      expect(find.text('Home fixture'), findsOneWidget);
      final originalRouter = fixture.container.read(appRouterProvider);
      await fixture.container
          .read(appLanguageProvider.notifier)
          .select(AppLanguage.chinese);
      await tester.pumpAndSettle();
      expect(find.text('首页示例'), findsOneWidget);
      expect(find.text('返回'), findsOneWidget);
      expect(
        identical(fixture.container.read(appRouterProvider), originalRouter),
        isTrue,
      );
      expect(originalRouter.state.uri.path, '/fixture');
      expect(stored, 'zh');
      await fixture.dispose(tester);

      final restarted = await _start(tester);
      expect(
        restarted.container.read(appLanguageProvider).language,
        AppLanguage.chinese,
      );
      expect(find.text('首页示例'), findsOneWidget);
      await restarted.dispose(tester);
    },
  );

  testWidgets(
    'pending and unconfirmed saves keep the prior selection and never retry a write',
    (tester) async {
      final write = Completer<bool>();
      var writes = 0;
      messenger.setMockMethodCallHandler(
        PlatformAppLanguageRepository.channel,
        (call) async {
          if (call.method == 'readLanguage') return stored;
          writes++;
          return write.future;
        },
      );
      final fixture = await _start(tester);
      final command = fixture.container
          .read(appLanguageProvider.notifier)
          .select(AppLanguage.chinese);
      await tester.pump();
      var dropdown = tester.widget<DropdownButton<AppLanguage>>(
        find.byKey(const Key('app-language-choice')),
      );
      expect(dropdown.value, AppLanguage.english);
      expect(dropdown.onChanged, isNull);
      await fixture.container
          .read(appLanguageProvider.notifier)
          .select(AppLanguage.chinese);
      expect(writes, 1);
      write.complete(false);
      await command;
      await tester.pumpAndSettle();
      dropdown = tester.widget<DropdownButton<AppLanguage>>(
        find.byKey(const Key('app-language-choice')),
      );
      expect(dropdown.value, AppLanguage.english);
      expect(find.text('Reload saved language'), findsOneWidget);
      expect(find.text('Home fixture'), findsOneWidget);
      stored = 'zh'; // Explicit read discovers a platform outcome; it sends no write.
      await tester.tap(find.text('Reload saved language'));
      await tester.pumpAndSettle();
      expect(find.text('首页示例'), findsOneWidget);
      expect(writes, 1);
      await fixture.dispose(tester);
    },
  );

  testWidgets(
    'language control fits phone and large text landscape in Chinese',
    (tester) async {
      stored = 'zh';
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      for (final size in [const Size(375, 812), const Size(812, 375)]) {
        tester.view.physicalSize = size;
        final fixture = await _start(tester, scale: 2);
        expect(find.text('语言'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await fixture.dispose(tester);
      }
    },
  );
}

Future<_Fixture> _start(WidgetTester tester, {double scale = 1}) async {
  final router = GoRouter(
    initialLocation: '/fixture',
    routes: [
      GoRoute(
        path: '/fixture',
        builder: (context, state) => Scaffold(
          body: SafeArea(
            child: MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(scale),
                disableAnimations: true,
              ),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(context.tr('Home fixture', '首页示例')),
                  Text(MaterialLocalizations.of(context).backButtonTooltip),
                  const AppLanguageControl(),
                ],
              ),
            ),
          ),
        ),
      ),
    ],
  );
  final container = ProviderContainer(
    overrides: [
      appRouterProvider.overrideWithValue(router),
      authSessionProvider.overrideWithValue(
        const AsyncData(AuthSessionUnauthenticated()),
      ),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  await tester.pumpAndSettle();
  return _Fixture(container, router);
}

final class _Fixture {
  _Fixture(this.container, this.router);
  final ProviderContainer container;
  final GoRouter router;
  Future<void> dispose(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    container.dispose();
    router.dispose();
    await tester.pump();
  }
}
