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

void main() {
  for (final config in [(375.0, 1.0, 'en'), (320.0, 2.0, 'zh')]) {
    for (final screen in ['events', 'prompts', 'search', 'avatar']) {
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
          'events' => ParticipationEventsPage(onSelect: (_) {}),
          'prompts' => const CheckInComposerPage(socialStyle: true),
          'search' => CheckInSearchPage(onOpen: (_) {}),
          _ => const OwnAvatarEditor(),
        };
        final theme = enmoriTheme();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authSessionProvider.overrideWithValue(
                const AsyncData(
                  AuthSessionAuthenticated(subject: 'synthetic-preview'),
                ),
              ),
              activityRepositoryProvider.overrideWithValue(repo),
              checkInRepositoryProvider.overrideWithValue(
                FakeCheckInRepository(),
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
