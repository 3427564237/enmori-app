import 'package:enmori/features/account/domain/account_preferences_repository.dart';

import 'dart:async';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_place_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controller.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/weather_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import '../support/fake_account_preferences.dart';
import 'located_check_in_flow_test.dart' as fixtures;

void main() {
  testWidgets('late settings read in background does not start default GPS', (
    tester,
  ) async {
    final pending = Completer<Result<OwnSettings>>();
    final preferences = FakeAccountPreferences()
      ..settingsReads.add(pending.future);
    final location = fixtures.LocationFake();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
          ),
          accountPreferencesRepositoryProvider.overrideWithValue(preferences),
          checkInRepositoryProvider.overrideWithValue(FakeCheckInRepository()),
          foregroundLocationProvider.overrideWithValue(location),
        ],
        child: MaterialApp(
          theme: enmoriTheme(),
          home: const CheckInComposerPage(located: true, socialStyle: true),
        ),
      ),
    );
    await tester.pump();
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    pending.complete(
      const Success(
        OwnSettings(
          defaultCheckInLocation: true,
          defaultCheckInWeather: true,
          checkInVisibility: CheckInVisibility.private,
          consent: OptionalProcessingConsent.rejected,
          revision: 2,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(location.calls, isEmpty);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(location.calls, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'defaults apply once; custom labels and per-draft GPS removal reach the saved request',
    (tester) async {
      tester.view.physicalSize = const Size(375, 812);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final preferences = FakeAccountPreferences()
        ..settings = const OwnSettings(
          defaultCheckInLocation: true,
          defaultCheckInWeather: true,
          checkInVisibility: CheckInVisibility.friendsOnly,
          consent: OptionalProcessingConsent.rejected,
          revision: 2,
        );
      final place = fixtures.PlaceFake(), location = fixtures.LocationFake();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
            ),
            accountPreferencesRepositoryProvider.overrideWithValue(preferences),
            checkInRepositoryProvider.overrideWithValue(
              FakeCheckInRepository(),
            ),
            checkInPlaceRepositoryProvider.overrideWithValue(place),
            foregroundLocationProvider.overrideWithValue(location),
            idempotencyKeyGeneratorProvider.overrideWithValue(
              FakeIdempotencyKeyGenerator(['custom-draft']),
            ),
          ],
          child: MaterialApp(
            theme: enmoriTheme(),
            home: const CheckInComposerPage(located: true, socialStyle: true),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(location.calls, [true]);
      expect(find.byType(AlertDialog), findsNothing);
      for (final pair in [
        ('Mood', 'Grateful'),
        ('Activity', 'Painting'),
        ('Location', 'Campus garden'),
      ]) {
        await tester.tap(find.text(pair.$1));
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextFormField), pair.$2);
        await tester.ensureVisible(find.text('Apply'));
        await tester.tap(find.text('Apply'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.byKey(const Key('check-in-permissions')));
      await tester.pumpAndSettle();
      expect(find.text('Friends only'), findsWidgets);
      await tester.tap(find.text('Remove location'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Save Check-in'));
      await tester.tap(find.text('Save Check-in'));
      await tester.pumpAndSettle();
      expect(place.labels, ['Campus garden']);
      expect(place.moods, ['Grateful']);
      expect(place.activities, ['Painting']);
      expect(place.visibilities, [CheckInVisibility.friendsOnly]);
      expect(place.places, [null]);
      expect(location.calls, [true]);
      expect(find.text('Check-in saved.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'draft Back protection, same-request recovery, saved snapshot and exact detail read',
    (tester) async {
      tester.view.physicalSize = const Size(375, 812);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final auth = FakeAuthRepository();
      addTearDown(auth.close);
      final place = fixtures.PlaceFake();
      final own = FakeCheckInRepository();
      final pending = Completer<Result<CheckInSaveReceipt>>();
      place.pending = pending;
      final saved = CheckIn(
        checkInId: 'stable-id',
        note: 'A quiet walk',
        createdAt: DateTime.utc(2026, 10, 21),
        mood: 'Calm',
        activity: 'Travel',
        checkInVisibility: CheckInVisibility.private,
        location: const GeoPoint(1.3521, 103.8198),
        weather: WeatherSnapshot(
          observedAt: DateTime.utc(2026, 10, 21),
          temperatureCelsius: 29,
          condition: WeatherCondition.clear,
        ),
      );
      own.readResult = Success(saved);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWithValue(auth),
            accountPreferencesRepositoryProvider.overrideWithValue(
              FakeAccountPreferences(),
            ),
            checkInRepositoryProvider.overrideWithValue(own),
            checkInPlaceRepositoryProvider.overrideWithValue(place),
            foregroundLocationProvider.overrideWithValue(
              fixtures.LocationFake(),
            ),
            idempotencyKeyGeneratorProvider.overrideWithValue(
              FakeIdempotencyKeyGenerator(['same-request']),
            ),
          ],
          child: MaterialApp(
            theme: enmoriTheme(),
            home: Builder(
              builder: (context) => Scaffold(
                body: FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => CheckInComposerPage(
                        located: true,
                        socialStyle: true,
                        onReturnHome: () => Navigator.of(context).pop(),
                        onOpenSaved: (id) =>
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => SavedCheckInPage(
                                  placeActions: true,
                                  checkInId: id,
                                  onReturnHome: () =>
                                      Navigator.of(context).pop(),
                                ),
                              ),
                            ),
                      ),
                    ),
                  ),
                  child: const Text('Start Check-in'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start Check-in'));
      await tester.pumpAndSettle();
      auth.emit(AuthSessionAuthenticated(subject: 'owner'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Location'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), 'Campus garden');
      await tester.ensureVisible(find.text('Apply'));
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard this draft?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(find.text('Campus garden'), findsOneWidget);
      final note = find.byKey(const Key('r6-check-in-note'));
      await tester.enterText(note, 'A quiet walk');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard this draft?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(note).controller!.text, 'A quiet walk');
      await tester.ensureVisible(find.text('Save Check-in'));
      await tester.tap(find.text('Save Check-in'));
      await tester.pump();
      expect(place.keys, ['same-request']);
      expect(tester.widget<TextField>(note).enabled, isFalse);
      pending.complete(const Failure(fixtures.unavailable));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(note).controller!.text, 'A quiet walk');
      place.pending = null;
      place.result = Success(CheckInSaveReceipt(saved));
      await tester.ensureVisible(find.text('Retry same save'));
      await tester.tap(find.text('Retry same save'));
      await tester.pumpAndSettle();
      expect(place.keys, ['same-request', 'same-request']);
      expect(note, findsNothing);
      expect(find.text('Check-in saved.'), findsOneWidget);
      expect(find.text('Weather at Check-in'), findsOneWidget);
      expect(find.text('Saved location'), findsOneWidget);
      expect(find.text('Read saved Check-in'), findsNothing);
      await tester.ensureVisible(find.text('View saved Check-in'));
      await tester.tap(find.text('View saved Check-in'));
      await tester.pumpAndSettle();
      expect(own.readIds, ['stable-id']);
      expect(find.text('Mood: Calm'), findsOneWidget);
      expect(find.text('Activity: Travel'), findsOneWidget);
      expect(find.text('Weather at Check-in'), findsOneWidget);
      await tester.ensureVisible(find.text('Saved location and recovery'));
      await tester.tap(find.text('Saved location and recovery'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Remove saved location'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Remove saved location'));
      await tester.pumpAndSettle();
      expect(place.removals, 0);
      await tester.tap(find.text('Keep'));
      await tester.pumpAndSettle();
      expect(place.removals, 0);
      final removed = CheckIn(
        checkInId: saved.checkInId,
        note: saved.note,
        createdAt: saved.createdAt,
        revision: 2,
        checkInVisibility: saved.checkInVisibility,
      );
      own.readResult = Success(removed);
      await tester.ensureVisible(find.text('Remove saved location'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Remove saved location'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
      await tester.pumpAndSettle();
      expect(place.removals, 1);
      expect(own.readIds, ['stable-id', 'stable-id']);
      expect(find.text('Saved location'), findsNothing);
      expect(find.text('Weather at Check-in'), findsNothing);
      // Reopen the freshly read revision and replace with one explicit capture.
      final replaced = CheckIn(
        checkInId: saved.checkInId,
        note: saved.note,
        createdAt: saved.createdAt,
        revision: 3,
        checkInVisibility: saved.checkInVisibility,
        location: const GeoPoint(1.3521, 103.8198),
      );
      own.readResult = Success(replaced);
      await tester.ensureVisible(find.text('Saved location and recovery'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Saved location and recovery'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Replace saved location'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Replace saved location'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use once'));
      await tester.pumpAndSettle();
      expect(own.readIds, ['stable-id', 'stable-id', 'stable-id']);
      expect(find.text('Saved location'), findsOneWidget);
      expect(find.text('Weather at Check-in'), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Start Check-in'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
