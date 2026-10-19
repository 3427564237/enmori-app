import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import 'data/backend_social_repository.dart';
import 'domain/social_repository.dart';

final socialRepositoryProvider = Provider<SocialRepository>(
  (ref) => BackendSocialRepository(ref.watch(backendApiClientProvider)),
);
