import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:enmori/features/friends/presentation/friend_module_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final initialDiscovery in [false, true]) {
    testWidgets('Friends initial discovery entry is $initialDiscovery', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'fixture')),
            ),
            friendDiscoveryRepositoryProvider.overrideWithValue(_Discovery()),
          ],
          child: MaterialApp(
            home: FriendModulePage(
              initialDiscovery: initialDiscovery,
              openAttribution: (_) async => false,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final chip = find.widgetWithText(ChoiceChip, 'People you may know');
      expect(tester.widget<ChoiceChip>(chip).selected, initialDiscovery);
      if (!initialDiscovery) {
        await tester.tap(chip);
        await tester.pumpAndSettle();
      }
      expect(tester.widget<ChoiceChip>(chip).selected, isTrue);
      expect(find.byType(FriendDiscoveryPanel), findsOneWidget);
      expect(find.text('No friend recommendations right now'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}

final class _Discovery implements FriendDiscoveryRepository {
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => const Success([]);

  @override
  Future<Result<int>> pendingCount() async => const Success(0);
}
