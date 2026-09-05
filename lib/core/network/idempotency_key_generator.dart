import 'dart:convert';
import 'dart:math';

abstract interface class IdempotencyKeyGenerator {
  String generate();
}

final class SecureIdempotencyKeyGenerator implements IdempotencyKeyGenerator {
  SecureIdempotencyKeyGenerator({Random? random})
    : _random = random ?? Random.secure();

  final Random _random;

  @override
  String generate() {
    final bytes = List<int>.generate(18, (_) => _random.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }
}
