import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import 'data/backend_friend_repository.dart';
import 'domain/friend_repository.dart';

final friendRepositoryProvider = Provider<FriendRepository>(
  (ref) => BackendFriendRepository(ref.watch(backendApiClientProvider)),
);
