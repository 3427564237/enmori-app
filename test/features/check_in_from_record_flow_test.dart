import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_place_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_from_record_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controller.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/weather_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';
import 'located_check_in_flow_test.dart' as fixtures;

final source = CheckIn(
  checkInId: 'source',
  note: 'An earlier note 原文',
  mood: 'Calm',
  activity: 'Reading',
  locationLabel: 'Old place',
  location: const GeoPoint(10, 20),
  weather: WeatherSnapshot(
    observedAt: DateTime.utc(2026, 1, 1),
    temperatureCelsius: 12,
    condition: WeatherCondition.clear,
  ),
  checkInVisibility: CheckInVisibility.public,
  createdAt: DateTime.utc(2026, 1, 1),
);
final newRecord = CheckIn(
  checkInId: 'new-record',
  note: 'Today is different',
  mood: 'Calm',
  activity: 'Reading',
  checkInVisibility: CheckInVisibility.private,
  createdAt: DateTime.utc(2026, 10, 23),
);
const unavailable = AppFailure(
  kind: AppFailureKind.checkInUnavailable,
  message: 'Unavailable',
);

class _SourceRepository implements CheckInRepository {
  Result<CheckIn> result = Success(source);
  Completer<Result<CheckIn>>? pending;
  final reads = <String>[];
  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async {
    reads.add(checkInId);
    if (checkInId == newRecord.checkInId) return Success(newRecord);
    return pending?.future ?? result;
  }

  @override
  Future<Result<CheckIn>> create({
    required String note,
    required String idempotencyKey,
    String? mood,
    String? activity,
    String? locationLabel,
    CheckInVisibility? visibility,
  }) => throw StateError(
    'The connected composer must use its existing place repository.',
  );

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Success(CheckInHistoryPage(checkIns: [], nextCursor: null));
}

class _PlaceRepository extends fixtures.PlaceFake {
  final notes = <String>[];
  @override
  Future<Result<CheckInSaveReceipt>> create({
    String? locationLabel,
    required String note,
    String? mood,
    String? activity,
    required CheckInVisibility visibility,
    CheckInPlace? place,
    required String idempotencyKey,
    bool Function()? isEligible,
  }) {
    notes.add(note);
    return super.create(
      note: note,
      mood: mood,
      activity: activity,
      locationLabel: locationLabel,
      visibility: visibility,
      place: place,
      idempotencyKey: idempotencyKey,
      isEligible: isEligible,
    );
  }
}

class _Harness {
  final auth = FakeAuthRepository();
  final sourceRepository = _SourceRepository();
  final place = _PlaceRepository()
    ..result = Success(CheckInSaveReceipt(newRecord));
  final preferences = FakeAccountPreferences();
  final location = fixtures.LocationFake();
  late ProviderContainer container;
  int discarded = 0;

  Future<void> mount(
    WidgetTester tester, {
    String language = 'en',
    String sourceId = 'source',
    double scale = 1,
  }) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        checkInRepositoryProvider.overrideWithValue(sourceRepository),
        checkInPlaceRepositoryProvider.overrideWithValue(place),
        accountPreferencesRepositoryProvider.overrideWithValue(preferences),
        foregroundLocationProvider.overrideWithValue(location),
        idempotencyKeyGeneratorProvider.overrideWithValue(
          FakeIdempotencyKeyGenerator(['new-draft-key']),
        ),
      ],
    );
    addTearDown(container.dispose);
    addTearDown(auth.close);
    container.listen(authSessionProvider, (_, _) {});
    auth.emit(AuthSessionAuthenticated(subject: 'owner'));
    await container.read(authSessionProvider.future);
    var theme = enmoriTheme();
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
      theme = theme.copyWith(
        textTheme: theme.textTheme.apply(fontFamilyFallback: ['Journal CJK']),
        appBarTheme: theme.appBarTheme.copyWith(
          titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
            fontFamilyFallback: ['Journal CJK'],
          ),
        ),
      );
    }
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: theme,
          locale: Locale(language),
          supportedLocales: const [Locale('en'), Locale('zh')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(scale),
              disableAnimations: true,
            ),
            child: RepaintBoundary(
              key: const Key('draft-capture'),
              child: child!,
            ),
          ),
          home: Builder(
            builder: (context) => CheckInFromRecordPage(
              sourceCheckInId: sourceId,
              located: true,
              socialStyle: true,
              onDiscard: () => discarded++,
              onOpenSaved: (id) => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) =>
                      SavedCheckInPage(checkInId: id, onReturnHome: () {}),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> capture(WidgetTester tester, String language) async {
  final output = Platform.environment['ENMORI_JOURNAL_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('draft-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 1));
  final bytes = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/new-draft-$language-phone.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
  });
  bitmap!.dispose();
}

