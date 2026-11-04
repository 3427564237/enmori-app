import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_calendar_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_mutations.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_calendar_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_edit_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_page.dart'
    as history;
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_record_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const note = 'A quiet walk after class.';

class _Repository
    implements CheckInRepository, CheckInCalendarRepository, CheckInMutations {
  CheckIn record = CheckIn(
    checkInId: 'one',
    note: note,
    mood: 'My own mood',
    activity: 'Personal label',
    createdAt: DateTime.utc(2026, 10, 19, 2),
    checkInVisibility: CheckInVisibility.private,
  );
  String? submitted;
  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) async {
    submitted = note;
    record = CheckIn(
      checkInId: 'created',
      note: note,
      mood: mood,
      activity: activity,
      locationLabel: locationLabel,
      checkInVisibility: visibility,
      createdAt: record.createdAt,
    );
    return Success(record);
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async =>
      Success(record);
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => Success(CheckInHistoryPage(checkIns: [record], nextCursor: null));
  @override
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  }) async => Success(
    CheckInMonth(month: month, timeZone: timeZone, counts: {'$month-19': 1}),
  );
  @override
  Future<Result<CheckIn>> update({
    bool Function()? isEligible,
    required String checkInId,
    required String note,
    String? mood,
    String? activity,
    String? locationLabel,
    required CheckInVisibility visibility,
    required int expectedRevision,
  }) async => Success(record);
  @override
  Future<Result<void>> remove({
    bool Function()? isEligible,
    required String checkInId,
    required int expectedRevision,
  }) async => const Success(null);
}

class _Device implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String ianaZone) async =>
      DateTime.utc(2026, 10, 19);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async => instants.map((_) => '10:00').toList();
}

ThemeData _previewTheme() {
  final theme = enmoriTheme();
  if (Platform.environment['ENMORI_JOURNAL_PREVIEW'] == null) return theme;
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontFamilyFallback: ['Journal CJK']),
    appBarTheme: theme.appBarTheme.copyWith(
      titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
        fontFamilyFallback: ['Journal CJK'],
      ),
    ),
    dialogTheme: theme.dialogTheme.copyWith(
      titleTextStyle: theme.dialogTheme.titleTextStyle?.copyWith(
        fontFamilyFallback: ['Journal CJK'],
      ),
    ),
  );
}

Widget _app(
  String language,
  Widget page,
  _Repository repo, {
  double scale = 1,
}) => ProviderScope(
  overrides: [
    authSessionProvider.overrideWithValue(
      const AsyncData(AuthSessionAuthenticated(subject: 'fixture')),
    ),
    checkInRepositoryProvider.overrideWithValue(repo),
    historyDevicePortProvider.overrideWithValue(_Device()),
  ],
  child: MaterialApp(
    theme: _previewTheme(),
    locale: Locale(language),
    supportedLocales: const [Locale('en'), Locale('zh')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale), disableAnimations: true),
      child: RepaintBoundary(key: const Key('journal-capture'), child: child!),
    ),
    home: page,
  ),
);

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_JOURNAL_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('journal-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 1));
  final bytes = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
  });
  bitmap!.dispose();
}

