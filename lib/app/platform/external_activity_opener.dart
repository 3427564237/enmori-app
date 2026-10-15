import 'package:flutter/services.dart';

import '../../features/event_browse/data/backend_activity_repository.dart';
import '../../features/event_browse/domain/activity_repository.dart';

/// Android browser capability. Unsupported platforms fail to the copy fallback.
final class PlatformExternalActivityOpener implements ExternalActivityOpener {
  const PlatformExternalActivityOpener();

  static const channel = MethodChannel('com.enmori.app/external_activity');

  @override
  Future<bool> open(Uri sourceUrl, {required bool Function() current}) async {
    try {
      // No await between the final authority check and platform dispatch.
      if (!validActivitySourceUrl(sourceUrl) || !current()) return false;
      return await channel.invokeMethod<bool>('open', {
            'url': sourceUrl.toString(),
          }) ==
          true;
    } catch (_) {
      // Never expose the URL or raw platform errors in diagnostics.
      return false;
    }
  }
}
