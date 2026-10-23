import 'dart:async';
import 'dart:convert';

import 'package:enmori/features/account/content_access.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'friend_activity_display_test.dart' show Harness, event;

void main() {
  testWidgets(
    'Home opens an event directly after checking the exact activity among several rows',
    (tester) async {
      final h = Harness()
        ..rows = [
          event,
          {...event, 'sourceRecordId': 'different', 'username': 'member_b'},
        ];
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      expect(find.text('View activity'), findsNothing);
      await tester.ensureVisible(find.text('Open event').first);
      await tester.tap(find.text('Open event').first);
      await tester.pumpAndSettle();
      expect(h.opened, ['event_a']);
      expect(
        h.requests,
        contains(equals({'view': 'all', 'category': 'event_interested'})),
      );
      expect(find.text('Current Event'), findsNWidgets(2));
    },
  );

  testWidgets(
    'a different friend with the same event cannot authorize the old activity',
    (tester) async {
      final h = Harness()..rows = [event];
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      h.rows = [
        {...event, 'username': 'member_b'},
      ];
      await tester.ensureVisible(find.text('Open event'));
      await tester.tap(find.text('Open event'));
      await tester.pumpAndSettle();
      expect(h.opened, isEmpty);
      expect(find.text('Current Event'), findsNothing);
      expect(
        find.text('This activity is no longer available under current access.'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'repeated tap issues one recheck and revocation while waiting prevents navigation',
    (tester) async {
      final h = Harness()..rows = [event];
      addTearDown(h.dispose);
      await tester.pumpWidget(h.widget());
      await tester.pumpAndSettle();
      final action = tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'Open event'),
          )
          .onPressed!;
      final pending = Completer<http.Response>();
      h.pending = pending;
      action();
      action();
      await tester.pump();
      expect(h.requests.where((q) => q['view'] == 'all').length, 1);
      h.rows = [];
      h.container.read(contentAccessProvider.notifier).changed();
      await tester.pumpAndSettle();
      pending.complete(
        http.Response(
          jsonEncode({
            'activities': [event],
          }),
          200,
        ),
      );
      await tester.pumpAndSettle();
      expect(h.opened, isEmpty);
      expect(find.text('Current Event'), findsNothing);
    },
  );
}