void main() {
  for (final language in ['en', 'zh']) {
    testWidgets(
      '$language owned text becomes editable input, then saves and reads a distinct record',
      (tester) async {
        final h = _Harness();
        await h.mount(tester, language: language);
        await tester.pumpAndSettle();
        expect(h.sourceRepository.reads, ['source']);
        expect(h.place.keys, isEmpty);
        expect(h.location.calls, isEmpty);
        expect(h.preferences.settingsSaveCount, 0);
        final editor = find.byKey(const Key('r6-check-in-note'));
        expect(tester.widget<TextField>(editor).controller!.text, source.note);
        expect(find.text('Calm'), findsOneWidget);
        expect(find.text('Reading'), findsOneWidget);
        expect(find.text('Old place'), findsNothing);
        expect(find.byKey(const Key('check-in-draft-review')), findsOneWidget);
        await capture(tester, language);
        await tester.enterText(editor, newRecord.note);
        FocusManager.instance.primaryFocus?.unfocus();
        await tapVisible(
          tester,
          find.text(language == 'zh' ? '保存签到' : 'Save Check-in'),
        );
        expect(h.place.keys, ['new-draft-key']);
        expect(h.place.notes, [newRecord.note]);
        expect(h.place.moods, ['Calm']);
        expect(h.place.activities, ['Reading']);
        expect(h.place.labels, [null]);
        expect(h.place.places, [null]);
        expect(h.place.visibilities, [CheckInVisibility.private]);
        expect(source.note, 'An earlier note 原文');
        expect(
          find.text(language == 'zh' ? '签到已保存。' : 'Check-in saved.'),
          findsOneWidget,
        );
        await tapVisible(
          tester,
          find.text(language == 'zh' ? '查看已保存的签到' : 'View saved Check-in'),
        );
        expect(h.sourceRepository.reads, ['source', 'new-record']);
        expect(find.text(newRecord.note), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'current preferences use a fresh point and never the historical point',
    (tester) async {
      final h = _Harness();
      h.preferences.settings = const OwnSettings(
        checkInVisibility: CheckInVisibility.friendsOnly,
        defaultCheckInLocation: true,
        defaultCheckInWeather: true,
        consent: OptionalProcessingConsent.rejected,
        revision: 4,
      );
      await h.mount(tester);
      await tester.pumpAndSettle();
      expect(h.location.calls, [true]);
      await tapVisible(tester, find.text('Save Check-in'));
      expect(h.place.visibilities, [CheckInVisibility.friendsOnly]);
      expect(h.place.places.single!.location.latitude, 1.3521);
      expect(h.place.places.single!.includeWeather, isTrue);
      expect(h.place.places.single!.settingsRevision, 4);
      expect(h.preferences.settingsSaveCount, 0);
    },
  );

  testWidgets(
    'unavailable source retry does not create or start GPS; settings failure blocks save',
    (tester) async {
      final h = _Harness();
      h.sourceRepository.result = const Failure(unavailable);
      await h.mount(tester);
      await tester.pumpAndSettle();
      expect(find.byType(CheckInComposerPage), findsNothing);
      expect(h.preferences.settingsReadCount, 0);
      expect(h.location.calls, isEmpty);
      expect(h.place.keys, isEmpty);
      h.sourceRepository.result = Success(source);
      h.preferences.settingsReads.add(Future.value(const Failure(unavailable)));
      await tapVisible(tester, find.byKey(const Key('check-in-source-retry')));
      expect(find.text('Save Check-in'), findsNothing);
      expect(h.place.keys, isEmpty);
      await tapVisible(tester, find.text('Retry privacy settings'));
      expect(find.text('Save Check-in'), findsOneWidget);
      expect(h.place.keys, isEmpty);
    },
  );

  for (final pending in [true, false]) {
    testWidgets(
      'same-account session replacement retires ${pending ? 'late source' : 'copied input'}',
      (tester) async {
        final h = _Harness();
        final read = Completer<Result<CheckIn>>();
        if (pending) h.sourceRepository.pending = read;
        await h.mount(tester);
        if (!pending) await tester.pumpAndSettle();
        h.auth.emit(AuthSessionAuthenticated(subject: 'owner'));
        await tester.pump();
        if (pending) read.complete(Success(source));
        await tester.pumpAndSettle();
        expect(find.byType(CheckInComposerPage), findsNothing);
        expect(find.byKey(const Key('check-in-source-retry')), findsNothing);
        expect(h.place.keys, isEmpty);
        expect(h.sourceRepository.reads, ['source']);
      },
    );
  }

  testWidgets(
    'background source response requires explicit fresh read; edits survive mutation receipts',
    (tester) async {
      final h = _Harness();
      final read = Completer<Result<CheckIn>>();
      h.sourceRepository.pending = read;
      await h.mount(tester);
      h.container.read(contentAccessProvider.notifier).setForeground(false);
      read.complete(Success(source));
      await tester.pump();
      h.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pumpAndSettle();
      expect(find.byType(CheckInComposerPage), findsNothing);
      h.sourceRepository.pending = null;
      await tapVisible(tester, find.byKey(const Key('check-in-source-retry')));
      final editor = find.byKey(const Key('r6-check-in-note'));
      await tester.enterText(editor, 'My current unsaved edits');
      h.container.read(contentAccessProvider.notifier).changed();
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(editor).controller!.text,
        'My current unsaved edits',
      );
      expect(h.sourceRepository.reads, ['source', 'source']);
      expect(h.place.keys, isEmpty);
    },
  );

  testWidgets(
    'uncertain save keeps copied edits and retries only the same request',
    (tester) async {
      final h = _Harness();
      h.place.result = const Failure(
        AppFailure(kind: AppFailureKind.serviceUnavailable, message: 'Unknown'),
      );
      await h.mount(tester);
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Save Check-in'));
      expect(h.place.keys, ['new-draft-key']);
      h.place.result = Success(CheckInSaveReceipt(newRecord));
      await tapVisible(tester, find.text('Retry same save'));
      expect(h.place.keys, ['new-draft-key', 'new-draft-key']);
      expect(h.place.notes, [source.note, source.note]);
      expect(h.sourceRepository.reads, ['source']);
      expect(find.text('Check-in saved.'), findsOneWidget);
    },
  );

  testWidgets(
    'large text keeps review, editable labels and discard protection reachable',
    (tester) async {
      final previousHitTestPolicy =
          WidgetController.hitTestWarningShouldBeFatal;
      WidgetController.hitTestWarningShouldBeFatal = true;
      addTearDown(() {
        WidgetController.hitTestWarningShouldBeFatal = previousHitTestPolicy;
      });
      final h = _Harness();
      await h.mount(tester, scale: 2);
      await tester.pumpAndSettle();
      await tapVisible(tester, find.widgetWithText(ActionChip, 'Calm'));
      expect(find.widgetWithText(TextFormField, 'Calm'), findsOneWidget);
      await tapVisible(tester, find.text('Clear'));
      expect(find.widgetWithText(ActionChip, 'Mood'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Calm'), findsNothing);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('Discard this draft?'), findsOneWidget);
      await tapVisible(tester, find.text('Keep editing'));
      expect(h.discarded, 0);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Leave'));
      expect(h.discarded, 1);
      expect(h.place.keys, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('empty source never falls back to a blank composer', (
    tester,
  ) async {
    final h = _Harness();
    await h.mount(tester, sourceId: '');
    await tester.pumpAndSettle();
    expect(h.sourceRepository.reads, isEmpty);
    expect(h.preferences.settingsReadCount, 0);
    expect(find.byType(CheckInComposerPage), findsNothing);
    expect(find.byKey(const Key('check-in-source-retry')), findsNothing);
    await tapVisible(tester, find.text('Return to your records'));
    expect(h.discarded, 1);
  });

  testWidgets('mismatched source projection never populates a draft', (
    tester,
  ) async {
    final h = _Harness();
    h.sourceRepository.result = Success(newRecord);
    await h.mount(tester);
    await tester.pumpAndSettle();
    expect(find.byType(CheckInComposerPage), findsNothing);
    expect(h.preferences.settingsReadCount, 0);
    expect(h.place.keys, isEmpty);
  });
}
