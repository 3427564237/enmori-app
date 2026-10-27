import 'domain/event_actions.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../event_browse/domain/activity_repository.dart';
import 'data/backend_event_detail_repository.dart';
import 'domain/event_detail_repository.dart';
import 'domain/event_cover.dart';
import 'data/ticketmaster_event_cover_loader.dart';

final eventCoverLoaderProvider = Provider<EventCoverLoader>(
  (ref) => const TicketmasterEventCoverLoader(),
);

final eventDetailRepositoryProvider = Provider<EventDetailRepository>(
  (ref) => BackendEventDetailRepository(
    ref.watch(backendApiClientProvider),
    includeVenueAddress: true,
  ),
);

/// Composition supplies the existing guarded platform source capability.
final eventDetailSourceActionsProvider = Provider<ActivitySourceActions?>(
  (ref) => null,
);

final eventActionsProvider = Provider<EventActions?>((ref) => null);
