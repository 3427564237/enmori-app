import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/profile_location_repository.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';

class _Location implements ProfileLocationRepository {
  int calls = 0;
  Result<String> result = const Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: 'Location permission was not granted.',
    ),
  );
  @override
  Future<Result<String>> currentRegionCoordinates() async {
    calls++;
    return result;
  }
}

void main() {
  testWidgets(
    'GPS requires confirmation, denial preserves draft, success is saved only by Save',
    (tester) async {
      final prefs = FakeAccountPreferences(), location = _Location();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            accountPreferencesRepositoryProvider.overrideWithValue(prefs),
            profileLocationRepositoryProvider.overrideWithValue(location),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionAuthenticated(subject: 'fixture'),
              ),
            ),
          ],
          child: const MaterialApp(
            home: AccountPreferencesPage(view: PreferencesView.profile),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('profile-region')));
      await tester.enterText(
        find.byKey(const Key('profile-region')),
        'Singapore',
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('profile-sync-location')),
      );
      await tester.tap(find.byKey(const Key('profile-sync-location')));
      await tester.pumpAndSettle();
      expect(location.calls, 0);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(location.calls, 0);
      await tester.tap(find.byKey(const Key('profile-sync-location')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(find.text('Singapore'), findsOneWidget);
      expect(
        tester
            .widget<Text>(find.byKey(const Key('profile-location-message')))
            .data,
        'Location permission was not granted.',
      );
      expect(prefs.profileNames, isEmpty);
      location.result = const Success('1.3°, 103.8°');
      await tester.tap(find.byKey(const Key('profile-sync-location')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(prefs.profileNames, isEmpty);
      await tester.tap(find.byKey(const Key('profile-save')));
      await tester.pumpAndSettle();
      expect(prefs.profile.details.region, '1.3°, 103.8°');
      expect(find.text('Profile saved.'), findsOneWidget);
    },
  );
}
