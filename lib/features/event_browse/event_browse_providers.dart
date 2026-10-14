import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import 'domain/activity_repository.dart';
import 'data/backend_activity_repository.dart';
import 'data/activity_source_actions.dart';

final activityRepositoryProvider = Provider<ActivityRepository>(
  (ref) => BackendActivityRepository(ref.watch(backendApiClientProvider)),
);

/// LI overrides with the actual native capability; no package/channel is invented.
final externalActivityOpenerProvider = Provider<ExternalActivityOpener?>(
  (ref) => null,
);
final activitySourceActionsProvider = Provider<ActivitySourceActions>(
  (ref) => ClipboardActivityActions(ref.watch(externalActivityOpenerProvider)),
);
