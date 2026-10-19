import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_email_repository.dart';
import 'package:enmori/features/auth/presentation/auth_email_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Email implements AuthEmailRepository {
  int sends = 0;
  bool verified = false;
  Completer<Result<void>>? pending;
  @override
  Future<Result<bool>> readEmailVerified() async => Success(verified);
  @override
  Future<Result<void>> sendVerificationEmail() async {
    sends++;
    return pending?.future ?? const Success(null);
  }

  @override
  Future<Result<void>> sendPasswordResetEmail(String email) async {
    sends++;
    return pending?.future ?? const Success(null);
  }
}

void main() {
  testWidgets(
    'verification prevents double send, reports failure, then checks link result',
    (tester) async {
      final email = _Email()..pending = Completer<Result<void>>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [authEmailRepositoryProvider.overrideWithValue(email)],
          child: const MaterialApp(home: AuthEmailPage()),
        ),
      );
      await tester.tap(find.byKey(const Key('email-send')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('email-send')));
      expect(email.sends, 1);
      email.pending!.complete(
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'private vendor detail',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Could not complete'), findsOneWidget);
      expect(find.textContaining('private vendor'), findsNothing);
      email.verified = true;
      await tester.tap(find.byKey(const Key('email-check')));
      await tester.pumpAndSettle();
      expect(find.text('Email verified.'), findsOneWidget);
    },
  );
  testWidgets('reset validates email, sends once and returns to sign in', (
    tester,
  ) async {
    final email = _Email();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authEmailRepositoryProvider.overrideWithValue(email)],
        child: MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => const AuthEmailPage(resetPassword: true),
                  ),
                ),
                child: const Text('Sign in'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('email-send')));
    await tester.pump();
    expect(email.sends, 0);
    await tester.enterText(
      find.byKey(const Key('reset-email')),
      'test@example.invalid',
    );
    await tester.tap(find.byKey(const Key('email-send')));
    await tester.pumpAndSettle();
    expect(email.sends, 1);
    expect(find.textContaining('If this email has an account'), findsOneWidget);
    await tester.tap(find.text('Back to sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsOneWidget);
  });
}
