import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/admin/domain/admin_repository.dart';
import 'package:enmori/features/admin/presentation/admin_pages.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'admin_value_test.dart' show ValueHarness, FakeValueAdmin;

class _Preview extends FakeValueAdmin {
  @override
  Future<Result<AdminRecordPage>> records(
    String? cursor,
    bool Function() current,
  ) async {
    final now = DateTime.now().toUtc();
    return Success(
      AdminRecordPage([
        AdminOperationRecord(
          'fixture-record',
          now.subtract(const Duration(hours: 1)),
          now.add(const Duration(days: 29)),
          'synthetic-admin',
          'event_category',
          'synthetic-category',
          'create',
          null,
          1,
        ),
      ], null),
    );
  }
}

/// Production widgets with synthetic data. Optional images are desktop-rendered
/// review evidence, not a phone, live-service, or release acceptance claim.
void main() {
  testWidgets(
    'Admin pages in both languages fit light/dark, keyboard and large text',
    (tester) async {
      final output = Platform.environment['ENMORI_ADMIN_PREVIEW'];
      if (output != null) {
        for (final (family, path) in [
          (
            'Roboto',
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
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      for (final locale in ['en', 'zh']) {
        for (final name in [
          'home',
          'status',
          'categories',
          'classification',
          'records',
        ]) {
          final h = await ValueHarness.start(repository: _Preview());
          final key = GlobalKey();
          await tester.pumpWidget(
            UncontrolledProviderScope(
              container: h.container,
              child: RepaintBoundary(
                key: key,
                child: MaterialApp(
                  locale: Locale(locale),
                  supportedLocales: const [Locale('en'), Locale('zh')],
                  localizationsDelegates: GlobalMaterialLocalizations.delegates,
                  debugShowCheckedModeBanner: false,
                  theme: enmoriTheme().copyWith(
                    textTheme: enmoriTheme().textTheme.apply(
                      fontFamilyFallback: const ['Roboto'],
                    ),
                    appBarTheme: enmoriTheme().appBarTheme.copyWith(
                      titleTextStyle: enmoriTheme().appBarTheme.titleTextStyle
                          ?.copyWith(fontFamilyFallback: const ['Roboto']),
                    ),
                  ),
                  home: name == 'home'
                      ? AdminHomePage(open: (_) {})
                      : AdminPanelPage(
                          page: name,
                          eventId: name == 'classification'
                              ? 'event-one'
                              : null,
                          eventTitle: 'Community Arts Workshop',
                        ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          if (output != null) {
            final boundary =
                key.currentContext!.findRenderObject()!
                    as RenderRepaintBoundary;
            final image = await tester.runAsync(
              () => boundary.toImage(pixelRatio: 1.5),
            );
            final bytes = await tester.runAsync(
              () => image!.toByteData(format: ui.ImageByteFormat.png),
            );
            await tester.runAsync(() async {
              await Directory(output).create(recursive: true);
              await File('$output/$locale-$name.png')
                  .writeAsBytes(bytes!.buffer.asUint8List());
            });
            image!.dispose();
          }
          await tester.pumpWidget(const SizedBox.shrink());
          await h.close();
        }
      }
      final h = await ValueHarness.start();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: h.container,
          child: MaterialApp(
            theme: ThemeData.dark(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(2),
                viewInsets: const EdgeInsets.only(bottom: 280),
              ),
              child: child!,
            ),
            home: const AdminPanelPage(page: 'categories'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('admin-category-name')),
        'Music',
      );
      await tester.scrollUntilVisible(
        find.text('Create category'),
        100,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await h.close();
    },
  );
}
