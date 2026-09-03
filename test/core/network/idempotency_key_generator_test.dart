import 'dart:math';

import 'package:enmori/core/network/idempotency_key_generator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('generates a contract-valid base64url key', () {
    final generator = SecureIdempotencyKeyGenerator(random: Random(42));

    final key = generator.generate();

    expect(key, hasLength(24));
    expect(key, matches(RegExp(r'^[A-Za-z0-9_-]{22,64}$')));
    expect(key, isNot(contains('=')));
  });
}
