import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('language changes preserve chat content and guided draft input', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final locale = ValueNotifier(const Locale('en'));
    addTearDown(locale.dispose);
    final controller = _Controller();
    if (Platform.environment['ENMORI_AI_CAPTURE'] != null) {
      final path = Platform.environment['ENMORI_AI_CAPTURE_FONT'];
      final bytes = path == null
          ? null
          : await tester.runAsync(() => File(path).readAsBytes());
      for (final (family, asset) in [
        (
          'Playfair Display',
          'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
        ),
        ('MaterialIcons', 'fonts/MaterialIcons-Regular.otf'),
      ]) {
        await tester.runAsync(() {
          final loader = FontLoader(family)..addFont(rootBundle.load(asset));
          if (family == 'Playfair Display' && bytes != null) {
            loader.addFont(Future.value(ByteData.sublistView(bytes)));
          }
          return loader.load();
        });
      }
      if (bytes != null) {
        await tester.runAsync(
          () => (FontLoader(
            'Roboto',
          )..addFont(Future.value(ByteData.sublistView(bytes)))).load(),
        );
      }
    }
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          aiConversationControllerProvider.overrideWith(() => controller),
        ],
        child: RepaintBoundary(
          key: const Key('ai-capture'),
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: enmoriTheme(),
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            supportedLocales: const [Locale('en'), Locale('zh')],
            builder: (context, child) => ValueListenableBuilder(
              valueListenable: locale,
              builder: (context, language, _) => Localizations.override(
                context: context,
                locale: language,
                child: MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(disableAnimations: true),
                  child: child!,
                ),
              ),
            ),
            home: AiConversationPage(
              onBack: () {},
              onOpenSettings: () {},
              onOpenPersonas: () {},
              socialStyle: true,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final input = find.byKey(const Key('ai-message-input'));
    await tester.enterText(input, 'My own words');
    locale.value = const Locale('zh');
    await tester.pumpAndSettle();
    expect(find.text('AI 伙伴'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(
      find.text('Sending…'),
      findsOneWidget,
    ); // Actual model text, unchanged.
    expect(tester.widget<TextField>(input).controller!.text, 'My own words');
    await tester.tap(find.byTooltip('打开对话菜单'));
    await tester.pumpAndSettle();
    expect(find.text('历史对话'), findsOneWidget);
    expect(find.text('暂无已保存的对话。'), findsOneWidget);
    expect(find.text('当前人设'), findsOneWidget);
    tester.state<ScaffoldState>(find.byType(Scaffold)).closeDrawer();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ai-make-plan')));
    await tester.pumpAndSettle();
    expect(find.text('制定小计划'), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.byKey(const Key('ai-plan-goal')))
          .controller!
          .text,
      'My own words',
    );
    await tester.enterText(
      find.byKey(const Key('ai-plan-goal')),
      'Prepare for my exam',
    );
    await tester.enterText(
      find.byKey(const Key('ai-plan-limits')),
      'Twenty minutes today',
    );
    locale.value = const Locale('en');
    await tester.pumpAndSettle();
    expect(find.text('Make a small plan'), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.byKey(const Key('ai-plan-goal')))
          .controller!
          .text,
      'Prepare for my exam',
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await _capture(tester, 'small-plan-form-en');
    await tester.ensureVisible(find.byKey(const Key('ai-plan-review')));
    await tester.tap(find.byKey(const Key('ai-plan-review')));
    await tester.pumpAndSettle();
    final review = find.byKey(const Key('ai-plan-message'));
    final original = tester.widget<TextField>(review).controller!.text;
    expect(original, contains('Prepare for my exam'));
    await _capture(tester, 'small-plan-review-en');
    locale.value = const Locale('zh');
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(review).controller!.text, original);
    expect(find.text('替换对话草稿'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('ai-plan-apply')));
    await tester.tap(find.byKey(const Key('ai-plan-apply')));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(input).controller!.text, original);
    expect(controller.sends, 0);
    controller.unresolved();
    await tester.pumpAndSettle();
    expect(find.text('核对结果'), findsOneWidget);
    expect(find.text('已请求取消，但尚未确认结果。'), findsOneWidget);
    expect(find.byKey(const Key('ai-make-plan')), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_AI_CAPTURE'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('ai-capture')),
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

class _Controller extends AiConversationController {
  int sends = 0;
  @override
  AiConversationState build() => AiConversationState(
    sessionKey: 'session',
    canSend: true,
    canBrowseHistory: true,
    historyLoaded: true,
    messages: [
      AiMessage(
        messageId: 'u',
        sequence: 1,
        role: AiRole.user,
        persistedAt: DateTime.utc(2026, 10, 23),
        availability: AiAvailability.available,
        text: 'Active',
      ),
      AiMessage(
        messageId: 'a',
        sequence: 2,
        role: AiRole.assistant,
        persistedAt: DateTime.utc(2026, 10, 23),
        availability: AiAvailability.available,
        text: 'Sending…',
      ),
    ],
  );
  void unresolved() => state = AiConversationState(
    sessionKey: 'session',
    phase: AiConversationPhase.unknown,
    statusMessage: 'Cancellation requested. The result has not been confirmed.',
    canCheckResult: true,
  );
  @override
  Future<void> send(String text) async {
    sends++;
  }
}
