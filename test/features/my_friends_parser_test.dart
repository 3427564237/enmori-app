import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/friends/data/backend_friend_repository.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _validRow = {'username': 'member_a', 'displayName': 'Member A'};
const _reference = 'abcdef12-3456-4789-8abc-def012345678';
String _encode(String value) => base64Url.encode(utf8.encode(value));

Future<Result<MyFriendsPage>> _readPage({
  List<Object?> rows = const [_validRow],
  Object? cursor,
}) async {
  final client = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient((request) async {
      expect(request.url.path, '/v1/me/friends');
      return http.Response(
        jsonEncode({'friends': rows, 'nextCursor': cursor}),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }),
  );
  try {
    return await BackendFriendRepository(client).listFriends();
  } finally {
    client.close();
  }
}

void _expectInvalid(Result<MyFriendsPage> result) {
  expect(
    result,
    isA<Failure<MyFriendsPage>>().having(
      (result) => result.failure.kind,
      'failure kind',
      AppFailureKind.unexpected,
    ),
  );
}

void main() {
  group('My Friends canonical Username boundary', () {
    final invalid = <String, String>{
      'uppercase': 'MEMBER_A',
      'leading space': ' member_a',
      'trailing space': 'member_a ',
      'trailing newline': 'member_a\n',
      'too short': 'ab',
      'too long': List.filled(31, 'a').join(),
      'leading underscore': '_member',
      'trailing underscore': 'member_',
      'consecutive underscores': 'a__b',
      'Unicode letter': 'mémber',
      'Unicode whitespace': 'member\u00a0a',
      'punctuation': 'member.a',
      for (final name in [
        'admin',
        'administrator',
        'support',
        'system',
        'moderator',
        'root',
        'enmori',
        'enmori_member',
      ])
        'reserved $name': name,
    };
    for (final entry in invalid.entries) {
      test(
        'rejects ${entry.key} without normalizing or returning partial rows',
        () async {
          _expectInvalid(
            await _readPage(
              rows: [
                _validRow,
                {..._validRow, 'username': entry.value},
              ],
              cursor: _encode(_reference),
            ),
          );
        },
      );
    }
    for (final username in ['a_1', List.filled(30, 'a').join()]) {
      test('preserves valid Username length ${username.length}', () async {
        final result = await _readPage(
          rows: [
            {..._validRow, 'username': username},
          ],
        );
        expect(result, isA<Success<MyFriendsPage>>());
        expect(
          (result as Success<MyFriendsPage>).value.friends.single.username,
          username,
        );
      });
    }
  });

  group('My Friends normalized DisplayName boundary', () {
    final invalid = <String, String>{
      'empty': '',
      'whitespace only': '   ',
      'leading space': ' Member A',
      'trailing space': 'Member A ',
      'Unicode edge whitespace': '\u3000Member A\u00a0',
      'isolated high surrogate': '\ud800',
      'isolated low surrogate': '\udfff',
      'newline': 'Member\nA',
      'tab': 'Member\tA',
      'NUL': 'Member\u0000A',
      'format character': 'Member\u200dA',
      'line separator': 'Member\u2028A',
      'paragraph separator': 'Member\u2029A',
      '51 ASCII scalars': List.filled(51, 'a').join(),
      '51 supplementary scalars': List.filled(51, '\u{1f600}').join(),
    };
    for (final entry in invalid.entries) {
      test(
        'rejects ${entry.key} without exposing rows or continuation',
        () async {
          _expectInvalid(
            await _readPage(
              rows: [
                _validRow,
                {..._validRow, 'displayName': entry.value},
              ],
              cursor: _encode(_reference),
            ),
          );
        },
      );
    }
    final valid = <String, String>{
      'one scalar': '李',
      '50 ASCII scalars': List.filled(50, 'a').join(),
      'supplementary Unicode': '\u{1f600}',
      '50 supplementary scalars': List.filled(50, '\u{1f600}').join(),
      'combining sequence': 'A\u0301',
      'internal spacing': 'Member  A',
      'internal Unicode space': 'Member\u00a0A',
    };
    for (final entry in valid.entries) {
      test('preserves ${entry.key} exactly', () async {
        final result = await _readPage(
          rows: [
            {..._validRow, 'displayName': entry.value},
          ],
        );
        expect(result, isA<Success<MyFriendsPage>>());
        expect(
          (result as Success<MyFriendsPage>).value.friends.single.displayName,
          entry.value,
        );
      });
    }
  });

  group('My Friends canonical UUID-v4 cursor boundary', () {
    final encoded = _encode(_reference);
    final invalid = <String, Object>{
      '36 decoded NUL bytes': List.filled(48, 'A').join(),
      '36 non-UUID characters': _encode(List.filled(36, 'a').join()),
      'UUID version 1': _encode(_reference.replaceFirst('-4789-', '-1789-')),
      'wrong UUID variant': _encode(
        _reference.replaceFirst('-8abc-', '-7abc-'),
      ),
      'uppercase UUID': _encode(_reference.toUpperCase()),
      'nil UUID': _encode('00000000-0000-0000-0000-000000000000'),
      'invalid UTF-8': base64Url.encode(List.filled(36, 0xff)),
      'padding': '$encoded=',
      'percent encoding':
          '%${encoded.codeUnitAt(0).toRadixString(16)}${encoded.substring(1)}',
      'raw reference': _reference,
      'trailing newline': '$encoded\n',
      'truncated encoding': encoded.substring(1),
      'non-string': 48,
    };
    for (final entry in invalid.entries) {
      test(
        'rejects ${entry.key} and the entire otherwise valid page',
        () async {
          _expectInvalid(await _readPage(cursor: entry.value));
        },
      );
    }
    for (final variant in ['8', '9', 'a', 'b']) {
      test('preserves canonical UUID-v4 variant $variant', () async {
        final cursor = _encode(
          _reference.replaceFirst('-8abc-', '-${variant}abc-'),
        );
        final result = await _readPage(cursor: cursor);
        expect(result, isA<Success<MyFriendsPage>>());
        expect((result as Success<MyFriendsPage>).value.nextCursor, cursor);
        expect(result.value.friends.single.username, 'member_a');
      });
    }
    test(
      'accepts null continuation and an empty page with continuation',
      () async {
        final last = await _readPage();
        expect(last, isA<Success<MyFriendsPage>>());
        expect((last as Success<MyFriendsPage>).value.nextCursor, isNull);
        final filtered = await _readPage(rows: [], cursor: encoded);
        expect(filtered, isA<Success<MyFriendsPage>>());
        expect((filtered as Success<MyFriendsPage>).value.friends, isEmpty);
        expect(filtered.value.nextCursor, encoded);
      },
    );
  });
}
