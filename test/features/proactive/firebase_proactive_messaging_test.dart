import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/data/firebase_proactive_messaging.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';

const refId = '00000000-0000-4000-8000-000000000001';
NotificationSettings settings(AuthorizationStatus status) =>
    NotificationSettings(
      authorizationStatus: status,
      alert: AppleNotificationSetting.notSupported,
      announcement: AppleNotificationSetting.notSupported,
      badge: AppleNotificationSetting.notSupported,
      carPlay: AppleNotificationSetting.notSupported,
      lockScreen: AppleNotificationSetting.notSupported,
      notificationCenter: AppleNotificationSetting.notSupported,
      showPreviews: AppleShowPreviewSetting.notSupported,
      sound: AppleNotificationSetting.notSupported,
      timeSensitive: AppleNotificationSetting.notSupported,
      criticalAlert: AppleNotificationSetting.notSupported,
      providesAppNotificationSettings: AppleNotificationSetting.notSupported,
    );

class Messaging extends Fake implements FirebaseMessaging {
  final calls = <String>[], autoInit = <bool>[];
  final refreshes = StreamController<String>.broadcast();
  String? token = 'synthetic-fcm';
  RemoteMessage? initial;
  AuthorizationStatus status = AuthorizationStatus.authorized;
  Completer<void>? deletePending;
  @override
  Future<void> setAutoInitEnabled(bool enabled) async {
    calls.add('autoInit');
    autoInit.add(enabled);
  }

  @override
  Future<String?> getToken({
    String? vapidKey,
    String? serviceWorkerScriptPath,
  }) async {
    calls.add('getToken');
    return token;
  }

  @override
  Future<void> deleteToken() async {
    calls.add('deleteToken');
    await deletePending?.future;
  }

  @override
  Future<RemoteMessage?> getInitialMessage() async {
    calls.add('initial');
    return initial;
  }

  @override
  Stream<String> get onTokenRefresh {
    calls.add('refreshStream');
    return refreshes.stream;
  }

  @override
  Future<NotificationSettings> getNotificationSettings() async {
    calls.add('permission');
    return settings(status);
  }

  @override
  Future<NotificationSettings> requestPermission({
    bool alert = true,
    bool announcement = false,
    bool badge = true,
    bool carPlay = false,
    bool criticalAlert = false,
    bool provisional = false,
    bool sound = true,
    bool providesAppNotificationSettings = false,
  }) async {
    calls.add('requestPermission');
    expect(provisional, isFalse);
    return settings(status);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'construction is lazy, explicit permission/token keeps auto-init disabled',
    () async {
      final sdk = Messaging();
      var constructions = 0;
      final port = FirebaseProactiveMessagingPort(
        messagingFactory: () {
          constructions++;
          return sdk;
        },
      );
      expect(constructions, 0);
      expect(sdk.calls, isEmpty);
      expect(
        (await port.requestPermission() as Success).value,
        ProactiveNotificationPermission.granted,
      );
      expect((await port.getToken() as Success).value, 'synthetic-fcm');
      expect(sdk.calls, [
        'autoInit',
        'requestPermission',
        'autoInit',
        'getToken',
      ]);
      expect(sdk.autoInit, [false, false]);
      expect(constructions, 1);
      await sdk.refreshes.close();
    },
  );
  test(
    'native channel name and method match the existing Kotlin contract',
    () async {
      const channel = MethodChannel('com.enmori.app/proactive_notifications');
      var calls = 0;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls++;
            expect(call.method, 'prepareChannel');
            expect(call.arguments, isNull);
            return true;
          });
      final port = FirebaseProactiveMessagingPort(
        messagingFactory: () => throw StateError('SDK must stay unopened'),
      );
      expect((await port.prepareChannel() as Success).value, isTrue);
      expect(calls, 1);
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    },
  );
  test(
    'cold and warm clicks expose only the single canonical opaque data ref',
    () async {
      final sdk = Messaging(),
          opened = StreamController<RemoteMessage>.broadcast();
      sdk.initial = const RemoteMessage(
        data: {'deliveryRef': refId},
        notification: RemoteNotification(
          title: 'private-canary',
          body: 'private-body',
        ),
      );
      final port = FirebaseProactiveMessagingPort(
        messagingFactory: () => sdk,
        openedMessages: opened.stream,
      );
      expect((await port.initialDeliveryRef() as Success).value, refId);
      final refs = <String>[];
      final subscription = port.openedDeliveryRefs.listen(refs.add);
      opened.add(const RemoteMessage(data: {'deliveryRef': refId}));
      opened.add(
        const RemoteMessage(data: {'deliveryRef': refId, 'owner': 'private'}),
      );
      opened.add(const RemoteMessage(data: {'deliveryRef': 'bad'}));
      await Future<void>.delayed(Duration.zero);
      expect(refs, [refId]);
      expect(sdk.calls, ['initial']);
      await subscription.cancel();
      await opened.close();
      await sdk.refreshes.close();
    },
  );
  test(
    'malformed token values never become SDK success or refresh data',
    () async {
      final sdk = Messaging();
      final port = FirebaseProactiveMessagingPort(messagingFactory: () => sdk);
      for (final value in [null, '', ' ', '\ud800', '界' * 1366, 'bad\nvalue']) {
        sdk.token = value;
        expect(await port.getToken(), isA<Failure<String>>());
      }
      final values = <String>[];
      final subscription = port.tokenRefreshes.listen(values.add);
      sdk.refreshes.add('synthetic-new');
      sdk.refreshes.add('\ud800');
      sdk.refreshes.add('bad\u0000');
      await Future<void>.delayed(Duration.zero);
      expect(values, ['synthetic-new']);
      await subscription.cancel();
      await sdk.refreshes.close();
    },
  );
  test('old delete retains physical SDK admission until settlement; no queued new get or auto retry', () async {
    final sdk = Messaging()..deletePending = Completer<void>();
    final port = FirebaseProactiveMessagingPort(messagingFactory: () => sdk);
    final deleting = port.deleteToken();
    await Future<void>.delayed(Duration.zero);
    expect(await port.getToken(), isA<Failure<String>>());
    expect(sdk.calls.where((c) => c == 'getToken'), isEmpty);
    sdk.deletePending!.complete();
    expect(await deleting, isA<Success<void>>());
    expect(await port.getToken(), isA<Success<String>>());
    expect(sdk.calls.where((c) => c == 'getToken'), hasLength(1));
    expect(sdk.autoInit.every((v) => !v), isTrue);
    await sdk.refreshes.close();
  });
  test('denied permission remains denied without token acquisition', () async {
    final sdk = Messaging()..status = AuthorizationStatus.denied;
    final port = FirebaseProactiveMessagingPort(messagingFactory: () => sdk);
    expect(
      (await port.permission() as Success).value,
      ProactiveNotificationPermission.denied,
    );
    expect(sdk.calls, ['permission']);
    await sdk.refreshes.close();
  });
}
