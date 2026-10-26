import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';

import '../../../core/result/result.dart';
import '../domain/proactive_messaging.dart';

/// The pinned 16.7.0 API only. The factory is lazy, including for default-null
/// installations. No constructor call initializes Messaging or registers a token.
final class FirebaseProactiveMessagingPort implements ProactiveMessagingPort {
  FirebaseProactiveMessagingPort({
    FirebaseMessaging Function()? messagingFactory,
    MethodChannel? channel,
    Stream<RemoteMessage>? openedMessages,
  }) : this._(
         messagingFactory ?? (() => FirebaseMessaging.instance),
         channel ??
             const MethodChannel('com.enmori.app/proactive_notifications'),
         openedMessages,
       );
  FirebaseProactiveMessagingPort._(
    this._factory,
    this._channel,
    this._openedMessages,
  );
  final FirebaseMessaging Function() _factory;
  final MethodChannel _channel;
  final Stream<RemoteMessage>? _openedMessages;
  FirebaseMessaging? _instance;
  FirebaseMessaging get _sdk => _instance ??= _factory();
  bool _mutating = false;
  Future<Result<T>> _serial<T>(Future<Result<T>> Function() run) async {
    if (_mutating) return const Failure(_unavailable);
    _mutating = true;
    try {
      return await run();
    } finally {
      _mutating = false;
    }
  }

  @override
  Future<Result<ProactiveNotificationPermission>> permission() async {
    try {
      return Success(
        _permission((await _sdk.getNotificationSettings()).authorizationStatus),
      );
    } catch (_) {
      return const Failure(_unavailable);
    }
  }

  @override
  Future<Result<ProactiveNotificationPermission>> requestPermission() =>
      _serial(() async {
        try {
          // Never enable persisted automatic registration, even after opt-in.
          await _sdk.setAutoInitEnabled(false);
          return Success(
            _permission(
              (await _sdk.requestPermission(provisional: false))
                  .authorizationStatus,
            ),
          );
        } catch (_) {
          return const Failure(_unavailable);
        }
      });
  @override
  Future<Result<bool>> prepareChannel() async {
    try {
      return Success(
        await _channel.invokeMethod<bool>('prepareChannel') == true,
      );
    } catch (_) {
      return const Failure(_unavailable);
    }
  }

  @override
  Future<Result<String>> getToken() => _serial(() async {
    try {
      await _sdk.setAutoInitEnabled(false);
      final value = await _sdk.getToken();
      return value != null && _token(value)
          ? Success(value)
          : const Failure(_unavailable);
    } catch (_) {
      return const Failure(_unavailable);
    }
  });
  @override
  Future<Result<void>> deleteToken() => _serial(() async {
    try {
      await _sdk.setAutoInitEnabled(false);
      await _sdk.deleteToken();
      return const Success(null);
    } catch (_) {
      return const Failure(_unavailable);
    }
  });
  @override
  Stream<String> get tokenRefreshes => _sdk.onTokenRefresh.where(_token);
  @override
  Future<Result<String?>> initialDeliveryRef() async {
    try {
      return Success(_reference(await _sdk.getInitialMessage()));
    } catch (_) {
      return const Failure(_unavailable);
    }
  }

  @override
  Stream<String> get openedDeliveryRefs =>
      (_openedMessages ?? FirebaseMessaging.onMessageOpenedApp)
          .map(_reference)
          .where((value) => value != null)
          .cast<String>();

  static ProactiveNotificationPermission _permission(
    AuthorizationStatus value,
  ) => switch (value) {
    AuthorizationStatus.authorized => ProactiveNotificationPermission.granted,
    AuthorizationStatus.notDetermined =>
      ProactiveNotificationPermission.notDetermined,
    _ => ProactiveNotificationPermission.denied,
  };
  static bool _token(String value) =>
      isProactiveWellFormed(value) &&
      value.trim().isNotEmpty &&
      utf8.encode(value).length <= 4096 &&
      !RegExp(r'[\x00-\x1f\x7f]').hasMatch(value);
  static String? _reference(RemoteMessage? message) {
    final data = message?.data;
    if (data == null || data.length != 1 || data['deliveryRef'] is! String) {
      return null;
    }
    final value = data['deliveryRef'] as String;
    return isProactiveUuid(value) ? value : null;
  }
}

const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Notification access could not be verified. Check again.',
);
