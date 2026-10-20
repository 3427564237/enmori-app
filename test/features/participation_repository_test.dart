import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';

const stamp = '2026-10-20T00:00:00.000Z';
Map<String, Object?> row({
  String id = 'event-a',
  String status = 'none',
  int revision = 0,
  bool ignored = false,
}) => {
  'eventId': id,
  'status': status,
  'ignored': ignored,
  'revision': revision,
  if (revision > 0) 'updatedAt': stamp,
};
BackendApiClient api(
  Future<http.Response> Function(http.Request) handle, {
  AuthTokenProvider? token,
}) => BackendApiClient(
  Uri.https('controlled.invalid'),
  token ?? () async => const Success('synthetic-token'),
  httpClient: MockClient(handle),
);
http.Response reply(Object body, int status) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  test('revision0 cannot claim saved Going and public profile DTO cannot carry ignored', () async {
    expect(parseParticipation(row(status: 'going')), isNull);
    final client = api(
      (_) async => reply({
        'items': [
          {'eventId': 'event-a', 'status': 'going', 'ignored': true},
        ],
      }, 200),
    );
    addTearDown(client.close);
    expect(
      await BackendParticipationRepository(client)
          .forUsername('member_a', null, () => true),
      isA<Failure<PublicParticipationPage>>(),
    );
  });
  test(
    'public profile response contains only stable Event ID and status',
    () async {
      final client = api(
        (_) async => reply({
          'items': [
            {'eventId': 'event-a', 'status': 'going'},
          ],
        }, 200),
      );
      addTearDown(client.close);
      final r = await BackendParticipationRepository(client)
          .forUsername('member_a', null, () => true);
      expect(
        (r as Success<PublicParticipationPage>).value.items.single.eventId,
        'event-a',
      );
    },
  );
  for (final invalid in [
    {...row(), 'accountId': 'private'},
    {...row(), 'status': 'booked'},
    {...row(), 'updatedAt': stamp},
    {...row(revision: 1), 'updatedAt': '2026-02-30T00:00:00Z'},
    {...row(), 'revision': -1},
    {...row(), 'eventId': 'tm_YQ'},
  ]) {
    test('strict owner DTO rejects $invalid', () {
      expect(parseParticipation(invalid), isNull);
    });
  }
  test('real adapter uses expectedRevision, no identity/idempotency header, explicit reread', () async {
    var stored = row();
    var writes = 0;
    final client = api((req) async {
      if (req.method == 'PUT') {
        writes++;
        expect(req.headers.containsKey('Idempotency-Key'), false);
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        expect(body.keys.toSet(), {'status', 'ignored', 'expectedRevision'});
        expect(body['expectedRevision'], stored['revision']);
        stored = row(
          status: body['status'] as String,
          ignored: body['ignored'] as bool,
          revision: 1,
        );
      }
      return reply({'participation': stored}, 200);
    });
    addTearDown(client.close);
    final repo = BackendParticipationRepository(client),
        old = (await repo.read(
          'event-a',
          () => true,
        ) as Success<EventParticipation>).value;
    final saved = await repo.save(
      old,
      ParticipationStatus.going,
      false,
      () => true,
    );
    expect((saved as Success<EventParticipation>).value.revision, 1);
    expect(
      ((await repo.read(
        'event-a',
        () => true,
      )) as Success<EventParticipation>).value.status,
      ParticipationStatus.going,
    );
    expect(writes, 1);
  });
  test('wrong returned Event identity fails closed', () async {
    final client = api(
      (_) async => reply({'participation': row(id: 'another-event')}, 200),
    );
    addTearDown(client.close);
    expect(
      await BackendParticipationRepository(client).read('event-a', () => true),
      isA<Failure<EventParticipation>>(),
    );
  });
  test(
    'session revoked while token pending dispatches zero HTTP requests',
    () async {
      final pending = Completer<Result<String>>();
      var current = true, calls = 0;
      final client = api((_) async {
        calls++;
        return reply({'participation': row()}, 200);
      }, token: () => pending.future);
      addTearDown(client.close);
      final read = BackendParticipationRepository(client)
          .read('event-a', () => current);
      current = false;
      pending.complete(const Success('synthetic-new-token'));
      await read;
      expect(calls, 0);
    },
  );
  test('sparse participant page with cursor is not end and unknown count is absent', () async {
    final client = api(
      (_) async => reply({
        'items': [],
        'countState': 'unavailable',
        'nextCursor': 'opaque_cursor',
      }, 200),
    );
    addTearDown(client.close);
    final r = await BackendParticipationRepository(client).participants(
      'event-a',
      ParticipationStatus.going,
      ParticipantGroup.others,
      null,
      () => true,
    );
    final p = (r as Success<EventParticipantPage>).value;
    expect(p.items, isEmpty);
    expect(p.nextCursor, 'opaque_cursor');
    expect(p.visibleCount, isNull);
  });
  for (final body in [
    {
      'items': [
        {'username': 'member_a', 'displayName': 'bad\u00ad'},
      ],
      'countState': 'exact',
      'visibleCount': 1,
    },
    {
      'items': [
        {'username': 'member_a\n'},
      ],
      'countState': 'exact',
      'visibleCount': 1,
    },
    {'items': [], 'countState': 'unavailable', 'visibleCount': 0},
    {
      'items': [
        {'username': 'member_a', 'accountId': 'hidden'},
      ],
      'countState': 'exact',
      'visibleCount': 1,
    },
    {
      'items': [
        {'username': 'member_a', 'displayName': 'bad\u202e'},
      ],
      'countState': 'exact',
      'visibleCount': 1,
    },
    {
      'items': [
        {'username': 'member_a'},
        {'username': 'member_a'},
      ],
      'countState': 'exact',
      'visibleCount': 2,
    },
  ]) {
    test('strict participant projection rejects $body', () async {
      final client = api((_) async => reply(body, 200));
      addTearDown(client.close);
      expect(
        await BackendParticipationRepository(client).participants(
          'event-a',
          ParticipationStatus.going,
          ParticipantGroup.friends,
          null,
          () => true,
        ),
        isA<Failure<EventParticipantPage>>(),
      );
    });
  }

  test(
    'shared controller locks duplicate writes and conflict requires readback',
    () async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final write = Completer<http.Response>();
      var calls = 0, reads = 0;
      final client = api((req) async {
        if (req.method == 'PUT') {
          calls++;
          return write.future;
        }
        reads++;
        return reply({
          'participation': reads == 1
              ? row()
              : row(status: 'interested', revision: 3),
        }, 200);
      });
      addTearDown(client.close);
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => sessions.stream),
          participationRepositoryProvider.overrideWithValue(
            BackendParticipationRepository(client),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.listen(authSessionProvider, (_, _) {});
      sessions.add(AuthSessionAuthenticated(subject: 'same-member'));
      await container.read(authSessionProvider.future);
      container.listen(participationControllerProvider, (_, _) {});
      final controller = container.read(
        participationControllerProvider.notifier,
      );
      await controller.load('event-a');
      final first = controller.confirmGoing('event-a');
      await Future<void>.delayed(Duration.zero);
      await controller.confirmGoing('event-a');
      expect(calls, 1);
      write.complete(
        reply({
          'error': {
            'code': 'EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED',
            'message': 'Read again',
            'requestId': 'test-request',
          },
        }, 412),
      );
      await first;
      expect(
        container.read(participationControllerProvider)['event-a']!.uncertain,
        true,
      );
      await controller.confirmGoing('event-a');
      expect(calls, 1);
      await controller.load('event-a');
      expect(
        container
            .read(participationControllerProvider)['event-a']!
            .value!
            .revision,
        3,
      );
      expect(
        container.read(participationControllerProvider)['event-a']!.uncertain,
        false,
      );
    },
  );
  test(
    'same-subject session replacement drops late read and old state',
    () async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final pending = Completer<http.Response>();
      final client = api((_) => pending.future);
      addTearDown(client.close);
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => sessions.stream),
          participationRepositoryProvider.overrideWithValue(
            BackendParticipationRepository(client),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.listen(authSessionProvider, (_, _) {});
      sessions.add(AuthSessionAuthenticated(subject: 'same-member'));
      await container.read(authSessionProvider.future);
      container.listen(participationControllerProvider, (_, _) {});
      final old = container
          .read(participationControllerProvider.notifier)
          .load('event-a');
      await Future<void>.delayed(Duration.zero);
      sessions.add(AuthSessionAuthenticated(subject: 'same-member'));
      await container.pump();
      pending.complete(
        reply({'participation': row(status: 'going', revision: 1)}, 200),
      );
      await old;
      expect(container.read(participationControllerProvider), isEmpty);
    },
  );
}
