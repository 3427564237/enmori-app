import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/language/data/platform_app_language_repository.dart';
import 'package:enmori/features/language/domain/app_language_repository.dart';
import 'package:enmori/features/language/language_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  String? savedLanguage;
  setUp(() {
    savedLanguage = null;
    messenger.setMockMethodCallHandler(PlatformAppLanguageRepository.channel, (
      call,
    ) async {
      if (call.method == 'readLanguage') return savedLanguage;
      savedLanguage = (call.arguments as Map)['language'] as String;
      return true;
    });
  });
  tearDown(
    () => messenger.setMockMethodCallHandler(
      PlatformAppLanguageRepository.channel,
      null,
    ),
  );

  testWidgets(
    'actual Settings keeps device language usable during account load and failure',
    (tester) async {
      final pending = Completer<Result<OwnSettings>>();
      final preferences = FakeAccountPreferences()
        ..settingsReads.add(pending.future);
      final container = await _start(tester, preferences);
      final router = container.read(appRouterProvider);
      final dropdown = find.byKey(const Key('app-language-choice'));
      expect(dropdown, findsOneWidget);
      await tester.tap(dropdown);
      await tester.pump(const Duration(milliseconds: 350));
      await tester.tap(find.text('简体中文').last);
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();
      expect(savedLanguage, 'zh');
      expect(find.text('设置'), findsOneWidget);
      expect(identical(container.read(appRouterProvider), router), isTrue);
      expect(router.state.uri.path, AppRoutes.settings);

      pending.complete(
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'The service is temporarily unavailable.',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('preferences-error')), findsOneWidget);
      expect(dropdown, findsOneWidget);
      await tester.tap(dropdown);
      await tester.pumpAndSettle();
      await tester.tap(find.text('English').last);
      await tester.pumpAndSettle();
      expect(find.text('Settings'), findsOneWidget);
      expect(preferences.settingsReadCount, 1);
      expect(preferences.settingsSaveCount, 0);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      container.dispose();
    },
  );

  testWidgets(
    'global language change preserves a Settings draft without saving it',
    (tester) async {
      final preferences = FakeAccountPreferences();
      final container = await _start(tester, preferences);
      await tester.pumpAndSettle();
      final toggle = find.byKey(const Key('settings-default-location'));
      await tester.ensureVisible(toggle);
      await tester.tap(toggle);
      await tester.pumpAndSettle();
      expect(tester.widget<SwitchListTile>(toggle).value, isTrue);
      await container
          .read(appLanguageProvider.notifier)
          .select(AppLanguage.chinese);
      await tester.pumpAndSettle();
      expect(tester.widget<SwitchListTile>(toggle).value, isTrue);
      expect(find.text('设置'), findsOneWidget);
      expect(preferences.settingsSaveCount, 0);
      expect(preferences.settingsReadCount, 1);
      expect(preferences.settings.defaultCheckInLocation, isFalse);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      container.dispose();
    },
  );
}

Future<ProviderContainer> _start(
  WidgetTester tester,
  FakeAccountPreferences preferences,
) async {
  final container = ProviderContainer(
    overrides: [
      authSessionProvider.overrideWithValue(
        const AsyncData(AuthSessionAuthenticated(subject: 'language-fixture')),
      ),
      routerGateProvider.overrideWithValue(RouterGateState.authenticated),
      accountPreferencesRepositoryProvider.overrideWithValue(preferences),
    ],
  );
  container.read(appRouterProvider).go(AppRoutes.settings);
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  for (var frame = 0; frame < 4; frame++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  return container;
}
