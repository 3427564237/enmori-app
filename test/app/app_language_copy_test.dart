import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/account/presentation/onboarding_page.dart';
import 'package:enmori/features/account/presentation/own_profile_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/auth/presentation/auth_email_page.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:enmori/features/auth/presentation/sign_in_page.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/presentation/weather_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

void main() {
  testWidgets(
    'changing device language keeps the unsaved server-settings draft',
    (tester) async {
      final language = ValueNotifier(const Locale('en'));
      addTearDown(language.dispose);
      final prefs = FakeAccountPreferences();
      await mount(
        tester,
        AccountPreferencesPage(
          view: PreferencesView.settings,
          languageSection: TextButton(
            key: const Key('fixture-language'),
            onPressed: () => language.value = const Locale('zh'),
            child: const Text('中文'),
          ),
        ),
        prefs: prefs,
        localeChanges: language,
      );
      await tap(tester, 'settings-home-weather');
      expect(find.text('Unsaved changes'), findsOneWidget);
      await tap(tester, 'fixture-language');
      expect(find.text('设置'), findsOneWidget);
      expect(find.text('有未保存的更改'), findsOneWidget);
      expect(
        tester
            .widget<SwitchListTile>(
              find.byKey(const Key('settings-home-weather')),
            )
            .value,
        isTrue,
      );
      expect(prefs.settingsSaveCount, 0);
      await tap(tester, 'settings-save');
      expect(prefs.settingsSaveCount, 1);
      expect(find.text('设置已保存。'), findsOneWidget);
    },
  );

  testWidgets(
    'AI settings keeps its focused scope without device-language section',
    (tester) async {
      await mount(
        tester,
        const AccountPreferencesPage(
          view: PreferencesView.settings,
          aiOnly: true,
          languageSection: Text('Language slot'),
        ),
      );
      expect(find.text('AI 设置'), findsOneWidget);
      expect(find.text('Language slot'), findsNothing);
      expect(find.byKey(const Key('settings-home-weather')), findsNothing);
      expect(find.byKey(const Key('settings-consent')), findsOneWidget);
    },
  );

  testWidgets(
    'Chinese settings saves independent choices and replaces success with unsaved feedback',
    (tester) async {
      final prefs = FakeAccountPreferences();
      await mount(
        tester,
        const AccountPreferencesPage(view: PreferencesView.settings),
        prefs: prefs,
      );
      expect(find.text('设置'), findsOneWidget);
      expect(find.text('新签到默认设置'), findsOneWidget);
      await tap(tester, 'settings-home-weather');
      await tap(tester, 'settings-save');
      expect(find.text('设置已保存。'), findsOneWidget);
      expect(prefs.settings.homeWeatherAuto, isTrue);
      expect(prefs.settings.defaultCheckInLocation, isFalse);
      expect(prefs.settings.defaultCheckInWeather, isFalse);
      expect(prefs.settings.consent, OptionalProcessingConsent.rejected);
      await tap(tester, 'settings-default-location');
      expect(find.text('设置已保存。'), findsNothing);
      expect(find.text('有未保存的更改'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'device language slot remains available when account settings fail',
    (tester) async {
      final prefs = FakeAccountPreferences();
      prefs.settingsReads.add(
        Future.value(
          const Failure(
            AppFailure(
              kind: AppFailureKind.serviceUnavailable,
              message: 'unavailable',
            ),
          ),
        ),
      );
      var used = false;
      await mount(
        tester,
        AccountPreferencesPage(
          view: PreferencesView.settings,
          languageSection: TextButton(
            onPressed: () => used = true,
            child: const Text('Language slot'),
          ),
        ),
        prefs: prefs,
      );
      expect(find.text('设置加载失败，请重试。'), findsOneWidget);
      await tester.tap(find.text('Language slot'));
      expect(used, isTrue);
      expect(prefs.settingsSaveCount, 0);
    },
  );

  testWidgets(
    'Chinese profile renders user content unchanged and shows saved audience',
    (tester) async {
      phone(tester);
      final prefs = FakeAccountPreferences()
        ..profile = const OwnProfile(
          username: 'member_a',
          displayName: 'River',
          visibility: ProfileVisibility.friendsOnly,
          revision: 4,
          details: ProfileDetails(
            bio: 'My own words stay as written.',
            affiliationType: AffiliationType.company,
            affiliationName: 'Example Studio',
            region: 'Singapore',
          ),
        );
      await mount(
        tester,
        OwnProfilePage(
          onEditInterests: () async {},
          onEditProfile: () async {},
          onOpenSettings: () async {},
          onOpenHistory: () {},
        ),
        prefs: prefs,
      );
      expect(find.text('我的资料'), findsOneWidget);
      expect(find.text('River'), findsOneWidget);
      expect(find.text('@member_a'), findsOneWidget);
      expect(find.text('My own words stay as written.'), findsOneWidget);
      expect(find.text('Example Studio'), findsOneWidget);
      expect(find.text('Singapore'), findsOneWidget);
      expect(find.text('仅好友可见的资料'), findsOneWidget);
      expect(find.byIcon(Icons.business_outlined), findsOneWidget);
      await preview(tester, 'profile-zh');
    },
  );

  testWidgets(
    'Chinese conflict review preserves user text and localizes field names',
    (tester) async {
      phone(tester);
      final prefs = FakeAccountPreferences();
      await mount(
        tester,
        const AccountPreferencesPage(view: PreferencesView.profile),
        prefs: prefs,
      );
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'My edit',
      );
      prefs.saveFailure = const AppFailure(
        kind: AppFailureKind.profileRevisionPreconditionFailed,
        message: 'conflict',
      );
      await tap(tester, 'profile-save');
      expect(find.text('这些信息已在其他位置更改，请读取最新版本后再保存。'), findsOneWidget);
      prefs.profile = const OwnProfile(
        username: 'member_a',
        displayName: 'Remote edit',
        visibility: ProfileVisibility.private,
        revision: 3,
      );
      await tap(tester, 'preferences-review');
      expect(find.textContaining('以下项目也在其他位置发生了变化：显示名称'), findsOneWidget);
      expect(find.text('My edit'), findsOneWidget);
      expect(find.textContaining('显示名称：Remote edit'), findsOneWidget);
      expect(prefs.profileRevisions, [0]);
      await preview(tester, 'recovery-zh');
    },
  );

  testWidgets(
    'Home, interest counts and weather presentation use Chinese without rewriting data',
    (tester) async {
      await mount(
        tester,
        HomeShellPage(
          socialStyle: true,
          onStartCheckIn: () {},
          onSeeAllEvents: () {},
        ),
      );
      expect(find.text('今天'), findsOneWidget);
      expect(find.text('新建签到'), findsOneWidget);
      await mount(tester, const InterestEditorPage());
      expect(find.text('我的兴趣'), findsOneWidget);
      expect(find.textContaining('已选 0 项'), findsOneWidget);
      await mount(
        tester,
        Scaffold(
          body: WeatherCard(
            snapshot: WeatherSnapshot(
              observedAt: DateTime.utc(2026, 10, 23),
              temperatureCelsius: 28.4,
              condition: WeatherCondition.partlyCloudy,
            ),
            openAttribution: (_) async => true,
          ),
        ),
      );
      expect(find.text('多云 · 28.4°C'), findsOneWidget);
      expect(find.text('天气数据由 Open-Meteo 提供'), findsOneWidget);
    },
  );

  testWidgets(
    'Chinese sign-in, registration, onboarding and email actions render actual labels',
    (tester) async {
      await mount(
        tester,
        SignInPage(onCreateAccount: () {}, onSucceeded: () {}),
      );
      await tap(tester, 'sign-in-submit');
      expect(find.text('请输入有效邮箱。'), findsOneWidget);
      expect(find.text('请输入密码。'), findsOneWidget);
      await mount(tester, const RegistrationPage());
      await tap(tester, 'r6-register-submit');
      expect(find.text('创建账号前请先同意使用条款。'), findsOneWidget);
      expect(find.textContaining('请先检查 3 项输入'), findsWidgets);
      await mount(tester, OnboardingPage(onCompleted: () {}));
      expect(find.text('设置用户名'), findsOneWidget);
      await mount(tester, const AuthEmailPage(resetPassword: true));
      expect(find.text('重置密码'), findsOneWidget);
      expect(find.text('发送重置链接'), findsOneWidget);
      await tap(tester, 'email-send');
      expect(find.text('当前环境不支持邮箱操作。'), findsOneWidget);
    },
  );

  for (final locale in ['en', 'zh']) {
    testWidgets(
      '$locale Profile and Settings render phone previews with real controls',
      (tester) async {
        phone(tester);
        final prefs = FakeAccountPreferences()
          ..profile = const OwnProfile(
            username: 'member_a',
            displayName: 'River',
            visibility: ProfileVisibility.friendsOnly,
            revision: 4,
            details: ProfileDetails(
              bio: 'Taking time for the little things.',
              affiliationType: AffiliationType.school,
              affiliationName: 'Example School',
              region: 'Singapore',
            ),
          );
        await mount(
          tester,
          OwnProfilePage(
            onEditInterests: () async {},
            onEditProfile: () async {},
            onOpenSettings: () async {},
            onOpenHistory: () {},
            onOpenFootprint: () {},
          ),
          prefs: prefs,
          locale: locale,
        );
        expect(find.text('River'), findsOneWidget);
        await preview(tester, 'profile-$locale');
        await mount(
          tester,
          const AccountPreferencesPage(view: PreferencesView.settings),
          prefs: prefs,
          locale: locale,
        );
        expect(find.byKey(const Key('settings-visibility')), findsOneWidget);
        await preview(tester, 'settings-$locale');
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final locale in ['en', 'zh']) {
    for (final size in [const Size(360, 640), const Size(640, 360)]) {
      testWidgets(
        '$locale editor supports 2x text, reduced motion and keyboard at $size',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          tester.platformDispatcher.textScaleFactorTestValue = 2;
          tester.platformDispatcher.accessibilityFeaturesTestValue =
              const FakeAccessibilityFeatures(disableAnimations: true);
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          addTearDown(
            tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
          );
          await mount(
            tester,
            const AccountPreferencesPage(view: PreferencesView.profile),
            locale: locale,
          );
          tester.view.viewInsets = FakeViewPadding(bottom: size.height / 3);
          addTearDown(tester.view.resetViewInsets);
          await tester.ensureVisible(
            find.byKey(const Key('profile-display-name')),
          );
          await tester.enterText(
            find.byKey(const Key('profile-display-name')),
            'River',
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(
            tester.getRect(find.byKey(const Key('profile-save'))).bottom,
            lessThanOrEqualTo(size.height - size.height / 3),
          );
          await tap(tester, 'profile-save');
          tester.view.resetViewInsets();
          await tester.pumpAndSettle();
          expect(
            find.byKey(const Key('preferences-save-success')),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

void phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

bool _previewFontsLoaded = false;
Future<void> loadPreviewFonts(WidgetTester tester) async {
  const output = String.fromEnvironment('ENMORI_APP_PREVIEW_DIR');
  if (output.isEmpty || _previewFontsLoaded) return;
  for (final (family, asset) in [
    (
      'Playfair Display',
      'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
    ),
    ('MaterialIcons', 'fonts/MaterialIcons-Regular.otf'),
  ]) {
    await tester.runAsync(
      () => (FontLoader(family)..addFont(rootBundle.load(asset))).load(),
    );
  }
  final path = Platform.environment['ENMORI_CAPTURE_FONT'];
  if (path != null) {
    await tester.runAsync(() async {
      final bytes = await File(path).readAsBytes();
      await (FontLoader(
        'Roboto',
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    });
  }
  _previewFontsLoaded = true;
}

Future<void> mount(
  WidgetTester tester,
  Widget child, {
  FakeAccountPreferences? prefs,
  String locale = 'zh',
  ValueNotifier<Locale>? localeChanges,
}) async {
  await loadPreviewFonts(tester);
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pumpAndSettle();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
        ),
        accountPreferencesRepositoryProvider.overrideWithValue(
          prefs ?? FakeAccountPreferences(),
        ),
        accountRepositoryProvider.overrideWithValue(
          FakeAccountRepository()
            ..statusResult = Success(
              OnboardingCompleted(testAccount(username: 'member_a')),
            ),
        ),
        interestRepositoryProvider.overrideWithValue(FakeInterestRepository()),
      ],
      child: RepaintBoundary(
        key: const Key('app-preview'),
        child: localeChanges == null
            ? _app(child, Locale(locale))
            : ValueListenableBuilder<Locale>(
                valueListenable: localeChanges,
                builder: (context, value, _) => _app(child, value),
              ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Widget _app(Widget child, Locale locale) => MaterialApp(
  theme: _previewTheme(),
  debugShowCheckedModeBanner: false,
  locale: locale,
  supportedLocales: const [Locale('en'), Locale('zh')],
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: child,
);

// Real devices provide system CJK fallback. Flutter's test font collection
// does not; use the opt-in host font alias for fixture rasters only.
ThemeData _previewTheme() {
  final theme = enmoriTheme();
  const output = String.fromEnvironment('ENMORI_APP_PREVIEW_DIR');
  if (output.isEmpty) return theme;
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontFamilyFallback: const ['Roboto']),
    appBarTheme: theme.appBarTheme.copyWith(
      titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
        fontFamilyFallback: const ['Roboto'],
      ),
    ),
  );
}

Future<void> tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

// Opt-in rendered review artifacts, produced only with synthetic test data.
Future<void> preview(WidgetTester tester, String name) async {
  const output = String.fromEnvironment('ENMORI_APP_PREVIEW_DIR');
  if (output.isEmpty) return;
  await tester.runAsync(() async {
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const Key('app-preview')),
    );
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
