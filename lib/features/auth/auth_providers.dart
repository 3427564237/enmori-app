import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/unavailable_auth_repository.dart';
import 'domain/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => const UnavailableAuthRepository(),
);

final authSessionProvider = StreamProvider<AuthSession>((ref) {
  return ref.watch(authRepositoryProvider).watchSession();
});

final currentAuthSubjectProvider = Provider<String?>((ref) {
  return switch (ref.watch(authSessionProvider)) {
    AsyncData<AuthSession>(value: AuthSessionAuthenticated(:final subject)) =>
      subject,
    _ => null,
  };
});
