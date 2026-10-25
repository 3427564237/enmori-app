import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/data/method_channel_follow_up_time.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const channel = MethodChannel('com.enmori.app/time_zone');
const port = MethodChannelFollowUpTimePort();
const normal = FollowUpCivilTime(
  year: 2026,
  month: 10,
  day: 26,
  hour: 16,
  minute: 30,
);
void main() {
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  tearDown(
    () =>
        binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, null),
  );
  test(
    'current IANA and exact civil resolve use the existing channel',
    () async {
      final calls = <MethodCall>[];
      binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
        call,
      ) async {
        calls.add(call);
        if (call.method == 'ianaTimeZone') return 'Asia/Singapore';
        return [
          _candidate(
            '2026-10-26T08:30:00Z',
            'Asia/Singapore',
            '2026-10-26 16:30',
            'UTC+08:00',
          ),
        ];
      });
      expect(
        (await port.currentIanaZone() as Success<String>).value,
        'Asia/Singapore',
      );
      final result = await port.resolveCivil(
        civil: normal,
        timeZone: 'Asia/Singapore',
      );
      expect(
        (result as Success<List<FollowUpTime>>).value.single.dueAt,
        DateTime.utc(2026, 10, 26, 8, 30),
      );
      expect(calls.last.method, 'resolveCivil');
      expect(calls.last.arguments, {
        'timeZone': 'Asia/Singapore',
        'year': 2026,
        'month': 10,
        'day': 26,
        'hour': 16,
        'minute': 30,
      });
    },
  );
  test(
    'a real gap is an empty success, unlike an unavailable resolver',
    () async {
      binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (call) async => [],
      );
      expect(
        (await port.resolveCivil(
          civil: normal,
          timeZone: 'Asia/Singapore',
        ) as Success<List<FollowUpTime>>).value,
        isEmpty,
      );
      binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (call) async => throw PlatformException(code: 'TIME_UNAVAILABLE'),
      );
      expect(
        await port.resolveCivil(civil: normal, timeZone: 'Asia/Singapore'),
        isA<Failure<List<FollowUpTime>>>(),
      );
    },
  );
  test(
    'a DST fold preserves both exact candidates without choosing one',
    () async {
      binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (call) async => [
          _candidate(
            '2026-10-25T00:30:00Z',
            'Europe/Berlin',
            '2026-10-25 02:30',
            'UTC+02:00',
          ),
          _candidate(
            '2026-10-25T01:30:00Z',
            'Europe/Berlin',
            '2026-10-25 02:30',
            'UTC+01:00',
          ),
        ],
      );
      final result = await port.resolveCivil(
        civil: const FollowUpCivilTime(
          year: 2026,
          month: 10,
          day: 25,
          hour: 2,
          minute: 30,
        ),
        timeZone: 'Europe/Berlin',
      );
      expect(
        (result as Success<List<FollowUpTime>>).value.map((v) => v.offsetLabel),
        ['UTC+02:00', 'UTC+01:00'],
      );
      expect(result.value.first.dueAt, isNot(result.value.last.dueAt));
    },
  );
  test(
    'invalid civil date never reaches native and is not normalized',
    () async {
      var calls = 0;
      binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
        call,
      ) async {
        calls++;
        return [];
      });
      final result = await port.resolveCivil(
        civil: const FollowUpCivilTime(
          year: 2026,
          month: 2,
          day: 30,
          hour: 2,
          minute: 30,
        ),
        timeZone: 'Asia/Singapore',
      );
      expect(
        (result as Failure<List<FollowUpTime>>).failure.kind,
        AppFailureKind.proactiveInputInvalid,
      );
      expect(calls, 0);
    },
  );
  test(
    'missing resolver and malformed echo never fall back to DateTime.local',
    () async {
      for (final row in [
        _candidate(
          '2026-10-26T08:30:00',
          'Asia/Singapore',
          '2026-10-26 16:30',
          'UTC+08:00',
        ),
        _candidate(
          '2026-10-26T08:30:00Z',
          'Europe/London',
          '2026-10-26 16:30',
          'UTC+08:00',
        ),
        _candidate(
          '2026-10-26T08:30:00Z',
          'Asia/Singapore',
          '2026-10-26 16:30',
          'UTC+07:00',
        ),
      ]) {
        binding.defaultBinaryMessenger.setMockMethodCallHandler(
          channel,
          (call) async => [row],
        );
        expect(
          await port.resolveCivil(civil: normal, timeZone: 'Asia/Singapore'),
          isA<Failure<List<FollowUpTime>>>(),
        );
      }
      binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (call) async => throw MissingPluginException(),
      );
      expect(
        await port.resolveCivil(civil: normal, timeZone: 'Asia/Singapore'),
        isA<Failure<List<FollowUpTime>>>(),
      );
    },
  );
  test(
    'duplicate or reversed fold instants cannot become selectable',
    () async {
      final item = _candidate(
        '2026-10-26T08:30:00Z',
        'Asia/Singapore',
        '2026-10-26 16:30',
        'UTC+08:00',
      );
      binding.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (call) async => [item, item],
      );
      expect(
        await port.resolveCivil(civil: normal, timeZone: 'Asia/Singapore'),
        isA<Failure<List<FollowUpTime>>>(),
      );
    },
  );
}

Map<String, Object?> _candidate(
  String due,
  String zone,
  String local,
  String offset,
) => {
  'dueAt': due,
  'timeZone': zone,
  'displayTime': local,
  'offsetLabel': offset,
};
