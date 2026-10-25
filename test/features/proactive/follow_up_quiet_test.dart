import 'package:enmori/features/proactive/domain/follow_up_quiet.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const night = ProactiveQuietWindow(22 * 60, 8 * 60);
  FollowUpCivilTime at(int hour, int minute) => FollowUpCivilTime(
    year: 2026,
    month: 10,
    day: 31,
    hour: hour,
    minute: minute,
  );
  test('quiet starts inclusively and ends exclusively in civil time', () {
    expect(nextAllowedFollowUpTime(at(21, 59), night), isNull);
    expect(nextAllowedFollowUpTime(at(22, 0), night), isNotNull);
    expect(nextAllowedFollowUpTime(at(7, 59), night), isNotNull);
    expect(nextAllowedFollowUpTime(at(8, 0), night), isNull);
  });
  test('overnight suggestion rolls the date only after the evening start', () {
    final evening = nextAllowedFollowUpTime(at(23, 15), night)!;
    expect(
      (evening.year, evening.month, evening.day, evening.hour, evening.minute),
      (2026, 11, 1, 8, 0),
    );
    final morning = nextAllowedFollowUpTime(at(1, 30), night)!;
    expect((morning.month, morning.day, morning.hour), (10, 31, 8));
  });
  test('same-day quiet suggestion and disabled quiet remain distinct', () {
    final lunch = nextAllowedFollowUpTime(
      at(12, 30),
      const ProactiveQuietWindow(12 * 60, 13 * 60),
    )!;
    expect((lunch.month, lunch.day, lunch.hour, lunch.minute), (10, 31, 13, 0));
    expect(
      nextAllowedFollowUpTime(at(12, 30), const ProactiveQuietDisabled()),
      isNull,
    );
  });
}
