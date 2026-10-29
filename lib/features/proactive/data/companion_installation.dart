import 'package:flutter/services.dart';

import '../domain/proactive_messaging.dart';

/// Installation-local, no-backup native storage. No FCM or permission side effect.
Future<String?> readCompanionInstallation({
  MethodChannel channel = const MethodChannel(
    'com.enmori.app/proactive_notifications',
  ),
}) async {
  try {
    final value = await channel.invokeMethod<String>('installationRef');
    return value != null && isProactiveUuid(value) ? value : null;
  } catch (_) {
    return null;
  }
}
