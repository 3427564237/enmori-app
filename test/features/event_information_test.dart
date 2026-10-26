import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/data/backend_event_detail_repository.dart';
import 'package:enmori/features/event_detail/domain/event_cover.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_page.dart';
import 'package:enmori/features/event_detail/presentation/event_information.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _cover = 'https://s1.ticketm.net/dam/a/synthetic.png';
final _event = EventDetail(
  eventId: 'tm_event_synthetic',
  title: 'An actual synthetic music performance',
  startAt: DateTime.utc(2026, 11, 1, 10),
  externalSourceUrl: 'https://ticketmaster.sg/event/synthetic',
  locationLabel: 'Synthetic venue, 1 Example Road',
  shortDescription:
      'A source-provided live performance with an evening programme.',
  coverImageUrl: _cover,
);

final class _Load implements EventCoverLoad {
  final pending = Completer<Uint8List?>();
  bool cancelled = false;
  @override
  Future<Uint8List?> get bytes => pending.future;
  @override
  void cancel() {
    cancelled = true;
  }
}

final class _Covers implements EventCoverLoader {
  final loads = <_Load>[];
  @override
  EventCoverLoad start(String url) {
    final load = _Load();
    loads.add(load);
    return load;
  }
}

final class _Details implements EventDetailRepository {
  @override
  Future<Result<EventDetail>> read(String eventId) async => Success(_event);
  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

Widget _host(Widget child, _Covers covers, {double textScale = 1}) =>
    ProviderScope(
      overrides: [
        currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
        authSessionProvider.overrideWith(
          (ref) => const Stream<AuthSession>.empty(),
        ),
        eventCoverLoaderProvider.overrideWithValue(covers),
        eventDetailRepositoryProvider.overrideWithValue(_Details()),
      ],
      child: MaterialApp(
        theme: ThemeData.dark().copyWith(splashFactory: NoSplash.splashFactory),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: child,
      ),
    );

Future<Uint8List> _png() async {
  final recorder = ui.PictureRecorder();
  ui.Canvas(recorder).drawRect(
    const ui.Rect.fromLTWH(0, 0, 2, 2),
    ui.Paint()..color = const ui.Color(0xff334455),
  );
  final picture = recorder.endRecording();
  final image = await picture.toImage(2, 2);
  try {
    return (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer
        .asUint8List();
  } finally {
    image.dispose();
    picture.dispose();
  }
}

Widget _detailWithPeopleLink() => Scaffold(
  body: Builder(
    builder: (context) => Column(
      children: [
        TextButton(
          key: const Key('open-people'),
          onPressed: () => Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (_) => const Scaffold(body: Text('People page')),
            ),
          ),
          child: const Text('See people'),
        ),
        Expanded(
          child: SingleChildScrollView(child: EventInformation(event: _event)),
        ),
      ],
    ),
  ),
);

