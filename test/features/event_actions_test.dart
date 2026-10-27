import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/event_detail/domain/event_actions.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/data/backend_event_detail_repository.dart';
import 'package:enmori/features/event_detail/data/platform_event_actions.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_action_buttons.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const address = VenueAddress(
  street: '1 Example Road',
  city: 'Singapore',
  postalCode: '123456',
  countryCode: 'SG',
);
EventDetail event({bool located = true, DateTime? end}) => EventDetail(
  eventId: 'event',
  title: 'Synthetic event',
  startAt: DateTime.utc(2026, 11, 1, 10),
  endAt: end,
  externalSourceUrl: 'https://ticketmaster.sg/event/synthetic',
  venueAddress: located ? address : null,
  locationLabel: 'Synthetic venue',
);
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final calls = <MethodCall>[];
  setUp(() {
    calls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(PlatformEventActions.channel, (call) async {
          calls.add(call);
          return true;
        });
  });
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(PlatformEventActions.channel, null),
  );
  test(
    'new client opts in and rejects incomplete or malformed address DTOs',
    () async {
      Object? raw = {
        'street': '1 Example Road',
        'city': 'Singapore',
        'postalCode': '123456',
        'countryCode': 'SG',
      };
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          expect(request.url.queryParameters, {'includeVenueAddress': 'true'});
          return http.Response(
            jsonEncode({
              'event': {
                'eventId': 'event',
                'title': 'Synthetic',
                'startAt': '2026-11-01T10:00:00Z',
                'externalSourceUrl': 'https://ticketmaster.sg/event/synthetic',
                'venueAddress': ?raw,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.close);
      final repo = BackendEventDetailRepository(
        client,
        includeVenueAddress: true,
      );
      expect(
        (await repo.read(
          'event',
        ) as Success<EventDetail>).value.venueAddress!.formatted,
        address.formatted,
      );
      for (final invalid in [
        {'street': '1 Road', 'city': 'Singapore', 'countryCode': 'SG'},
        {
          'street': '1 Road',
          'city': 'Singapore',
          'postalCode': '123456',
          'countryCode': 'MY',
        },
        {
          'street': '<tag>',
          'city': 'Singapore',
          'postalCode': '123456',
          'countryCode': 'SG',
        },
      ]) {
        raw = invalid;
        expect(await repo.read('event'), isA<Failure<EventDetail>>());
      }
      raw = null;
      expect(
        (await repo.read('event') as Success<EventDetail>).value.venueAddress,
        isNull,
      );
    },
  );
  test('map uses complete address only and current authority', () async {
    const port = PlatformEventActions();
    expect(await port.openMap(event(located: false), () => true), false);
    expect(await port.openMap(event(), () => false), false);
    expect(calls, isEmpty);
    expect(await port.openMap(event(), () => true), true);
    expect(calls.single.method, 'openMap');
    expect(calls.single.arguments, {
      'street': '1 Example Road',
      'city': 'Singapore',
      'postalCode': '123456',
      'countryCode': 'SG',
    });
  });
  test(
    'calendar sends actual instants and link; missing end is absent',
    () async {
      const port = PlatformEventActions();
      await port.editCalendar(event(), () => true);
      expect(calls.single.arguments, {
        'title': 'Synthetic event',
        'startMillis': DateTime.utc(2026, 11, 1, 10).millisecondsSinceEpoch,
        'location': address.formatted,
        'url': 'https://ticketmaster.sg/event/synthetic',
      });
      calls.clear();
      await port.editCalendar(
        event(located: false, end: DateTime.utc(2026, 11, 1, 12)),
        () => true,
      );
      expect(
        (calls.single.arguments as Map)['endMillis'],
        DateTime.utc(2026, 11, 1, 12).millisecondsSinceEpoch,
      );
      expect((calls.single.arguments as Map)['location'], 'Synthetic venue');
    },
  );
  test(
    'platform absence is an unavailable handoff, never saved success',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            PlatformEventActions.channel,
            (_) async => throw PlatformException(code: 'unavailable'),
          );
      expect(
        await const PlatformEventActions().editCalendar(event(), () => true),
        false,
      );
    },
  );
  testWidgets(
    'missing address disables map; stale and background calendar never dispatch',
    (tester) async {
      final session = AuthSessionAuthenticated(subject: 'test');
      var fresh = true;
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => Stream.value(session)),
          eventActionsProvider.overrideWithValue(const PlatformEventActions()),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Scaffold(
              body: EventActionButtons(
                event: event(located: false),
                current: () => fresh,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<OutlinedButton>(find.byKey(const Key('event-open-map')))
            .onPressed,
        isNull,
      );
      expect(find.text('Complete venue address unavailable.'), findsOneWidget);
      fresh = false;
      await tester.tap(find.byKey(const Key('event-add-calendar')));
      await tester.pumpAndSettle();
      expect(calls, isEmpty);
      fresh = true;
      container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      await tester.tap(find.byKey(const Key('event-add-calendar')));
      expect(calls, isEmpty);
    },
  );
}
