import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:enmori/features/auth/presentation/sign_in_page.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

void main() {
  for (final language in ['en', 'zh']) {
    for (final page in ['sign-in', 'registration', 'interests', 'settings']) {
      testWidgets(
        '$page visible controls have labels and Android tap targets ($language)',
        (tester) async {
          tester.view.physicalSize = const Size(375, 812);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final semantics = tester.ensureSemantics();
          try {
            final auth = FakeAuthRepository();
            addTearDown(auth.close);
            final prefs = FakeAccountPreferences();
            await tester.pumpWidget(
              ProviderScope(
                overrides: [
                  authRepositoryProvider.overrideWithValue(auth),
                  authSessionProvider.overrideWithValue(
                    const AsyncData(
                      AuthSessionAuthenticated(subject: 'audit-owner'),
                    ),
                  ),
                  interestRepositoryProvider.overrideWithValue(
                    FakeInterestRepository(),
                  ),
                  accountPreferencesRepositoryProvider.overrideWithValue(prefs),
                ],
                child: MaterialApp(
                  theme: enmoriTheme(),
                  locale: Locale(language),
                  supportedLocales: const [Locale('en'), Locale('zh')],
                  localizationsDelegates: GlobalMaterialLocalizations.delegates,
                  home: switch (page) {
                    'sign-in' => SignInPage(
                      onCreateAccount: () {},
                      onSucceeded: () {},
                    ),
                    'registration' => RegistrationPage(onSignIn: () {}),
                    'interests' => const InterestEditorPage(),
                    _ => const AccountPreferencesPage(
                      view: PreferencesView.settings,
                    ),
                  },
                ),
              ),
            );
            await tester.pumpAndSettle();
            final landmark = switch (page) {
              'sign-in' => 'sign-in-email',
              'registration' => 'r6-register-email',
              'interests' => 'interest-option-tag-art',
              _ => 'settings-visibility',
            };
            expect(find.byKey(Key(landmark)), findsOneWidget);
            await expectLater(
              tester,
              meetsGuideline(androidTapTargetGuideline),
            );

            // Check every viewport rather than assuming off-screen controls are
            // covered by a single semantics snapshot. Measure complete widgets
            // after scrolling: a clipped semantics rect at the AppBar edge can
            // otherwise look like a small target even when its full hit area is
            // larger than 48dp.
            final scrollable = find.byType(Scrollable).first;
            final position = tester.state<ScrollableState>(scrollable).position;
            for (double offset = 0; ; offset += 350) {
              position.jumpTo(offset.clamp(0, position.maxScrollExtent));
              await tester.pumpAndSettle();
              for (final control
                  in find
                      .byWidgetPredicate(
                        (widget) =>
                            widget is ButtonStyleButton ||
                            widget is IconButton ||
                            widget is SwitchListTile ||
                            widget is FilterChip,
                      )
                      .evaluate()) {
                final size = tester.getSize(
                  find.byElementPredicate(
                    (element) => identical(element, control),
                  ),
                );
                expect(
                  size.width,
                  greaterThanOrEqualTo(48),
                  reason: '$page ${control.widget}',
                );
                expect(
                  size.height,
                  greaterThanOrEqualTo(48),
                  reason: '$page ${control.widget}',
                );
              }
              await expectLater(
                tester,
                meetsGuideline(labeledTapTargetGuideline),
              );
              expect(tester.takeException(), isNull);
              if (offset >= position.maxScrollExtent) break;
            }
            expect(prefs.settingsSaveCount, 0);
            expect(prefs.profileNames, isEmpty);
          } finally {
            semantics.dispose();
          }
        },
      );
    }
  }
}
