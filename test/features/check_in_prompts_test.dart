import 'dart:async';

import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'prompt creates editable unsaved text, preserves existing draft and clears on account replacement',
    (tester) async {
      final repository = FakeCheckInRepository();
      final sessions = StreamController<AuthSession>.broadcast();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
            checkInRepositoryProvider.overrideWithValue(repository),
          ],
          child: const MaterialApp(
            home: CheckInComposerPage(socialStyle: true),
          ),
        ),
      );
      await tester.pump();
      sessions.add(const AuthSessionAuthenticated(subject: 'a'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('check-in-prompt-joy')));
      await tester.pumpAndSettle();
      final input = find.byKey(const Key('r6-check-in-note'));
      expect(
        tester.widget<TextField>(input).controller!.text,
        contains('made me smile'),
      );
      expect(repository.createdNotes, isEmpty);
      await tester.enterText(input, 'My own words');
      await tester.pump();
      expect(find.byKey(const Key('check-in-prompt-joy')), findsNothing);
      expect(repository.createdNotes, isEmpty);
      sessions.add(const AuthSessionAuthenticated(subject: 'b'));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.text, isEmpty);
      expect(find.byKey(const Key('check-in-prompt-joy')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      await sessions.close();
    },
  );
}
