import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/auth/presentation/sign_in_page.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'corrected sign-in errors clear and keyboard submit cannot duplicate a pending call',
    (tester) async {
      final auth = FakeAuthRepository()
        ..pendingSignIn = Completer<Result<void>>();
      addTearDown(auth.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [authRepositoryProvider.overrideWithValue(auth)],
          child: MaterialApp(
            home: SignInPage(onCreateAccount: () {}, onSucceeded: () {}),
          ),
        ),
      );
      await tester.tap(find.byKey(const Key('sign-in-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email.'), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('sign-in-email')),
        'test@example.invalid',
      );
      await tester.enterText(
        find.byKey(const Key('sign-in-password')),
        'synthetic',
      );
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email.'), findsNothing);
      expect(find.text('Enter your password.'), findsNothing);
      final submit = tester
          .widget<TextField>(
            find.descendant(
              of: find.byKey(const Key('sign-in-password')),
              matching: find.byType(TextField),
            ),
          )
          .onSubmitted!;
      submit('synthetic');
      submit('synthetic');
      await tester.pump();
      expect(auth.signInCount, 1);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('sign-in-email')))
            .enabled,
        isFalse,
      );
      auth.pendingSignIn!.complete(const Success(null));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  for (final skip in [false, true]) {
    testWidgets(
      'interest ${skip ? 'Skip' : 'Back'} keeps a draft until explicit discard',
      (tester) async {
        final repo = FakeInterestRepository();
        var skipped = 0;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [interestRepositoryProvider.overrideWithValue(repo)],
            child: MaterialApp(
              home: Builder(
                builder: (context) => Scaffold(
                  body: TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => InterestEditorPage(
                          onSkip: skip
                              ? () {
                                  skipped++;
                                  Navigator.of(context).pop();
                                }
                              : null,
                        ),
                      ),
                    ),
                    child: const Text('Open'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final option = find.byKey(const Key('interest-option-tag-art'));
        await tester.ensureVisible(option);
        await tester.tap(option);
        await tester.pump();
        Future<void> leave() async {
          if (skip) {
            await tester.tap(find.text('Skip for now'));
          } else {
            await tester.pageBack();
          }
          await tester.pumpAndSettle();
        }

        await leave();
        expect(find.text('Discard interest changes?'), findsOneWidget);
        await tester.tap(find.text('Keep editing'));
        await tester.pumpAndSettle();
        expect(tester.widget<CheckboxListTile>(option).value, isTrue);
        expect(repo.savedIds, isEmpty);
        await leave();
        await tester.tap(find.text('Discard'));
        await tester.pumpAndSettle();
        expect(find.text('Open'), findsOneWidget);
        expect(skipped, skip ? 1 : 0);
        expect(repo.savedIds, isEmpty);
      },
    );
  }

  testWidgets('returning to the saved selection does not warn on back', (
    tester,
  ) async {
    final repo = FakeInterestRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [interestRepositoryProvider.overrideWithValue(repo)],
        child: MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const InterestEditorPage(),
                ),
              ),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('interest-option-tag-art')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('interest-option-tag-art')));
    await tester.pump();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Open'), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
  });
  testWidgets(
    'leaving an in-flight interest save never cancels or resubmits it',
    (tester) async {
      final repo = FakeInterestRepository()..pendingReplace = Completer();
      final pending = repo.pendingReplace!;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [interestRepositoryProvider.overrideWithValue(repo)],
          child: MaterialApp(
            home: Builder(
              builder: (context) => TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const InterestEditorPage(),
                  ),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('interest-save')));
      await tester.pump();
      await tester.pageBack();
      await tester.pump(const Duration(milliseconds: 400));
      expect(
        find.textContaining('Leaving will not cancel it.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Leave'));
      await tester.pumpAndSettle();
      expect(find.text('Open'), findsOneWidget);
      expect(repo.savedIds, hasLength(1));
      pending.complete(
        const Success(InterestSelection(interestTags: [], revision: 1)),
      );
      await tester.pumpAndSettle();
      expect(find.text('Open'), findsOneWidget);
      expect(repo.savedIds, hasLength(1));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same-UID replacement dismisses only the previous interest exit dialog',
    (tester) async {
      final auth = FakeAuthRepository();
      final repo = FakeInterestRepository();
      final scope = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          interestRepositoryProvider.overrideWithValue(repo),
        ],
      );
      addTearDown(scope.dispose);
      addTearDown(auth.close);
      scope.listen(authSessionProvider, (_, _) {});
      auth.emit(AuthSessionAuthenticated(subject: 'owner'));
      await scope.read(authSessionProvider.future);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: scope,
          child: MaterialApp(home: InterestEditorPage(onSkip: () {})),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('interest-option-tag-art')),
      );
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.pump();
      await tester.tap(find.text('Skip for now'));
      await tester.pumpAndSettle();
      expect(find.text('Discard interest changes?'), findsOneWidget);
      auth.emit(AuthSessionAuthenticated(subject: 'owner'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('0 of 10 selected'), findsOneWidget);
      expect(repo.savedIds, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
