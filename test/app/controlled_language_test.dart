import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/language/data/platform_app_language_repository.dart';
import 'package:enmori/features/language/domain/app_language_repository.dart';
import 'package:enmori/features/language/language_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'actual group root restores the device language and keeps its account route',
    (tester) async {
      String? saved = 'zh';
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(
        PlatformAppLanguageRepository.channel,
        (call) async {
          if (call.method == 'readLanguage') return saved;
          saved = (call.arguments as Map)['language'] as String;
          return true;
        },
      );
      addTearDown(
        () => messenger.setMockMethodCallHandler(
          PlatformAppLanguageRepository.channel,
          null,
        ),
      );

      Future<FakeAuthRepository> start(String key) async {
        final auth = FakeAuthRepository();
        await tester.pumpWidget(
          ControlledDemoApp(
            key: ValueKey(key),
            baseUri: Uri.parse('https://group-fixture.invalid'),
            auth: auth,
            client: MockClient(
              (_) async => throw StateError(
                'Signed-out language must not request product data',
              ),
            ),
            onClose: () async => const Success(null),
            dualAccounts: true,
            eventParticipationEnabled: true,
            remoteGroupEnabled: true,
          ),
        );
        await tester.pump();
        auth.emit(const AuthSessionUnauthenticated());
        await tester.pumpAndSettle();
        return auth;
      }

      final auth = await start('first-start');
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).locale,
        const Locale('zh'),
      );
      final element = tester.element(find.byType(Scaffold).first);
      expect(MaterialLocalizations.of(element).backButtonTooltip, '返回');
      final container = ProviderScope.containerOf(element);
      final router = container.read(appRouterProvider);
      final route = router.state.uri.path;
      await container
          .read(appLanguageProvider.notifier)
          .select(AppLanguage.english);
      await tester.pumpAndSettle();
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).locale,
        const Locale('en'),
      );
      expect(identical(container.read(appRouterProvider), router), isTrue);
      expect(router.state.uri.path, route);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.close();
      final restarted = await start('second-start');
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).locale,
        const Locale('en'),
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await restarted.close();
    },
  );
}
