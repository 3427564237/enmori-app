import 'package:enmori/features/ai_conversation/domain/ai_owned_sources.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_selected_reply_review.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

String id(int n) =>
    '${n.toString().padLeft(8, '0')}-1111-4111-8111-111111111111';
AiPreparedReplySelection selection({int sources = 5}) =>
    AiPreparedReplySelection(
      selectionRevision: id(1),
      expiresAt: DateTime.utc(2026, 10, 25, 0, 0, 15),
      sourceCards: List.generate(
        sources,
        (i) => AiSelectedSourceCard(
          selectionKey: id(10 + i),
          card: AiSourceCard(
            cardRef: id(20 + i),
            kind: AiSourceKind.checkIn,
            version: 'opaque-do-not-render',
            sourceOccurredAt: '2026-10-2${i + 1}T06:00:00.123456789Z',
            observedAt: '2026-10-25T00:00:00.123456789Z',
          ),
        ),
      ),
      historyPairs: [
        AiPreparedHistoryPair(
          historyKey: id(30),
          userMessageId: id(31),
          assistantMessageId: id(32),
          userSequence: 2,
          assistantSequence: 3,
        ),
        AiPreparedHistoryPair(
          historyKey: id(40),
          userMessageId: id(41),
          assistantMessageId: id(42),
          userSequence: 1,
          assistantSequence: 4,
        ),
      ],
    );

void main() {
  testWidgets(
    'review shows only source metadata and confirmation is distinct from other actions',
    (tester) async {
      final calls = _Calls();
      await _pump(tester, calls);
      expect(find.text('2026-10-21 06:00:00.123456789 UTC'), findsOneWidget);
      expect(find.text('Read at'), findsNWidgets(5));
      expect(find.text('Messages 2 and 3'), findsOneWidget);
      expect(find.text('Messages 1 and 4'), findsOneWidget);
      expect(find.textContaining('opaque-do-not-render'), findsNothing);
      for (final value in [id(1), id(10), id(20), id(30), id(31), id(42)]) {
        expect(find.textContaining(value), findsNothing);
      }
      await _tap(tester, 'ai-review-confirm');
      expect(calls.events, ['confirm']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'expired and foreign history keys require an explicit fresh review',
    (tester) async {
      final calls = _Calls();
      for (final expired in [true, false]) {
        await _pump(
          tester,
          calls,
          expired: expired,
          excluded: expired ? {} : {id(99)},
        );
        expect(
          tester
              .widget<FilledButton>(find.byKey(const Key('ai-review-confirm')))
              .onPressed,
          isNull,
        );
        expect(
          find.textContaining('This review is no longer current.'),
          findsOneWidget,
        );
        await _tap(tester, 'ai-review-refresh');
      }
      expect(calls.events, ['refresh', 'refresh']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'confirmed exclusions identify whole exchanges without changing saved content',
    (tester) async {
      final calls = _Calls();
      await _pump(
        tester,
        calls,
        excluded: {id(30), id(40)},
        confirmed: true,
        sources: 0,
      );
      expect(
        find.text('No Check-ins are selected for this reply.'),
        findsOneWidget,
      );
      expect(find.text('Excluded from this reply'), findsNWidgets(2));
      expect(
        tester
            .widget<OutlinedButton>(
              find.byKey(const Key('ai-review-exclude-history')),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('ai-review-confirm')))
            .onPressed,
        isNull,
      );
      await _tap(tester, 'ai-review-cancel');
      expect(calls.events, ['cancel']);
    },
  );

  testWidgets(
    'busy review offers a return without queuing another review or confirmation',
    (tester) async {
      final calls = _Calls();
      await _pump(tester, calls, busy: true);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('ai-review-confirm')))
            .onPressed,
        isNull,
      );
      for (final key in ['ai-review-refresh', 'ai-review-exclude-history']) {
        expect(
          tester.widget<OutlinedButton>(find.byKey(Key(key))).onPressed,
          isNull,
        );
      }
      await _tap(tester, 'ai-review-cancel', settle: false);
      expect(calls.events, ['cancel']);
      expect(tester.takeException(), isNull);
    },
  );

  for (final locale in ['en', 'zh']) {
    testWidgets(
      'all review actions remain reachable at 320px and 2x text in $locale',
      (tester) async {
        final calls = _Calls();
        await _pump(tester, calls, locale: locale, width: 320, scale: 2);
        expect(tester.takeException(), isNull);
        for (final key in [
          'ai-review-exclude-history',
          'ai-review-confirm',
          'ai-review-refresh',
          'ai-review-cancel',
        ]) {
          final finder = find.byKey(Key(key));
          await tester.ensureVisible(finder);
          await tester.pumpAndSettle();
          expect(finder.hitTestable(), findsOneWidget);
          expect(tester.getSize(finder).height, greaterThanOrEqualTo(48));
          await tester.tap(finder);
          await tester.pump();
          expect(tester.takeException(), isNull);
        }
        expect(calls.events, ['exclude', 'confirm', 'refresh', 'cancel']);
      },
    );
  }
}

Future<void> _tap(WidgetTester tester, String key, {bool settle = true}) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
  expect(finder.hitTestable(), findsOneWidget);
  await tester.tap(finder);
  await tester.pump();
}

Future<void> _pump(
  WidgetTester tester,
  _Calls calls, {
  bool expired = false,
  bool confirmed = false,
  bool busy = false,
  Set<String> excluded = const {},
  String locale = 'en',
  int sources = 5,
  double width = 390,
  double scale = 1,
}) async {
  tester.view.physicalSize = Size(width, 700);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      locale: Locale(locale),
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            padding: const EdgeInsets.only(bottom: 24),
          ),
          child: Scaffold(
            body: AiSelectedReplyReview(
              selection: selection(sources: sources),
              excludedHistoryKeys: excluded,
              expired: expired,
              confirmed: confirmed,
              busy: busy,
              onExcludeHistory: () => calls.events.add('exclude'),
              onRefresh: () => calls.events.add('refresh'),
              onConfirm: () => calls.events.add('confirm'),
              onCancel: () => calls.events.add('cancel'),
            ),
          ),
        ),
      ),
    ),
  );
  if (busy) {
    await tester.pump();
  } else {
    await tester.pumpAndSettle();
  }
}

final class _Calls {
  final events = <String>[];
}
