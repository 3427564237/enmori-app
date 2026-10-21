import 'package:enmori/features/account/domain/account_preferences_repository.dart';

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_place_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_place_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_place_controls.dart';
import 'package:enmori/features/check_in/presentation/located_check_in_controller.dart';
import 'package:enmori/features/check_in/presentation/located_check_in_actions.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/domain/foreground_location.dart';
import 'package:enmori/features/weather/domain/home_weather_repository.dart';
import 'package:enmori/features/weather/presentation/home_weather_controller.dart';
import 'package:enmori/features/weather/weather_providers.dart';

import '../support/fakes.dart';
import '../support/fake_account_preferences.dart';

const key = 'draft-one';
const unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Unavailable',
);
final saved = CheckIn(
  checkInId: 'saved-point',
  note: 'A walk',
  createdAt: DateTime.utc(2026, 10, 20),
  checkInVisibility: CheckInVisibility.private,
  location: const GeoPoint(1.3521, 103.8198),
);
void main() {
  test('saved defaults capture once, keep weather separate, and revoke late GPS results', () async {
    final h = await harness();
    const enabled = OwnSettings(
      defaultCheckInLocation: true,
      defaultCheckInWeather: true,
      checkInVisibility: CheckInVisibility.friendsOnly,
      consent: OptionalProcessingConsent.rejected,
      revision: 2,
    );
    h.preferences.settings = enabled;
    await h.place.captureDefaults(enabled);
    expect(h.location.calls, [true]);
    expect(h.placeState.place!.includeWeather, isTrue);
    expect(h.placeState.place!.settingsRevision, 2);
    h.place.clear();
    const weatherOnly = OwnSettings(
      defaultCheckInWeather: true,
      checkInVisibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.rejected,
      revision: 3,
    );
    await h.place.captureDefaults(weatherOnly);
    expect(h.location.calls, [true]);
    final pending = Completer<Result<GeoPoint>>();
    h.location.pending = pending;
    final capture = h.place.captureDefaults(enabled);
    h.preferences.settings = weatherOnly;
    pending.complete(const Success(GeoPoint(1.3, 103.8)));
    await capture;
    expect(h.placeState.place, isNull);
    expect(h.placeState.busy, isFalse);
  });
  for (final oldResult in <Result<GeoPoint>>[
    const Success(GeoPoint(1.1, 103.1)),
    const Failure(unavailable),
  ]) {
    test(
      'superseded default capture cannot change a newer manual point: ${oldResult.runtimeType}',
      () async {
        final h = await harness();
        const enabled = OwnSettings(
          defaultCheckInLocation: true,
          defaultCheckInWeather: true,
          checkInVisibility: CheckInVisibility.private,
          consent: OptionalProcessingConsent.rejected,
          revision: 2,
        );
        h.preferences.settings = enabled;
        final oldGps = Completer<Result<GeoPoint>>();
        h.location.pending = oldGps;
        final oldCapture = h.place.captureDefaults(enabled);
        expect(h.placeState.busy, isTrue);
        h.place.clear();
        h.location.pending = null;
        const manualPoint = GeoPoint(1.4, 103.9);
        h.location.result = const Success(manualPoint);
        await h.place.capture(expectedEpoch: h.place.epoch);
        final manualState = h.placeState;
        expect(manualState.place!.includeWeather, isFalse);
        oldGps.complete(oldResult);
        await oldCapture;
        expect(h.placeState, same(manualState));
        expect(h.placeState.place!.location, manualPoint);
        expect(h.placeState.place!.includeWeather, isFalse);
        expect(h.placeState.place!.settingsRevision, isNull);
        expect(h.preferences.settingsReadCount, 0);
        expect(h.location.calls, [true, true]);
      },
    );
  }
  for (final cancel in [false, true]) {
    testWidgets(
      'location preparation explains disabled save and recovers cancel=$cancel',
      (tester) async {
        final h = await harness();
        h.preferences.settings = const OwnSettings(
          defaultCheckInLocation: true,
          defaultCheckInWeather: true,
          checkInVisibility: CheckInVisibility.private,
          consent: OptionalProcessingConsent.rejected,
          revision: 2,
        );
        final gps = Completer<Result<GeoPoint>>();
        h.location.pending = gps;
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: h.container,
            child: MaterialApp(
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(disableAnimations: true),
                child: child!,
              ),
              home: const CheckInComposerPage(socialStyle: true, located: true),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final input = find.byType(TextField).first;
        await tester.enterText(input, 'Keep my walking note');
        await tester.pumpAndSettle();
        final preparing = find.widgetWithText(
          FilledButton,
          'Preparing location…',
        );
        await tester.ensureVisible(preparing);
        expect(tester.widget<FilledButton>(preparing).onPressed, isNull);
        expect(
          find.text('Wait for location, or cancel to save without it.'),
          findsOneWidget,
        );
        expect(h.repository.keys, isEmpty);
        if (cancel) {
          await tester.ensureVisible(find.text('Cancel location'));
          await tester.tap(find.text('Cancel location'));
          await tester.pumpAndSettle();
          gps.complete(const Success(GeoPoint(1.3, 103.8)));
        } else {
          gps.complete(const Failure(unavailable));
        }
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(input).controller!.text,
          'Keep my walking note',
        );
        expect(
          tester
              .widget<FilledButton>(
                find.widgetWithText(FilledButton, 'Save Check-in'),
              )
              .onPressed,
          isNotNull,
        );
        if (!cancel) {
          expect(find.textContaining('Location unavailable.'), findsOneWidget);
        }
        if (cancel) h.repository.result = const Failure(unavailable);
        await tester.ensureVisible(find.text('Save Check-in'));
        await tester.tap(find.text('Save Check-in'));
        await tester.pumpAndSettle();
        expect(h.repository.places, [null]);
        if (cancel) {
          expect(find.text('Retry same save'), findsOneWidget);
          expect(
            tester.widget<TextField>(input).controller!.text,
            'Keep my walking note',
          );
          await tester.ensureVisible(find.text('Retry same save'));
          await tester.tap(find.text('Retry same save'));
          await tester.pumpAndSettle();
          expect(h.repository.keys, ['fixed-key', 'fixed-key']);
          expect(h.repository.places, [null, null]);
        }
        expect(tester.takeException(), isNull);
      },
    );
  }
  test('guarded GET still rejects creation status and revoked POST never dispatches', () async {
    var dispatched = 0;
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () async => const Success('fixture-token'),
      httpClient: MockClient((_) async {
        dispatched++;
        return http.Response('{}', 201);
      }),
    );
    addTearDown(client.close);
    expect(
      await client.getGuarded('/v1/me/settings', () => true),
      isA<Failure<JsonObject>>(),
    );
    expect(
      await client.post('/v1/check-ins', isEligible: () => false),
      isA<Failure<JsonObject>>(),
    );
    expect(dispatched, 1);
  });
  test('location is single explicit acquisition; weather consent stays separate and carries current settings revision', () async {
    final h = await harness();
    expect(h.location.calls, isEmpty);
    await h.place.capture(expectedEpoch: h.place.epoch);
    expect(h.location.calls, [true]);
    expect(h.placeState.place!.includeWeather, isFalse);
    expect(h.preferences.settingsReadCount, 0);
    await h.place.allowWeather(true, expectedEpoch: h.place.epoch);
    expect(h.placeState.place!.toJson()['weatherRequest'], {
      'position': {'latitude': 1.4, 'longitude': 103.8},
      'expectedSettingsRevision': 0,
    });
    await h.place.allowWeather(false, expectedEpoch: h.place.epoch);
    expect(h.placeState.place!.toJson().containsKey('weatherRequest'), isFalse);
  });
  test('same UID replacement and explicit clear reject late location and old permission confirmation', () async {
    final h = await harness(), pending = Completer<Result<GeoPoint>>();
    h.location.pending = pending;
    final epoch = h.place.epoch, call = h.place.capture(expectedEpoch: epoch);
    h.auth.emit(AuthSessionAuthenticated(subject: 'same'));
    await h.container.pump();
    pending.complete(const Success(GeoPoint(1, 2)));
    await call;
    expect(h.placeState.place, isNull);
    await h.place.allowWeather(true, expectedEpoch: epoch);
    expect(h.preferences.settingsReadCount, 0);
  });
  test('permission rejection does not prevent location-free save and independent reread', () async {
    final h = await harness();
    h.location.result = const Failure(unavailable);
    await h.place.capture(expectedEpoch: h.place.epoch);
    await h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'A walk',
      visibility: CheckInVisibility.private,
    );
    expect(h.repository.places, [null]);
    expect(h.state.savedId, 'saved-point');
    await h.save.read('saved-point');
    expect(h.own.readIds, ['saved-point']);
    expect(h.state.notice, isNull);
  });
  test('duplicate save dispatches once; late success cannot appear in replacement session', () async {
    final h = await harness(),
        pending = Completer<Result<CheckInSaveReceipt>>();
    h.repository.pending = pending;
    final first = h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'A walk',
      visibility: CheckInVisibility.private,
    );
    await h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'A walk',
      visibility: CheckInVisibility.private,
    );
    expect(h.repository.keys.length, 1);
    h.auth.emit(AuthSessionAuthenticated(subject: 'same'));
    await h.container.pump();
    pending.complete(Success(CheckInSaveReceipt(saved)));
    await first;
    expect(h.state.value, isNull);
    expect(h.state.savedId, isNull);
  });
  test('unconfirmed save retains exact key/payload; changed text cannot start a second operation', () async {
    final h = await harness();
    h.repository.result = const Failure(unavailable);
    await h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'A walk',
      visibility: CheckInVisibility.private,
    );
    await h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'Changed',
      visibility: CheckInVisibility.private,
    );
    expect(h.repository.keys.length, 1);
    await h.save.save(
      expectedEpoch: h.save.epoch,
      note: 'A walk',
      visibility: CheckInVisibility.private,
    );
    expect(h.repository.keys, ['fixed-key', 'fixed-key']);
  });
  test('saved location/weather removal uses a confirmation epoch and current revision; failed read clears old value', () async {
    final h = await harness();
    await h.save.read('saved-point');
    final epoch = h.save.epoch;
    await h.save.remove(location: true, expectedEpoch: epoch);
    expect(h.repository.removals, 1);
    expect(h.state.value!.location, isNull);
    await h.save.remove(location: true, expectedEpoch: epoch);
    expect(h.repository.removals, 1);
    h.own.readResult = const Failure(unavailable);
    await h.save.read('saved-point');
    expect(h.state.value, isNull);
    expect(h.state.failure, unavailable);
  });
  test('Home uses separate explicit coarse capture and never reuses a Check-in point', () async {
    final h = await harness();
    h.container.listen(homeWeatherControllerProvider, (_, _) {});
    final home = h.container.read(homeWeatherControllerProvider.notifier);
    await h.place.capture(expectedEpoch: h.place.epoch);
    expect(h.home.points, isEmpty);
    await home.load(expectedEpoch: home.epoch);
    expect(h.location.calls, [true, false]);
    expect(h.home.points.single.toJson(), {
      'latitude': 1.4,
      'longitude': 103.8,
    });
    expect(h.placeState.place!.includeWeather, isFalse);
  });
  test('HTTP create sends exact point only to Backend and separate coarse Weather request; transient notice does not become Weather', () async {
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('fixture'),
      httpClient: MockClient((request) async {
        final body = jsonDecode(request.body) as Map;
        expect(body['location'], {'latitude': 1.3521, 'longitude': 103.8198});
        expect(body['weatherRequest'], {
          'position': {'latitude': 1.4, 'longitude': 103.8},
          'expectedSettingsRevision': 7,
        });
        return http.Response(
          jsonEncode({
            'checkIn': {
              'checkInId': 'saved-point',
              'note': 'A walk',
              'createdAt': '2026-10-20T00:00:00.000Z',
              'revision': 1,
              'checkInVisibility': 'private',
            },
            'notice': 'Check-in saved without weather.',
          }),
          201,
        );
      }),
    );
    addTearDown(client.close);
    final response = await BackendCheckInPlaceRepository(client).create(
      note: 'A walk',
      visibility: CheckInVisibility.private,
      idempotencyKey: 'key',
      isEligible: () => true,
      place: const CheckInPlace(
        location: GeoPoint(1.3521, 103.8198),
        includeWeather: true,
        settingsRevision: 7,
      ),
    );
    expect(response, isA<Success<CheckInSaveReceipt>>());
    expect(
      (response as Success<CheckInSaveReceipt>).value.checkIn.weather,
      isNull,
    );
  });
  testWidgets(
    'explicit location dialog and weather controls remain usable at 2x text; native inactive does not discard permission sheet result',
    (tester) async {
      final location = LocationFake();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [foregroundLocationProvider.overrideWithValue(location)],
          child: MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: const Scaffold(
              body: SingleChildScrollView(
                child: CheckInPlaceControls(draftKey: key),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(location.calls, isEmpty);
      await tester.ensureVisible(find.text('Use location once'));
      await tester.tap(find.text('Use location once'));
      await tester.pumpAndSettle();
      expect(location.calls, isEmpty);
      await tester.tap(find.text('Use once'));
      await tester.pumpAndSettle();
      expect(location.calls, [true]);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      expect(find.text('One Check-in point is ready to save.'), findsOneWidget);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(CheckInPlaceControls)),
      );
      expect(container.read(checkInPlaceControllerProvider(key)).place, isNull);
      // Flutter intentionally stops drawing frames while paused.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(find.text('One Check-in point is ready to save.'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'module save slot surfaces fallback, then independently reads and confirms location removal',
    (tester) async {
      final repository = PlaceFake(),
          own = FakeCheckInRepository()..readResult = Success(saved);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith(
              (ref) =>
                  Stream.value(AuthSessionAuthenticated(subject: 'fixture')),
            ),
            checkInPlaceRepositoryProvider.overrideWithValue(repository),
            checkInRepositoryProvider.overrideWithValue(own),
            idempotencyKeyGeneratorProvider.overrideWithValue(
              FakeIdempotencyKeyGenerator(['key']),
            ),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: LocatedCheckInActions(
                  draftKey: key,
                  note: 'A walk',
                  visibility: CheckInVisibility.private,
                  openAttribution: (_) async => true,
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Save Check-in'));
      await tester.tap(find.text('Save Check-in'));
      await tester.pumpAndSettle();
      expect(find.text('Check-in saved without weather.'), findsOneWidget);
      await tester.ensureVisible(find.text('Saved location and recovery'));
      await tester.tap(find.text('Saved location and recovery'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Read saved Check-in'));
      await tester.tap(find.text('Read saved Check-in'));
      await tester.pumpAndSettle();
      expect(own.readIds, ['saved-point']);
      await tester.ensureVisible(find.text('Remove saved location'));
      await tester.tap(find.text('Remove saved location'));
      await tester.pumpAndSettle();
      expect(repository.removals, 0);
      await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
      await tester.pumpAndSettle();
      expect(repository.removals, 1);
      expect(tester.takeException(), isNull);
    },
  );
}

class LocationFake implements ForegroundLocation {
  final calls = <bool>[];
  Completer<Result<GeoPoint>>? pending;
  Result<GeoPoint> result = const Success(GeoPoint(1.3521, 103.8198));
  @override
  Future<Result<GeoPoint>> capture({required bool precise}) {
    calls.add(precise);
    return pending?.future ?? Future.value(result);
  }
}

class HomeFake implements HomeWeatherRepository {
  final points = <GeoPoint>[];
  @override
  Future<Result<WeatherSnapshot>> current(
    GeoPoint position, {
    required int settingsRevision,
  }) async {
    points.add(position);
    return const Failure(unavailable);
  }
}

class PlaceFake implements CheckInPlaceRepository {
  final keys = <String>[], places = <CheckInPlace?>[];
  final labels = <String?>[], moods = <String?>[], activities = <String?>[];
  final visibilities = <CheckInVisibility>[];
  int removals = 0;
  Completer<Result<CheckInSaveReceipt>>? pending;
  Result<CheckInSaveReceipt> result = Success(
    CheckInSaveReceipt(saved, notice: 'Check-in saved without weather.'),
  );
  @override
  Future<Result<CheckInSaveReceipt>> create({
    String? locationLabel,
    required String note,
    String? mood,
    String? activity,
    required CheckInVisibility visibility,
    CheckInPlace? place,
    required String idempotencyKey,
    bool Function()? isEligible,
  }) {
    keys.add(idempotencyKey);
    labels.add(locationLabel);
    moods.add(mood);
    activities.add(activity);
    visibilities.add(visibility);
    places.add(place);
    return pending?.future ?? Future.value(result);
  }

  @override
  Future<Result<CheckIn>> removeLocation({
    required CheckIn checkIn,
    bool Function()? isEligible,
  }) async {
    removals++;
    return Success(
      CheckIn(
        checkInId: checkIn.checkInId,
        note: checkIn.note,
        createdAt: checkIn.createdAt,
        revision: checkIn.revision + 1,
        checkInVisibility: checkIn.checkInVisibility,
      ),
    );
  }

  @override
  Future<Result<CheckIn>> removeWeatherPermission({
    required CheckIn checkIn,
    bool Function()? isEligible,
  }) => removeLocation(checkIn: checkIn);
  @override
  Future<Result<CheckIn>> replaceLocation({
    required CheckIn checkIn,
    required GeoPoint location,
    bool Function()? isEligible,
  }) async => Success(
    CheckIn(
      checkInId: checkIn.checkInId,
      note: checkIn.note,
      createdAt: checkIn.createdAt,
      revision: checkIn.revision + 1,
      checkInVisibility: checkIn.checkInVisibility,
      location: location,
    ),
  );
}

class Harness {
  Harness(
    this.container,
    this.auth,
    this.location,
    this.preferences,
    this.repository,
    this.own,
    this.home,
  );
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final LocationFake location;
  final FakeAccountPreferences preferences;
  final PlaceFake repository;
  final FakeCheckInRepository own;
  final HomeFake home;
  CheckInPlaceController get place =>
      container.read(checkInPlaceControllerProvider(key).notifier);
  CheckInPlaceState get placeState =>
      container.read(checkInPlaceControllerProvider(key));
  LocatedCheckInController get save =>
      container.read(locatedCheckInControllerProvider(key).notifier);
  LocatedCheckInState get state =>
      container.read(locatedCheckInControllerProvider(key));
}

Future<Harness> harness() async {
  final auth = FakeAuthRepository(),
      location = LocationFake(),
      preferences = FakeAccountPreferences(),
      repository = PlaceFake(),
      own = FakeCheckInRepository()..readResult = Success(saved),
      home = HomeFake();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      foregroundLocationProvider.overrideWithValue(location),
      accountPreferencesRepositoryProvider.overrideWithValue(preferences),
      checkInPlaceRepositoryProvider.overrideWithValue(repository),
      checkInRepositoryProvider.overrideWithValue(own),
      homeWeatherRepositoryProvider.overrideWithValue(home),
      idempotencyKeyGeneratorProvider.overrideWithValue(
        FakeIdempotencyKeyGenerator(['fixed-key', 'new-key']),
      ),
    ],
  );
  addTearDown(container.dispose);
  addTearDown(auth.close);
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'same'));
  await container.read(authSessionProvider.future);
  container.listen(checkInPlaceControllerProvider(key), (_, _) {});
  container.listen(locatedCheckInControllerProvider(key), (_, _) {});
  return Harness(container, auth, location, preferences, repository, own, home);
}
