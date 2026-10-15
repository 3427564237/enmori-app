// Fixture-only rendering receipt. No device, provider or runtime operation.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/core/result/result.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../test/features/event_browse_test.dart' as fixture;

void main() {
  testWidgets('render approved Activity disclosure at narrow large text', (
    tester,
  ) async {
    // Use a caller-selected local font so screenshots contain readable glyphs.
    // The regular widget assertions remain in the accepted feature tests.
    final fontPath = Platform.environment['ENMORI_RENDER_FONT'];
    if (fontPath == null) throw StateError('ENMORI_RENDER_FONT is required');
    await tester.runAsync(() async {
      final loader = FontLoader('Roboto')
        ..addFont(
          File(fontPath).readAsBytes().then((b) => b.buffer.asByteData()),
        );
      await loader.load();
    });
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final output = Directory('build/li-disclosure-receipt/render');
    await tester.runAsync(() => output.create(recursive: true));

    Future<void> capture(String name) async {
      await tester.runAsync(() async {
        // Read the root layer only for a fixture screenshot, never mutate it.
        // ignore: invalid_use_of_protected_member
        final layer = tester.binding.renderViews.single.layer! as OffsetLayer;
        final image = await layer.toImage(const Rect.fromLTWH(0, 0, 320, 640));
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File('${output.path}/$name.png')
            .writeAsBytes(bytes!.buffer.asUint8List(), flush: true);
        image.dispose();
      });
    }

    final list = fixture.Repo();
    await fixture.pump(tester, list, scale: 2);
    await fixture.reveal(tester, find.textContaining('Activity requests pass'));
    await capture('list-data-flow-320-2x');
    await fixture.reveal(tester, find.textContaining('at most five minutes'));
    await capture('list-lifetime-320-2x');
    expect(list.calls, 1);
    await tester.pumpWidget(const SizedBox());

    final detail = fixture.Repo()..result = Success(fixture.detail);
    final opener = fixture.Opener();
    await fixture.pump(
      tester,
      detail,
      key: fixture.id,
      opener: opener,
      scale: 2,
    );
    await fixture.reveal(tester, find.textContaining('privacy and cookie'));
    await capture('detail-browser-320-2x');
    await fixture.reveal(tester, find.text('Copy source link'));
    await capture('detail-actions-320-2x');
    expect(detail.calls, 1);
    expect(opener.calls, 0);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
