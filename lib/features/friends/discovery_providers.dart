import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import 'data/backend_friend_discovery_repository.dart';
import 'data/backend_friend_ignore_repository.dart';
import 'domain/friend_discovery_repository.dart';
import 'domain/friend_ignore_repository.dart';

final friendDiscoveryRepositoryProvider = Provider<FriendDiscoveryRepository>(
  (ref) =>
      BackendFriendDiscoveryRepository(ref.watch(backendApiClientProvider)),
);
final friendIgnoreRepositoryProvider = Provider<FriendIgnoreRepository>(
  (ref) => BackendFriendIgnoreRepository(ref.watch(backendApiClientProvider)),
);
