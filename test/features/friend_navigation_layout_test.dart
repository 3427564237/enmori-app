import 'dart:convert';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:enmori/features/friends/presentation/friend_module_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final language in ['en', 'zh']) {
    for (final (width, scale) in [
      (320.0, 1.0),
      (320.0, 2.0),
      (375.0, 2.0),
      (740.0, 2.0),
    ]) {
      testWidgets(
        'Friends tab labels fit and each destination remains reachable ($language/$width/$scale)',
        (tester) async {
          await _pump(
            tester,
            language: language,
            width: width,
            scale: scale,
            repository: _Discovery(0),
            child: FriendModulePage(
              initialDiscovery: true,
              openAttribution: (_) async => false,
            ),
          );
          final labels = language == 'en'
              ? ['My friends', 'Activity', 'Discover']
              : ['我的好友', '动态', '发现'];
          for (final label in labels) {
            final paragraph = tester.renderObject<RenderParagraph>(
              find.text(label),
            );
            expect(
              paragraph.getMaxIntrinsicWidth(double.infinity),
              lessThanOrEqualTo(paragraph.size.width + .1),
              reason:
                  '$label must fit without fading or clipping at the selected text scale',
            );
          }
          for (final index in [0, 1, 2, 0]) {
            final tab = find.widgetWithText(Tab, labels[index]);
            await tester.ensureVisible(tab);
            await tester.pumpAndSettle();
            expect(tab.hitTestable(), findsOneWidget);
            await tester.tap(tab);
            await tester.pumpAndSettle();
            expect(DefaultTabController.of(tester.element(tab)).index, index);
            expect(tester.takeException(), isNull);
          }
        },
      );
    }
    for (final count in [1, 2, 3]) {
      testWidgets(
        'Discover end notice follows the final visible card without changing groups ($language/$count)',
        (tester) async {
          final repository = _Discovery(count);
          await _pump(
            tester,
            language: language,
            width: 375,
            scale: 1,
            repository: repository,
            child: Scaffold(
              body: SingleChildScrollView(
                child: FriendDiscoveryPanel(
                  home: false,
                  onOpenProfile: (_) async {},
                  onOpenRequests: () async {},
                ),
              ),
            ),
          );
          final end = find.text(
            language == 'en'
                ? 'You have reached the end of this list.'
                : '已浏览到本次推荐列表的末尾。',
          );
          final next = find.byKey(
            const Key('friend-recommendations-next-group'),
          );
          if (count == 3) {
            expect(end, findsNothing);
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_0')),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_1')),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_2')),
              findsNothing,
            );
            await tester.tap(next);
            await tester.pumpAndSettle();
          }
          final last = find.byKey(
            ValueKey('friend-suggestion-member_${count - 1}'),
          );
          expect(end, findsOneWidget);
          expect(
            tester.getTopLeft(end).dy,
            greaterThanOrEqualTo(tester.getBottomLeft(last).dy),
            reason: 'The end notice must come after the current final recommendation',
          );
          expect(next, findsNothing);
          if (count == 3) {
            await tester.tap(
              find.text(language == 'en' ? 'Previous group' : '上一组'),
            );
            await tester.pumpAndSettle();
            expect(end, findsNothing);
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_0')),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_1')),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('friend-suggestion-member_2')),
              findsNothing,
            );
          }
          expect(
            repository.reads,
            1,
            reason: 'Grouping remains local to the same returned recommendation snapshot',
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

Future<void> _pump(
  WidgetTester tester, {
  required String language,
  required double width,
  required double scale,
  required _Discovery repository,
  required Widget child,
}) async {
  tester.view.physicalSize = Size(width, 740);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final api = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient(
      (_) async => http.Response(
        jsonEncode({
          'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Synthetic'},
        }),
        503,
      ),
    ),
  );
  addTearDown(api.close);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'synthetic')),
        ),
        backendApiClientProvider.overrideWithValue(api),
        friendDiscoveryRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        locale: Locale(language),
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: child,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final class _Discovery implements FriendDiscoveryRepository {
  _Discovery(this.count);
  final int count;
  int reads = 0;
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async {
    reads++;
    return Success([
      for (var i = 0; i < count; i++)
        FriendSuggestion(
          username: 'member_$i',
          displayName: 'Member $i',
          sharedInterests: const [],
          commonEventCount: 0,
          reason: 'Shared interests',
          ignoreVersion: 'synthetic-$i',
        ),
    ]);
  }
}
