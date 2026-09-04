import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'idempotency_key_generator.dart';

final idempotencyKeyGeneratorProvider = Provider<IdempotencyKeyGenerator>(
  (ref) => SecureIdempotencyKeyGenerator(),
);
