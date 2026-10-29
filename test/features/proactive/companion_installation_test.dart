import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/features/proactive/data/companion_installation.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('com.enmori.app/proactive_notifications');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));
  test('installation lookup uses only native identity without Messaging side effects', () async {
    final calls = <String>[];
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      return '00000000-0000-4000-8000-000000000123';
    });
    expect(
      await readCompanionInstallation(),
      '00000000-0000-4000-8000-000000000123',
    );
    expect(calls, ['installationRef']);
  });
  test('unavailable or malformed native identity never falls back to a shared build id', () async {
    for (final result in [
      null,
      '',
      'shared-installation',
      '00000000-0000-0000-0000-000000000000',
    ]) {
      messenger.setMockMethodCallHandler(channel, (_) async => result);
      expect(await readCompanionInstallation(), isNull);
    }
    messenger.setMockMethodCallHandler(
      channel,
      (_) async => throw PlatformException(code: 'unavailable'),
    );
    expect(await readCompanionInstallation(), isNull);
  });
}
