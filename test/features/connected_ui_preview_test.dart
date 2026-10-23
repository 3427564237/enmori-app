import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_record_view.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/presentation/check_in_points_map.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Actual production widgets with explicitly synthetic data and no network tiles.
/// Optional rasters are review evidence, not device/provider acceptance.
void main() {
  testWidgets(
    'saved snapshot, Footprint and local chat feedback fit phone and large-text landscape',
    (tester) async {
      for (final (family, path) in [
        ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
        ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
        (
          'Playfair Display',
          'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
        ),
      ]) {
        if (path != null) {
          final bytes = await tester.runAsync(() => File(path).readAsBytes());
          await tester.runAsync(
            () => (FontLoader(
              family,
            )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
          );
        }
      }
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final record = CheckIn(
        checkInId: 'fixture-check-in',
        note: 'A quiet walk after class.',
        createdAt: DateTime.utc(2026, 10, 21, 9),
        mood: 'Calm',
        activity: 'Travel',
        checkInVisibility: CheckInVisibility.private,
        location: const GeoPoint(1.35, 103.82),
        weather: WeatherSnapshot(
          observedAt: DateTime.utc(2026, 10, 21, 9),
          temperatureCelsius: 29.2,
          condition: WeatherCondition.partlyCloudy,
        ),
      );
      for (final (size, scale, label) in [
        (const Size(375, 812), 1.0, 'phone'),
        (const Size(812, 375), 2.0, 'landscape-2x'),
      ]) {
        tester.view.physicalSize = size;
        for (final (name, page) in <(String, Widget)>[
          (
            'saved',
            Scaffold(
              appBar: AppBar(title: const Text('Saved Check-in')),
              body: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  CheckInRecordView(
                    record: record,
                    openAttribution: (_) async => false,
                  ),
                ],
              ),
            ),
          ),
          (
            'footprint',
            Scaffold(
              appBar: AppBar(title: const Text('Footprint')),
              body: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const Text('October 2026 · Preview data'),
                  CheckInPointsMap(
                    points: [
                      CheckInMapPoint(
                        checkInId: 'late',
                        createdAt: DateTime.utc(2026, 10, 21, 9),
                        location: const GeoPoint(1.35, 103.82),
                      ),
                      CheckInMapPoint(
                        checkInId: 'early',
                        createdAt: DateTime.utc(2026, 10, 20, 9),
                        location: const GeoPoint(1.36, 103.83),
                      ),
                    ],
                    onSelect: (_) {},
                    openAttribution: (_) async => false,
                    tileLayerBuilder: () => const ColoredBox(
                      color: Color(0xffe4eee4),
                      child: Center(
                        child: Text('Preview · map tiles disabled'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          (
            'chat-pending',
            AiConversationPage(
              socialStyle: true,
              onBack: () {},
              onOpenSettings: () {},
            ),
          ),
        ]) {
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                aiConversationControllerProvider.overrideWith(
                  _PreviewConversation.new,
                ),
              ],
              child: RepaintBoundary(
                key: const Key('capture'),
                child: MaterialApp(
                  debugShowCheckedModeBanner: false,
                  theme: enmoriTheme(),
                  builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true,
                    ),
                    child: child!,
                  ),
                  home: page,
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          final output = Platform.environment['ENMORI_CONNECTED_PREVIEW'];
          if (output != null) {
            final boundary = tester.renderObject<RenderRepaintBoundary>(
              find.byKey(const Key('capture')),
            );
            final bitmap = await tester.runAsync(
              () => boundary.toImage(pixelRatio: 2),
            );
            final bytes = await tester.runAsync(
              () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
            );
            await tester.runAsync(() async {
              await Directory(output).create(recursive: true);
              await File('$output/$name-$label.png')
                  .writeAsBytes(bytes!.buffer.asUint8List());
            });
            bitmap!.dispose();
          }
          await tester.pumpWidget(const SizedBox.shrink());
        }
      }
    },
  );
}

class _PreviewConversation extends AiConversationController {
  @override
  AiConversationState build() => AiConversationState(
    sessionKey: 'preview',
    phase: AiConversationPhase.waiting,
    canCancel: true,
    localOutgoingKey: 'preview-request',
    localOutgoingText: 'I enjoyed a quiet walk today.',
  );
  @override
  void detach({Object? sessionKey}) {}
}
