import 'package:flutter/services.dart';

import '../../../core/result/result.dart';
import '../domain/proactive.dart';
import '../domain/proactive_repository.dart';

/// Root owns the native ZoneRules implementation. This adapter never guesses a
/// missing zone, normalizes a nonexistent civil date or picks a DST candidate.
final class MethodChannelFollowUpTimePort implements FollowUpTimePort {
  const MethodChannelFollowUpTimePort({
    this.channel = const MethodChannel('com.enmori.app/time_zone'),
  });
  final MethodChannel channel;

  @override
  Future<Result<String>> currentIanaZone() async {
    try {
      final zone = await channel.invokeMethod<String>('ianaTimeZone');
      if (!_validZone(zone)) return const Failure(_unavailable);
      return Success(zone!);
    } catch (_) {
      return const Failure(_unavailable);
    }
  }

  @override
  Future<Result<List<FollowUpTime>>> resolveCivil({
    required FollowUpCivilTime civil,
    required String timeZone,
  }) async {
    final check = DateTime.utc(
      civil.year,
      civil.month,
      civil.day,
      civil.hour,
      civil.minute,
    );
    if (!_validZone(timeZone) ||
        civil.year < 1 ||
        civil.year > 9999 ||
        !_matches(check, civil)) {
      return const Failure(_invalid);
    }
    try {
      final rows = await channel.invokeListMethod<Object?>('resolveCivil', {
        'timeZone': timeZone,
        'year': civil.year,
        'month': civil.month,
        'day': civil.day,
        'hour': civil.hour,
        'minute': civil.minute,
      });
      if (rows == null || rows.length > 2) return const Failure(_unavailable);
      final result = <FollowUpTime>[];
      for (final raw in rows) {
        if (raw is! Map ||
            raw.length != 4 ||
            !const {
              'dueAt',
              'timeZone',
              'displayTime',
              'offsetLabel',
            }.every(raw.containsKey) ||
            raw['timeZone'] != timeZone ||
            raw['displayTime'] != _display(civil)) {
          return const Failure(_unavailable);
        }
        final instant = raw['dueAt'], offset = raw['offsetLabel'];
        if (instant is! String ||
            !RegExp(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$')
                .hasMatch(instant) ||
            offset is! String) {
          return const Failure(_unavailable);
        }
        final at = DateTime.tryParse(instant);
        final match = RegExp(r'^UTC([+-])(\d\d):(\d\d)$').firstMatch(offset);
        if (at == null ||
            !at.isUtc ||
            at.toIso8601String().substring(0, 19) != instant.substring(0, 19) ||
            match == null) {
          return const Failure(_unavailable);
        }
        final hours = int.parse(match[2]!), minutes = int.parse(match[3]!);
        if (hours > 18 || minutes > 59 || (hours == 18 && minutes != 0)) {
          return const Failure(_unavailable);
        }
        final duration = Duration(
          minutes: (hours * 60 + minutes) * (match[1] == '-' ? -1 : 1),
        );
        if (!_matches(at.add(duration), civil) ||
            at.second != 0 ||
            at.millisecond != 0 ||
            at.microsecond != 0 ||
            (result.isNotEmpty && !at.isAfter(result.last.dueAt))) {
          return const Failure(_unavailable);
        }
        result.add(
          FollowUpTime(
            dueAt: at,
            timeZone: timeZone,
            displayTime: _display(civil),
            offsetLabel: offset,
          ),
        );
      }
      return Success(List.unmodifiable(result));
    } on PlatformException catch (error) {
      return Failure(error.code == 'TIME_INVALID' ? _invalid : _unavailable);
    } catch (_) {
      return const Failure(_unavailable);
    }
  }
}

bool _validZone(String? zone) =>
    zone != null &&
    zone.isNotEmpty &&
    zone.length <= 128 &&
    !RegExp(r'[\s\x00-\x1f\x7f]').hasMatch(zone);
bool _matches(DateTime value, FollowUpCivilTime c) =>
    value.year == c.year &&
    value.month == c.month &&
    value.day == c.day &&
    value.hour == c.hour &&
    value.minute == c.minute;
String _display(FollowUpCivilTime c) =>
    '${c.year.toString().padLeft(4, '0')}-${c.month.toString().padLeft(2, '0')}-${c.day.toString().padLeft(2, '0')} ${c.hour.toString().padLeft(2, '0')}:${c.minute.toString().padLeft(2, '0')}';
const _invalid = AppFailure(
  kind: AppFailureKind.proactiveInputInvalid,
  message: 'This local time is invalid. Choose another time.',
);
const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The time and time zone could not be verified.',
);