void main() {
  testWidgets('synthetic preview never requests a real provider cover', (
    tester,
  ) async {
    final covers = _Covers();
    await tester.pumpWidget(
      _host(
        Scaffold(
          body: SingleChildScrollView(
            child: EventInformation(event: _event, syntheticPreview: true),
          ),
        ),
        covers,
      ),
    );
    expect(covers.loads, isEmpty);
    expect(find.text('Synthetic event preview'), findsOneWidget);
    expect(find.text('Source: Ticketmaster'), findsNothing);
  });

  testWidgets(
    'complete event information remains readable on a narrow phone with large text when cover fails',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final covers = _Covers();
      await tester.pumpWidget(
        _host(
          Scaffold(
            body: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventInformation(event: _event),
              ),
            ),
          ),
          covers,
          textScale: 2,
        ),
      );
      expect(find.text(_event.title), findsOneWidget);
      expect(find.text(_event.locationLabel!), findsOneWidget);
      expect(find.text(_event.shortDescription!), findsOneWidget);
      expect(find.text('About this event'), findsOneWidget);
      expect(find.byKey(const Key('event-cover-loading')), findsOneWidget);
      covers.loads.single.pending.complete(null);
      await tester.pump();
      expect(find.byKey(const Key('event-cover-unavailable')), findsOneWidget);
      expect(find.text(_event.shortDescription!), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'background cancels cover I/O and late bytes cannot repaint or automatically reload',
    (tester) async {
      final covers = _Covers();
      await tester.pumpWidget(
        _host(
          Scaffold(
            body: SingleChildScrollView(child: EventInformation(event: _event)),
          ),
          covers,
        ),
      );
      final load = covers.loads.single;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      expect(load.cancelled, isTrue);
      load.pending.complete(Uint8List.fromList([1, 2, 3]));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(covers.loads, hasLength(1));
      expect(find.byKey(const Key('event-cover-image')), findsNothing);
      expect(find.byKey(const Key('event-cover-unavailable')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'original detail expiry cancels its image request and preserves explicit reload',
    (tester) async {
      final covers = _Covers();
      await tester.pumpWidget(
        _host(EventDetailPage(eventId: _event.eventId), covers),
      );
      await tester.pumpAndSettle();
      final load = covers.loads.single;
      await tester.pump(const Duration(minutes: 5));
      expect(load.cancelled, isTrue);
      expect(find.byKey(const Key('event-detail-title')), findsNothing);
      expect(find.byKey(const Key('event-detail-retry')), findsOneWidget);
      load.pending.complete(Uint8List.fromList([1]));
      await tester.pump();
      expect(find.byKey(const Key('event-cover-image')), findsNothing);
    },
  );

  testWidgets(
    'changing the authenticated owner cancels an outstanding cover and rejects its completion',
    (tester) async {
      final covers = _Covers();
      final container = ProviderContainer(
        overrides: [
          currentAuthSubjectProvider.overrideWithValue('owner-a'),
          eventCoverLoaderProvider.overrideWithValue(covers),
          authSessionProvider.overrideWith(
            (ref) => const Stream<AuthSession>.empty(),
          ),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: EventInformation(event: _event),
              ),
            ),
          ),
        ),
      );
      final load = covers.loads.single;
      container.updateOverrides([
        currentAuthSubjectProvider.overrideWithValue('owner-b'),
        eventCoverLoaderProvider.overrideWithValue(covers),
        authSessionProvider.overrideWith(
          (ref) => const Stream<AuthSession>.empty(),
        ),
      ]);
      await tester.pump();
      expect(load.cancelled, isTrue);
      load.pending.complete(Uint8List.fromList([1]));
      await tester.pump();
      expect(find.byKey(const Key('event-cover-image')), findsNothing);
      expect(covers.loads, hasLength(1));
    },
  );

  testWidgets(
    'a retained detail cancels cover work when another page covers it and rejects late bytes on return',
    (tester) async {
      final covers = _Covers();
      await tester.pumpWidget(_host(_detailWithPeopleLink(), covers));
      final element = tester.element(find.byType(EventInformation));
      final load = covers.loads.single;
      await tester.tap(find.byKey(const Key('open-people')));
      await tester.pumpAndSettle();
      expect(find.text('People page'), findsOneWidget);
      expect(element.mounted, isTrue);
      expect(load.cancelled, isTrue);
      load.pending.complete((await tester.runAsync(_png))!);
      await tester.pump();
      expect(
        find.byKey(const Key('event-cover-image'), skipOffstage: false),
        findsNothing,
      );
      tester.state<NavigatorState>(find.byType(Navigator)).pop();
      await tester.pumpAndSettle();
      expect(covers.loads, hasLength(1));
      expect(find.byKey(const Key('event-cover-unavailable')), findsOneWidget);
    },
  );

  testWidgets(
    'a decoded cover stays out of the global cache and is released when a pushed page covers the retained detail',
    (tester) async {
      final png = (await tester.runAsync(_png))!;
      final covers = _Covers();
      await tester.pumpWidget(_host(_detailWithPeopleLink(), covers));
      final element = tester.element(find.byType(EventInformation));
      final before = PaintingBinding.instance.imageCache.currentSize;
      covers.loads.single.pending.complete(png);
      for (
        var i = 0;
        i < 100 &&
            find.byKey(const Key('event-cover-image')).evaluate().isEmpty;
        i++
      ) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 10)),
        );
        await tester.pump();
      }
      expect(find.byKey(const Key('event-cover-image')), findsOneWidget);
      expect(PaintingBinding.instance.imageCache.currentSize, before);
      final image = tester
          .widget<RawImage>(find.byKey(const Key('event-cover-image')))
          .image!;
      await tester.tap(find.byKey(const Key('open-people')));
      await tester.pumpAndSettle();
      expect(element.mounted, isTrue);
      expect(image.debugDisposed, isTrue);
      expect(PaintingBinding.instance.imageCache.currentSize, before);
      tester.state<NavigatorState>(find.byType(Navigator)).pop();
      await tester.pumpAndSettle();
      expect(covers.loads, hasLength(1));
      expect(find.byKey(const Key('event-cover-image')), findsNothing);
    },
  );

  test('both strict HTTP readers preserve the approved detail fields and discard unsafe optional media', () async {
    Future<BackendApiClient> client(Map<String, Object?> response) async =>
        BackendApiClient(
          Uri.parse('https://controlled.example'),
          () async => const Success('synthetic'),
          httpClient: MockClient(
            (_) async => http.Response(
              jsonEncode(response),
              200,
              headers: {'content-type': 'application/json'},
            ),
          ),
        );
    final raw = <String, Object?>{
      'eventId': 'tm_event_${List.filled(64, 'a').join()}',
      'title': _event.title,
      'startAt': '2026-11-01T10:00:00Z',
      'externalSourceUrl': _event.externalSourceUrl,
      'shortDescription': _event.shortDescription,
      'coverImageUrl': _cover,
    };
    final details = await BackendEventDetailRepository(
      await client({'event': raw}),
    ).read(raw['eventId']! as String);
    expect((details as Success<EventDetail>).value.coverImageUrl, _cover);
    expect(details.value.shortDescription, _event.shortDescription);
    final browse = {...raw, 'browseId': 'tm_YQ'};
    final activity = await BackendActivityRepository(await client(browse))
        .read('tm_YQ');
    expect(
      ((activity as Success<ActivityRead>).value as ActivityDetail)
          .coverImageUrl,
      _cover,
    );
    expect(
      (activity.value as ActivityDetail).shortDescription,
      _event.shortDescription,
    );
    raw['coverImageUrl'] = 'https://unapproved.example/tracker.png';
    final rejected = await BackendEventDetailRepository(
      await client({'event': raw}),
    ).read(raw['eventId']! as String);
    expect((rejected as Success<EventDetail>).value.coverImageUrl, isNull);
    expect(rejected.value.title, _event.title);
  });
}
