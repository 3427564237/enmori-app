import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_weekly_review_page.dart';
import 'package:enmori/features/event_detail/presentation/event_action_buttons.dart';
import 'package:enmori/features/event_detail/presentation/recent_events_page.dart';

import 'event_actions_test.dart' as actions;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/domain/own_avatar.dart';
import 'package:enmori/features/account/own_avatar_providers.dart';
import 'package:enmori/features/account/presentation/own_avatar_editor.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_search_page.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_batches_test.dart' as events;
import 'own_avatar_test.dart' as avatar;

class _PrivateAvatar implements OwnAvatarRepository {
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async =>
      Success(OwnAvatar(photo: avatar.photo, revision: 1));
  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    bool visibleToAuthenticatedUsers = false,
    required int expectedRevision,
    required bool Function() current,
  }) async => throw StateError('Preview never saves');
}

class _PreviewHistory implements CheckInRepository {
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => Success(
    CheckInHistoryPage(
      checkIns: date == '2026-10-27'
          ? [
              CheckIn(
                checkInId: 'one',
                note: 'A quiet afternoon walk / 午后散步',
                mood: 'Calm / 平静',
                activity: 'Walking / 散步',
                createdAt: DateTime.utc(2026, 10, 27),
              ),
              CheckIn(
                checkInId: 'two',
                note: 'Coffee and a good book / 咖啡和书',
                mood: 'Happy / 开心',
                createdAt: DateTime.utc(2026, 10, 27),
              ),
            ]
          : [],
      nextCursor: null,
    ),
  );
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Preview has no writes');
}

class _PreviewTime implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String zone) async => DateTime(2026, 10, 27);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> values,
    String zone,
  ) async => values.map((_) => '27 Oct · 15:00').toList();
}

void main() {
  for (final config in [(375.0, 1.0, 'en'), (320.0, 2.0, 'zh')]) {
    for (final screen in [
      'events',
      'prompts',
      'search',
      'avatar',
      'review',
      'actions',
      'recent',
    ]) {
      testWidgets('$screen fits ${config.$1}dp ${config.$2}x ${config.$3}', (
        tester,
      ) async {
        tester.view.physicalSize = Size(config.$1, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final directory = Platform.environment['ENMORI_NEXT_PREVIEW'];
        if (directory != null) {
          for (final (family, path) in [
            ('Inter', '/usr/share/fonts/inter/Inter.ttc'),
            (
              'Playfair Display',
              'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
            ),
            (
              'Preview CJK',
              '/usr/share/fonts/adobe-source-han-sans/SourceHanSansCN-Regular.otf',
            ),
            (
              'MaterialIcons',
              '/home/miku/fvm/versions/3.47.2/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
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
        final repo = events.Repo()
          ..result = Success(
            ActivityBatch(
              asOf: events.instant,
              items: [
                ActivitySummary(
                  browseId: 'demo',
                  eventId: 'demo',
                  title: 'Synthetic weekend gathering',
                  startAt: DateTime.now()
                      .add(const Duration(hours: 2))
                      .toUtc()
                      .toIso8601String(),
                  locationLabel: 'Example venue',
                  categoryLabel: 'Community',
                ),
              ],
            ),
          );
        final page = switch (screen) {
          'review' => CheckInWeeklyReviewPage(
            lastDate: DateTime(2026, 10, 27),
            timeZone: 'Asia/Singapore',
            onOpen: (_) {},
          ),
          'actions' => Scaffold(
            appBar: AppBar(title: const Text('Event / 活动')),
            body: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Synthetic event / 合成活动'),
                EventActionButtons(event: actions.event(), current: () => true),
              ],
            ),
          ),
          'recent' => RecentEventsPage(onSelect: (_) {}),
          'events' => ParticipationEventsPage(onSelect: (_) {}),
          'prompts' => const CheckInComposerPage(socialStyle: true),
          'search' => CheckInSearchPage(onOpen: (_) {}),
          _ => const OwnAvatarEditor(),
        };
        final theme = enmoriTheme();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              historyDevicePortProvider.overrideWithValue(_PreviewTime()),
              authSessionProvider.overrideWithValue(
                const AsyncData(
                  AuthSessionAuthenticated(subject: 'synthetic-preview'),
                ),
              ),
              activityRepositoryProvider.overrideWithValue(repo),
              checkInRepositoryProvider.overrideWithValue(
                screen == 'review'
                    ? _PreviewHistory()
                    : FakeCheckInRepository(),
              ),
              ownAvatarRepositoryProvider.overrideWithValue(_PrivateAvatar()),
            ],
            child: MaterialApp(
              locale: Locale(config.$3),
              supportedLocales: const [Locale('en'), Locale('zh')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              theme: theme.copyWith(
                appBarTheme: theme.appBarTheme.copyWith(
                  titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
                    fontFamilyFallback: ['Preview CJK'],
                  ),
                ),
                textTheme: theme.textTheme.apply(
                  fontFamily: 'Inter',
                  fontFamilyFallback: ['Preview CJK'],
                ),
              ),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: TextScaler.linear(config.$2),
                  disableAnimations: true,
                ),
                child: RepaintBoundary(
                  key: const Key('capture-next'),
                  child: child!,
                ),
              ),
              home: page,
            ),
          ),
        );
        await tester.pumpAndSettle();
        if (screen == 'review') {
          await tester.tap(find.byKey(const Key('weekly-review-load')));
          await tester.pumpAndSettle();
        }
        expect(tester.takeException(), isNull);
        if (directory != null) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 60)),
          );
          await tester.pump();
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('capture-next')),
          );
          final bitmap = await tester.runAsync(
            () => boundary.toImage(pixelRatio: 1),
          );
          final bytes = await tester.runAsync(
            () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
          );
          await tester.runAsync(() async {
            await Directory(directory).create(recursive: true);
            await File('$directory/$screen-${config.$3}.png')
                .writeAsBytes(bytes!.buffer.asUint8List());
          });
          bitmap!.dispose();
        }
        // Exercise the lower portion as well as the initial viewport.
        await tester.drag(
          find.byType(ListView).evaluate().isEmpty
              ? find.byType(SingleChildScrollView).first
              : find.byType(ListView).first,
          const Offset(0, -700),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
}