void main() {
  for (final language in ['en', 'zh']) {
    testWidgets(
      '$language composer saves unchanged user text through localized controls',
      (tester) async {
        final repo = _Repository();
        tester.view.physicalSize = const Size(375, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          _app(language, const CheckInComposerPage(socialStyle: true), repo),
        );
        await tester.pumpAndSettle();
        await tester.enterText(find.byKey(const Key('r6-check-in-note')), note);
        tester.testTextInput.hide();
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        final mood = language == 'zh' ? '心情' : 'Mood';
        await tester.ensureVisible(find.widgetWithText(ActionChip, mood));
        await tester.tap(find.widgetWithText(ActionChip, mood));
        await tester.pumpAndSettle();
        expect(
          find.text(language == 'zh' ? '自定义心情' : 'Custom Mood'),
          findsOneWidget,
        );
        await tester.enterText(find.byType(TextFormField), 'Untouched 自定义');
        await tester.ensureVisible(
          find.text(language == 'zh' ? '应用' : 'Apply'),
        );
        await tester.tap(find.text(language == 'zh' ? '应用' : 'Apply'));
        await tester.pumpAndSettle();
        expect(find.text('Untouched 自定义'), findsOneWidget);
        await tester.ensureVisible(find.byKey(const Key('r6-check-in-create')));
        await tester.tap(find.byKey(const Key('r6-check-in-create')));
        await tester.pumpAndSettle();
        expect(repo.submitted, note);
        expect(repo.record.mood, 'Untouched 自定义');
        expect(
          find.text(language == 'zh' ? '签到已保存。' : 'Check-in saved.'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      '$language Calendar History and edit use real locale delegates at large text',
      (tester) async {
        final repo = _Repository();
        tester.view.physicalSize = const Size(375, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        if (Platform.environment['ENMORI_JOURNAL_PREVIEW'] != null) {
          for (final (family, path) in [
            ('Roboto', '/usr/share/fonts/inter/Inter.ttc'),
            (
              'Journal CJK',
              '/usr/share/fonts/adobe-source-han-sans/SourceHanSansCN-Regular.otf',
            ),
            (
              'MaterialIcons',
              '/home/miku/fvm/versions/3.47.2/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
            ),
            (
              'Playfair Display',
              'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
            ),
          ]) {
            final bytes = await tester.runAsync(() => File(path).readAsBytes());
            await tester.runAsync(
              () => (FontLoader(
                family,
              )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
            );
          }
        }
        await tester.pumpWidget(
          _app(
            language,
            CheckInCalendarPage(
              initialDate: DateTime.utc(2026, 10, 19),
              latestDate: DateTime.utc(2026, 10, 23),
              timeZone: 'Asia/Singapore',
            ),
            repo,
            scale: 2,
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(language == 'zh' ? '签到日历' : 'Check-in calendar'),
          findsOneWidget,
        );
        final localizations = MaterialLocalizations.of(
          tester.element(find.byType(CheckInCalendarPage)),
        );
        expect(
          localizations.formatMediumDate(DateTime.utc(2026, 10, 19)),
          language == 'zh' ? contains('10月') : contains('Oct'),
        );
        await _capture(tester, 'calendar-$language-phone-2x');
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpWidget(
          _app(
            language,
            history.CheckInHistoryPage(
              onBack: () {},
              onOpenSavedCheckIn: (_) {},
            ),
            repo,
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text(note), findsOneWidget);
        expect(
          find.text(language == 'zh' ? '签到历史' : 'Check-in History'),
          findsOneWidget,
        );
        await _capture(tester, 'history-$language-phone');
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpWidget(
          _app(language, CheckInEditPage(checkIn: repo.record), repo, scale: 2),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(language == 'zh' ? '编辑签到' : 'Edit Check-in'),
          findsOneWidget,
        );
        expect(find.text(note), findsOneWidget);
        await tester.ensureVisible(
          find.widgetWithText(ActionChip, 'My own mood'),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        final visibility = find.byType(
          DropdownButtonFormField<CheckInVisibility>,
        );
        await tester.ensureVisible(visibility);
        await tester.tap(visibility);
        await tester.pumpAndSettle();
        await tester.tap(
          find.text(language == 'zh' ? '仅好友' : 'Friends-only').last,
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        // The longer label remains usable; choosing it alone does not save.
        expect(repo.record.checkInVisibility, CheckInVisibility.private);
      },
    );
  }

  testWidgets(
    'changing locale translates record chrome and preserves saved labels',
    (tester) async {
      final repo = _Repository();
      final language = ValueNotifier('en');
      addTearDown(language.dispose);
      await tester.pumpWidget(
        ValueListenableBuilder(
          valueListenable: language,
          builder: (_, value, _) => _app(
            value,
            Scaffold(
              body: CheckInRecordView(
                record: repo.record,
                openAttribution: (_) async => false,
              ),
            ),
            repo,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Private'), findsOneWidget);
      language.value = 'zh';
      await tester.pumpAndSettle();
      expect(find.text('仅自己'), findsOneWidget);
      expect(find.text(note), findsOneWidget);
      expect(find.text('My own mood'), findsOneWidget);
      expect(find.text('Personal label'), findsOneWidget);
    },
  );
}
