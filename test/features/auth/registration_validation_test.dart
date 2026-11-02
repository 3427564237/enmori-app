import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fakes.dart';
import '../../../tool/recommendation_profile_usability_preview.dart' as preview;

void main() {
  testWidgets('area preview keeps its manual failure recovery', (tester) async {
    preview.main();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open production recommendation profile'));
    await tester.pumpAndSettle();
    expect(find.text('Areas couldn’t be loaded.'), findsOneWidget);
    expect(find.text('TM'), findsOneWidget);
    await tester.tap(find.text('Retry areas'));
    await tester.pumpAndSettle();
    expect(find.text('Tampines'), findsOneWidget);
    expect(find.text('Areas couldn’t be loaded.'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });

  testWidgets(
    'offline registration preview uses its independent fake session',
    (tester) async {
      preview.main();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open offline registration'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('route-register')),
        findsOneWidget,
        reason: find
            .byType(Text)
            .evaluate()
            .map((e) => (e.widget as Text).data)
            .join(' | '),
      );
      expect(find.byKey(const Key('r6-register-email')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    },
  );

  testWidgets(
    'after submission registration field errors and summary follow edits without losing focus',
    (tester) async {
      tester.view.physicalSize = const Size(320, 680);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final auth = FakeAuthRepository();
      addTearDown(auth.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [authRepositoryProvider.overrideWithValue(auth)],
          child: const MaterialApp(home: RegistrationPage()),
        ),
      );
      final email = find.byKey(const Key('r6-register-email'));
      final password = find.byKey(const Key('r6-register-password'));
      final confirmation = find.byKey(
        const Key('r6-register-confirm-password'),
      );
      String? error(Finder field) =>
          tester.state<FormFieldState<String>>(field).errorText;

      await tester.enterText(email, 'invalid-email');
      await tester.pumpAndSettle();
      expect(error(email), isNull);
      expect(
        find.byKey(const Key('sp01-register-error-summary')),
        findsNothing,
      );
      await tester.enterText(email, '');
      await tester.ensureVisible(find.byKey(const Key('r6-register-submit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('r6-register-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Review 3 fields before continuing.'), findsOneWidget);
      expect(error(email), 'Enter a valid email.');

      await tester.enterText(
        email,
        'very.long.synthetic.registration.address@example.invalid',
      );
      await tester.pumpAndSettle();
      expect(find.text('Review 2 fields before continuing.'), findsOneWidget);
      expect(
        find.byKey(const Key('sp01-register-error-email-link')),
        findsNothing,
      );
      expect(error(email), isNull);
      expect(
        tester
            .widget<EditableText>(
              find.descendant(of: email, matching: find.byType(EditableText)),
            )
            .focusNode
            .hasFocus,
        isTrue,
      );

      await tester.enterText(email, 'invalid-again');
      await tester.pumpAndSettle();
      expect(find.text('Review 3 fields before continuing.'), findsOneWidget);
      expect(error(email), 'Enter a valid email.');
      await tester.enterText(email, 'sample@example.invalid');
      await tester.enterText(password, 'SampleOnly123');
      await tester.enterText(confirmation, 'SampleOnly123');
      await tester.pumpAndSettle();
      expect(error(email), isNull);
      expect(error(password), isNull);
      expect(error(confirmation), isNull);
      expect(
        find.byKey(const Key('sp01-register-error-summary')),
        findsNothing,
      );

      await tester.enterText(password, 'SampleOnly456');
      await tester.pumpAndSettle();
      expect(error(confirmation), 'Passwords must match.');
      expect(find.text('Review 1 fields before continuing.'), findsOneWidget);
      expect(auth.registerCount, 0);
      expect(tester.takeException(), isNull);
    },
  );
}
