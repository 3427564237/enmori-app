import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_consent_gate.dart';

import '../../support/fakes.dart';
import '../../support/fake_account_preferences.dart';

void main() {
  testWidgets('OpenAI requires its own grant and withdrawal hides chat', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    final prefs = FakeAccountPreferences()
      ..settings = const OwnSettings(
        checkInVisibility: CheckInVisibility.private,
        consent: OptionalProcessingConsent.accepted,
        revision: 1,
        cloudAiConsent: CloudAiConsent.accepted,
      );
    addTearDown(auth.close);
    var openedSettings = false;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountPreferencesRepositoryProvider.overrideWithValue(prefs),
          aiClientProcessingProvider.overrideWithValue(
            AiClientProcessing.openaiCloud,
          ),
        ],
        child: MaterialApp(
          home: AiConsentGate(
            onOpenSettings: () {
              openedSettings = true;
            },
            navigationBar: const SizedBox(),
            child: const Text('Cloud chat contents'),
          ),
        ),
      ),
    );
    await tester.pump();
    auth.emit(AuthSessionAuthenticated(subject: 'synthetic-openai-member'));
    await tester.pumpAndSettle();
    expect(find.text('Cloud chat contents'), findsNothing);
    expect(find.textContaining('OpenAI processing'), findsOneWidget);
    await tester.tap(find.text('Open settings'));
    expect(openedSettings, isTrue);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(AiConsentGate)),
    );
    final controller = container.read(
      accountPreferencesControllerProvider(PreferencesView.settings).notifier,
    );
    await controller.saveSettings(
      CheckInVisibility.private,
      OptionalProcessingConsent.accepted,
      cloudAiConsent: CloudAiConsent.openaiAccepted,
    );
    await tester.pumpAndSettle();
    expect(find.text('Cloud chat contents'), findsOneWidget);
    await controller.saveSettings(
      CheckInVisibility.private,
      OptionalProcessingConsent.accepted,
      cloudAiConsent: CloudAiConsent.openaiDeclined,
    );
    await tester.pumpAndSettle();
    expect(find.text('Cloud chat contents'), findsNothing);
    expect(find.textContaining('OpenAI processing'), findsOneWidget);
  });
  for (final language in ['en', 'zh']) {
    testWidgets(
      'initial refusal hides chat; consent save and account replacement recheck access in $language',
      (tester) async {
        final auth = FakeAuthRepository();
        final prefs = FakeAccountPreferences();
        addTearDown(auth.close);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(auth),
              accountPreferencesRepositoryProvider.overrideWithValue(prefs),
            ],
            child: MaterialApp(
              locale: Locale(language),
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              supportedLocales: const [Locale('en'), Locale('zh')],
              home: AiConsentGate(
                onOpenSettings: () {},
                navigationBar: const SizedBox(),
                child: const Scaffold(body: Text('Chat contents')),
              ),
            ),
          ),
        );
        await tester.pump();
        auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
        await tester.pumpAndSettle();
        expect(
          find.text(language == 'zh' ? 'AI 功能受限' : 'AI Limited'),
          findsOneWidget,
        );
        expect(find.text('Chat contents'), findsNothing);
        final container = ProviderScope.containerOf(
          tester.element(find.byType(AiConsentGate)),
        );
        await container
            .read(
              accountPreferencesControllerProvider(PreferencesView.settings)
                  .notifier,
            )
            .saveSettings(
              CheckInVisibility.private,
              OptionalProcessingConsent.accepted,
            );
        await tester.pumpAndSettle();
        expect(find.text('Chat contents'), findsOneWidget);
        final pending = Completer<Result<OwnSettings>>();
        prefs.settingsReads.add(pending.future);
        auth.emit(AuthSessionAuthenticated(subject: 'member-b'));
        await tester.pump();
        await tester.pump();
        expect(find.text('Chat contents'), findsNothing);
        pending.complete(
          const Success(
            OwnSettings(
              checkInVisibility: CheckInVisibility.private,
              consent: OptionalProcessingConsent.rejected,
              revision: 0,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(language == 'zh' ? 'AI 功能受限' : 'AI Limited'),
          findsOneWidget,
        );
      },
    );
  }
}
