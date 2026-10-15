import 'package:enmori/app/platform/external_activity_opener.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const opener = PlatformExternalActivityOpener();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final calls = <MethodCall>[];
  final allowed = Uri.parse(
    'https://www.ticketmaster.sg/activity/synthetic?language=en',
  );

  setUp(() {
    calls.clear();
    messenger.setMockMethodCallHandler(PlatformExternalActivityOpener.channel, (
      call,
    ) async {
      calls.add(call);
      return true;
    });
  });
  tearDown(
    () => messenger.setMockMethodCallHandler(
      PlatformExternalActivityOpener.channel,
      null,
    ),
  );

  test(
    'only explicit valid current action dispatches exact source URI once',
    () async {
      expect(calls, isEmpty);
      expect(await opener.open(allowed, current: () => true), isTrue);
      expect(calls.single.method, 'open');
      expect(calls.single.arguments, {'url': allowed.toString()});
    },
  );

  test('stale or throwing authority prevents native handoff', () async {
    expect(await opener.open(allowed, current: () => false), isFalse);
    expect(
      await opener.open(allowed, current: () => throw StateError('revoked')),
      isFalse,
    );
    expect(calls, isEmpty);
  });

  test(
    'reject non-source, credential, fragment and secret URLs before handoff',
    () async {
      for (final value in [
        'http://www.ticketmaster.sg/x',
        'https://ticketmaster.sg.evil.example/x',
        'https://person@ticketmaster.sg/x',
        'https://ticketmaster.sg:444/x',
        'https://ticketmaster.sg/x#fragment',
        'https://ticketmaster.sg/x?%74oken=synthetic',
        'https://ticketmaster.sg/x?api-key=synthetic',
      ]) {
        expect(
          await opener.open(Uri.parse(value), current: () => true),
          isFalse,
        );
      }
      expect(calls, isEmpty);
    },
  );

  test(
    'native failure and missing capability report failure for copy fallback',
    () async {
      for (final result in [false, null]) {
        messenger.setMockMethodCallHandler(
          PlatformExternalActivityOpener.channel,
          (_) async => result,
        );
        expect(await opener.open(allowed, current: () => true), isFalse);
      }
      messenger.setMockMethodCallHandler(
        PlatformExternalActivityOpener.channel,
        (_) async => throw PlatformException(code: 'UNAVAILABLE'),
      );
      expect(await opener.open(allowed, current: () => true), isFalse);
      messenger.setMockMethodCallHandler(
        PlatformExternalActivityOpener.channel,
        null,
      );
      expect(await opener.open(allowed, current: () => true), isFalse);
    },
  );
}
