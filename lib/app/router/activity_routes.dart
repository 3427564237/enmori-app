import '../admin_event_category_entry.dart';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/event_browse/data/backend_activity_repository.dart';
import '../../features/event_browse/presentation/activity_page.dart';
import '../../features/event_detail/presentation/event_information.dart';

/// Explicit controlled composition only; key presence never enables browsing.
final activityBrowseEnabledProvider = Provider<bool>((ref) => false);

List<GoRoute> activityRoutes({
  required bool Function() current,
  Widget Function(BuildContext, Widget)? wrapList,
}) => [
  GoRoute(
    path: '/activities',
    name: 'root-activities',
    builder: (context, state) {
      final page = ActivityPage(
        onSelect: (id) {
          if (context.mounted &&
              current() &&
              validBrowseId(id) &&
              GoRouter.of(context).state.uri.path == '/activities') {
            context.push<void>('/activities/${Uri.encodeComponent(id)}');
          }
        },
      );
      return wrapList?.call(context, page) ?? page;
    },
  ),
  GoRoute(
    path: '/activities/:browseId',
    builder: (context, state) => ActivityPage(
      key: ValueKey(state.pathParameters['browseId']),
      browseId: state.pathParameters['browseId'] ?? '',
      detailBuilder: (context, activity) =>
          EventInformation.activity(activity: activity),
      adminCategoryBuilder: (activity, refresh) =>
          activity.summary.eventId == null
          ? const SizedBox.shrink()
          : AdminEventCategoryEntry(
              eventId: activity.summary.eventId!,
              title: activity.summary.title,
              onReturn: refresh,
            ),
    ),
  ),
];
