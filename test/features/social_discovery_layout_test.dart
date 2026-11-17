import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/presentation/identity_avatar.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/presentation/own_avatar_view.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/presentation/discovery_card_page.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final locale in ['en', 'zh']) {
    for (final (label, size, scale, dark) in [
      ('phone', const Size(375, 812), 1.0, false),
      ('large-text', const Size(320, 740), 2.0, false),
      ('landscape', const Size(740, 375), 2.0, false),
      ('dark-fixture', const Size(375, 812), 1.0, true),
    ]) {
      for (final page in ['card', 'discovery', 'activity']) {
        testWidgets(
          '$page keeps identity and actions readable ($locale/$label)',
          (tester) async {
            tester.view.physicalSize = size;
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            await _fonts(tester);
            final api = _api();
            addTearDown(api.close);
            final theme = dark
                ? ThemeData(
                    colorScheme: ColorScheme.fromSeed(
                      seedColor: const Color(0xff244b3f),
                      brightness: Brightness.dark,
                    ),
                  )
                : enmoriTheme();
            await tester.pumpWidget(
              ProviderScope(
                overrides: [
                  backendApiClientProvider.overrideWithValue(api),
                  authSessionProvider.overrideWithValue(
                    const AsyncData(
                      AuthSessionAuthenticated(subject: 'viewer'),
                    ),
                  ),
                  friendDiscoveryRepositoryProvider.overrideWithValue(
                    _Discovery(),
                  ),
                  friendActivityRepositoryProvider.overrideWithValue(
                    _Activities(),
                  ),
                ],
                child: RepaintBoundary(
                  key: const Key('social-capture'),
                  child: MaterialApp(
                    debugShowCheckedModeBanner: false,
                    theme: theme.copyWith(
                      textTheme: theme.textTheme.apply(
                        fontFamilyFallback: ['Preview CJK'],
                      ),
                      appBarTheme: theme.appBarTheme.copyWith(
                        titleTextStyle: theme.appBarTheme.titleTextStyle
                            ?.copyWith(fontFamilyFallback: ['Preview CJK']),
                      ),
                    ),
                    locale: Locale(locale),
                    supportedLocales: const [Locale('en'), Locale('zh')],
                    localizationsDelegates:
                        GlobalMaterialLocalizations.delegates,
                    builder: (context, child) => MediaQuery(
                      data: MediaQuery.of(context).copyWith(
                        textScaler: TextScaler.linear(scale),
                        disableAnimations: true,
                      ),
                      child: child!,
                    ),
                    home: page == 'card'
                        ? const DiscoveryCardPage(username: 'synthetic_friend')
                        : Scaffold(
                            appBar: AppBar(
                              title: Text(locale == 'en' ? 'Friends' : '好友'),
                            ),
                            body: ListView(
                              padding: const EdgeInsets.all(16),
                              children: [
                                if (page == 'discovery')
                                  FriendDiscoveryPanel(
                                    home: false,
                                    onOpenProfile: (_) async {},
                                    onOpenRequests: () async {},
                                  )
                                else
                                  FriendActivityPanel(
                                    home: false,
                                    onOpenProfile: (_, _) async {},
                                    onOpenEvent: (_) async {},
                                  ),
                              ],
                            ),
                          ),
                  ),
                ),
              ),
            );
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            await _capture(tester, '$page-$locale-$label');
            final actions = find.text(switch (page) {
              'card' => locale == 'en' ? 'Friend request' : '好友申请',
              'discovery' => locale == 'en' ? 'View discovery card' : '查看发现名片',
              _ => locale == 'en' ? 'View Profile' : '查看资料',
            });
            if (actions.evaluate().isEmpty) {
              await tester.scrollUntilVisible(
                actions,
                200,
                scrollable: find.byType(Scrollable).first,
                maxScrolls: 80,
              );
            }
            final action = actions.first;
            await tester.ensureVisible(action);
            await tester.pumpAndSettle();
            expect(action.hitTestable(), findsOneWidget);
            expect(tester.takeException(), isNull);
            for (final element in find.byType(IdentityAvatar).evaluate()) {
              final avatar = element.widget as IdentityAvatar;
              final paint = find.descendant(
                of: find.byElementPredicate(
                  (candidate) => identical(candidate, element),
                ),
                matching: find.byType(CircleAvatar),
              );
              expect(tester.getSize(paint), Size.square(avatar.size));
            }
            await _capture(tester, '$page-$locale-$label-actions');
          },
        );
      }
    }
  }
  for (final pixels in [false, true]) {
    testWidgets(
      'discovery avatar stays square under full-width list constraints (pixels=$pixels)',
      (tester) async {
        tester.view.physicalSize = const Size(375, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = BackendApiClient(
          Uri.parse('https://example.invalid'),
          () async => const Success('synthetic'),
          httpClient: MockClient(
            (_) async => http.Response(
              jsonEncode({
                'card': {
                  'username': 'synthetic_friend',
                  'displayName': 'A visible friend',
                },
              }),
              200,
            ),
          ),
        );
        addTearDown(api.close);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              backendApiClientProvider.overrideWithValue(api),
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'viewer')),
              ),
              if (pixels)
                identityAvatarBuilderProvider.overrideWithValue(
                  (username, size) =>
                      AvatarPixels(photo: null, initial: 'S', size: size),
                ),
            ],
            child: MaterialApp(
              theme: enmoriTheme(),
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              supportedLocales: const [Locale('en'), Locale('zh')],
              home: const DiscoveryCardPage(username: 'synthetic_friend'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final avatar = tester.widget<IdentityAvatar>(
          find.byType(IdentityAvatar),
        );
        final paint = pixels
            ? find.byType(ClipOval)
            : find.byType(CircleAvatar);
        expect(tester.getSize(paint), Size.square(avatar.size));
        expect(tester.takeException(), isNull);
      },
    );
  }
}

