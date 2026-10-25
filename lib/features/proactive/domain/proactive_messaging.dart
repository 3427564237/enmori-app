import '../../../core/result/result.dart';
import 'proactive.dart';

enum ProactiveNotificationPermission { notDetermined, granted, denied }

enum ProactiveRegistrationAvailability { registered, unregistered, expired }

/// Owner-visible metadata only. A routing token must never enter UI state.
final class ProactiveRegistration {
  const ProactiveRegistration({
    required this.revision,
    required this.enabled,
    required this.availability,
    this.installationRef,
    this.expiresAt,
  });
  final int revision;
  final bool enabled;
  final ProactiveRegistrationAvailability availability;
  final String? installationRef;
  final DateTime? expiresAt;
  bool currentFor(String installation, DateTime now) =>
      enabled &&
      availability == ProactiveRegistrationAvailability.registered &&
      installationRef == installation &&
      expiresAt?.isAfter(now) == true;
}

abstract interface class ProactiveRegistrationRepository {
  Future<Result<ProactiveRegistration>> read({
    required String token,
    required ProactiveAbortSignal abort,
  });
  Future<Result<ProactiveRegistration>> replace({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
    required String registrationValue,
  });
  Future<Result<ProactiveRegistration>> delete({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
  });
}

/// SDK operations are explicit. Construction and disabled composition do not
/// obtain a token, subscribe or enable SDK auto-initialization.
abstract interface class ProactiveMessagingPort {
  Future<Result<ProactiveNotificationPermission>> permission();
  Future<Result<ProactiveNotificationPermission>> requestPermission();
  Future<Result<bool>> prepareChannel();
  Future<Result<String>> getToken();
  Future<Result<void>> deleteToken();
  Stream<String> get tokenRefreshes;
  Future<Result<String?>> initialDeliveryRef();
  Stream<String> get openedDeliveryRefs;
}

final class ProactiveMessageTarget {
  const ProactiveMessageTarget({
    required this.conversationId,
    required this.messageId,
  });
  final String conversationId, messageId;
}

typedef ProactiveDeliveryResolver =
    Future<Result<ProactiveMessageTarget>> Function({
      required String token,
      required String deliveryRef,
      required ProactiveAbortSignal abort,
    });

bool isProactiveUuid(String value) => RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
).hasMatch(value);

/// Reject malformed UTF-16 before UTF-8 encoding can replace a token's bytes.
bool isProactiveWellFormed(String value) {
  final units = value.codeUnits;
  for (var i = 0; i < units.length; i++) {
    final c = units[i];
    if (c >= 0xd800 && c <= 0xdbff) {
      if (++i >= units.length || units[i] < 0xdc00 || units[i] > 0xdfff) {
        return false;
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return false;
    }
  }
  return true;
}
