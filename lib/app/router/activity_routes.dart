import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/event_browse/data/backend_activity_repository.dart';
import '../../features/event_browse/presentation/activity_page.dart';

/// Explicit controlled composition only; key presence never enables browsing.
final activityBrowseEnabledProvider = Provider<bool>((ref) => false);

List<GoRoute> activityRoutes({required bool Function() current}) => [
  GoRoute(
    path: '/activities',
    builder: (context, state) => ActivityPage(
      onSelect: (id) {
        if (context.mounted &&
            current() &&
            validBrowseId(id) &&
            GoRouter.of(context).state.uri.path == '/activities') {
          context.push<void>('/activities/${Uri.encodeComponent(id)}');
        }
      },
    ),
  ),
  GoRoute(
    path: '/activities/:browseId',
    builder: (context, state) => ActivityPage(
      key: ValueKey(state.pathParameters['browseId']),
      browseId: state.pathParameters['browseId'] ?? '',
    ),
  ),
];