BackendApiClient _api() => BackendApiClient(
  Uri.parse('https://example.invalid'),
  () async => const Success('synthetic'),
  httpClient: MockClient(
    (request) async => http.Response(
      jsonEncode(
        request.url.path.endsWith('/discovery-card')
            ? {
                'card': {
                  'username': 'synthetic_friend',
                  'displayName': 'Alex · 一位同行者',
                },
              }
            : {
                'error': {
                  'code': 'SERVICE_UNAVAILABLE',
                  'message': 'Synthetic',
                },
              },
      ),
      request.url.path.endsWith('/discovery-card') ? 200 : 503,
      headers: {'content-type': 'application/json; charset=utf-8'},
    ),
  ),
);

class _Discovery implements FriendDiscoveryRepository {
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => const Success([
    FriendSuggestion(
      username: 'synthetic_friend',
      displayName: 'Alex · 一位同行者',
      sharedInterests: ['Music', 'Art', 'Outdoors'],
      commonEventCount: 0,
      reason: 'Shared interests',
      ignoreVersion: 'synthetic-revision',
    ),
    FriendSuggestion(
      username: 'another_friend',
      displayName: 'Jamie · 另一位同行者',
      sharedInterests: ['Photography'],
      commonEventCount: 0,
      reason: 'Shared interests',
      ignoreVersion: 'synthetic-revision',
    ),
  ]);
}

class _Activities implements FriendActivityRepository {
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async => Success(
    [
      FriendActivityItem(
        type: FriendActivityType.checkIn,
        sourceRecordId: 'synthetic-note',
        occurredAt: DateTime.utc(2026, 11, 17, 8),
        username: 'synthetic_friend',
        displayName: 'Alex · 一位同行者',
        note: 'A quiet afternoon with a sketchbook. 午后带着画册走了一会儿。',
        mood: 'Calm',
      ),
      FriendActivityItem(
        type: FriendActivityType.interested,
        sourceRecordId: 'synthetic-plan',
        occurredAt: DateTime.utc(2026, 11, 17, 6),
        username: 'another_friend',
        displayName: 'Jamie · 另一位同行者',
        eventId: 'synthetic-event',
        eventTitle: 'Community art workshop · 社区绘画工作坊',
      ),
    ].where((item) => category == null || item.type == category).toList(),
  );
}

Future<void> _fonts(WidgetTester tester) async {
  if (Platform.environment['ENMORI_SOCIAL_CAPTURE_DIR'] == null) return;
  for (final (family, path) in [
    ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
    ('Preview CJK', Platform.environment['ENMORI_CAPTURE_CJK']),
    ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
    (
      'Playfair Display',
      'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
    ),
  ]) {
    if (path == null) continue;
    await tester.runAsync(() async {
      final bytes = await File(path).readAsBytes();
      await (FontLoader(
        family,
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    });
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_SOCIAL_CAPTURE_DIR'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('social-capture')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
