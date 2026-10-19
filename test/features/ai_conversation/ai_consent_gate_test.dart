import 'dart:async';

import 'package:flutter/material.dart';
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
  testWidgets(
    'initial refusal hides chat; consent save and account replacement recheck access',
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
      expect(find.text('AI Limited'), findsOneWidget);
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
      expect(find.text('AI Limited'), findsOneWidget);
    },
  );
}
