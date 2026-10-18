import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../event_browse/domain/activity_repository.dart';
import 'data/backend_event_detail_repository.dart';
import 'domain/event_detail_repository.dart';

final eventDetailRepositoryProvider = Provider<EventDetailRepository>(
  (ref) => BackendEventDetailRepository(ref.watch(backendApiClientProvider)),
);

/// Composition supplies the existing guarded platform source capability.
final eventDetailSourceActionsProvider = Provider<ActivitySourceActions?>(
  (ref) => null,
);
