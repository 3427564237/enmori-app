import 'package:flutter/services.dart';

abstract interface class HistoryDevicePort {
  Future<String> captureIanaZone();

  Future<DateTime> todayInZone(String ianaZone);

  Future<List<String>> formatInstants(List<DateTime> instants, String ianaZone);
}

final class AndroidHistoryDevicePort implements HistoryDevicePort {
  const AndroidHistoryDevicePort({
    this.channel = const MethodChannel('com.enmori.app/time_zone'),
  });

  final MethodChannel channel;

  @override
  Future<String> captureIanaZone() async {
    final zone = await channel.invokeMethod<String>('ianaTimeZone');
    if (zone == null || zone.isEmpty) {
      throw const FormatException('Device time zone is unavailable.');
    }
    return zone;
  }

  @override
  Future<DateTime> todayInZone(String ianaZone) async {
    final date = await channel.invokeMethod<String>('currentDate', {
      'timeZone': ianaZone,
    });
    if (date == null || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date)) {
      throw const FormatException('Device date is unavailable.');
    }
    final parsed = DateTime.tryParse('${date}T00:00:00Z');
    if (parsed == null || _civilDate(parsed) != date) {
      throw const FormatException('Device date is invalid.');
    }
    return parsed;
  }

  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async {
    final formatted = await channel.invokeListMethod<String>('formatInstants', {
      'timeZone': ianaZone,
      'instants': instants
          .map((value) => value.toUtc().toIso8601String())
          .toList(),
    });
    if (formatted == null || formatted.length != instants.length) {
      throw const FormatException('Check-in times could not be formatted.');
    }
    return formatted;
  }

  static String _civilDate(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-'
      '${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';
}
