import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_weekly_review_page.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/presentation/event_plans_page.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/presentation/admin_interest_catalogue_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'admin_interest_test_support.dart';
import 'event_plans_test.dart' as plans;
import 'nonai_insights_test.dart' as insights;

class _History implements CheckInRepository {
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    final day = DateTime.parse(date).day;
    return Success(
      CheckInHistoryPage(
        checkIns: [
          for (var i = 0; i < (day % 4); i++)
            CheckIn(
              checkInId: '$date-$i',
              note: 'A walk and a quiet moment / 散步片刻',
              mood: i % 2 == 0 ? 'Calm / 平静' : 'Happy / 开心',
              activity: i % 2 == 0 ? 'Walking / 散步' : 'Reading / 阅读',
              createdAt: DateTime.parse('${date}T10:00:00Z'),
            ),
        ],
        nextCursor: null,
      ),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Preview never writes');
}

void main() {
  for (final language in ['en', 'zh']) {
    for (final screen in ['check-in7', 'check-in28', 'plans', 'admin']) {
      testWidgets('synthetic $screen preview $language', (tester) async {
        tester.view.physicalSize = Size(language == 'en' ? 390 : 360, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        final output = Platform.environment['ENMORI_INSIGHTS_PREVIEW'];
        if (output != null) {
          for (final (family, path) in [
            ('Roboto', '/usr/share/fonts/inter/Inter.ttc'),
            (
              'PreviewCJK',
              '/usr/share/fonts/adobe-source-han-sans/SourceHanSansCN-Regular.otf',
            ),
            (
              'Playfair Display',
              'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
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
        final admin = FakeAdminInterestRepository()
          ..tags = [
            for (final name in [
              'Art',
              'Dance',
              'Food',
              'Music',
              'Photography',
              'Sports',
              'Travel',
              'Volunteering',
            ])
              InterestTagOption(
                interestTagId: 'synthetic-${name.toLowerCase()}',
                displayName: name,
              ),
          ];
        final planRepo = plans.PlansRepo()..facts.clear();
        for (var i = 0; i < 8; i++) {
          planRepo.facts['$i'] = plans.fact(
            '$i',
            status: i < 3
                ? ParticipationStatus.going
                : ParticipationStatus.interested,
            ignored: i == 7,
          );
        }
        final theme = enmoriTheme();
        final page = switch (screen) {
          'admin' => AdminInterestCataloguePage(onBack: () {}),
          'plans' => EventPlansPage(onOpenEvent: (_) {}),
          _ => CheckInWeeklyReviewPage(
            lastDate: insights.lastDate,
            timeZone: 'Asia/Singapore',
            onOpen: (_) {},
          ),
        };
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authSessionProvider.overrideWithValue(
                const AsyncData(
                  AuthSessionAuthenticated(subject: 'synthetic-preview'),
                ),
              ),
              checkInRepositoryProvider.overrideWithValue(_History()),
              historyDevicePortProvider.overrideWithValue(insights.Device()),
              adminInterestRepositoryProvider.overrideWithValue(admin),
              participationRepositoryProvider.overrideWithValue(planRepo),
              eventDetailRepositoryProvider.overrideWithValue(plans.Details()),
            ],
            child: MaterialApp(
              theme: theme.copyWith(
                textTheme: theme.textTheme.apply(
                  fontFamilyFallback: ['PreviewCJK'],
                ),
                appBarTheme: theme.appBarTheme.copyWith(
                  titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
                    fontFamilyFallback: ['PreviewCJK'],
                  ),
                ),
              ),
              locale: Locale(language),
              supportedLocales: const [Locale('en'), Locale('zh')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: TextScaler.linear(language == 'zh' ? 1.3 : 1),
                ),
                child: RepaintBoundary(
                  key: const Key('insights-preview'),
                  child: child!,
                ),
              ),
              home: page,
            ),
          ),
        );
        await tester.pumpAndSettle();
        if (screen.startsWith('check-in')) {
          if (screen.endsWith('28')) {
            await tester.tap(find.byKey(const Key('review-range-28')));
            await tester.pump();
          }
          await tester.tap(find.byKey(const Key('weekly-review-load')));
          await tester.pumpAndSettle();
        }
        expect(tester.takeException(), isNull);
        Future<void> capture(String name) async {
          if (output == null) return;
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 40)),
          );
          await tester.pump();
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('insights-preview')),
          );
          final bitmap = await tester.runAsync(
            () => boundary.toImage(pixelRatio: 1.5),
          );
          final bytes = await tester.runAsync(
            () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
          );
          await tester.runAsync(() async {
            await Directory(output).create(recursive: true);
            await File('$output/$name-$language.png')
                .writeAsBytes(bytes!.buffer.asUint8List());
          });
          bitmap!.dispose();
        }

        await capture(screen);
        await tester.drag(find.byType(ListView).first, const Offset(0, -560));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await capture('$screen-lower');
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
}
