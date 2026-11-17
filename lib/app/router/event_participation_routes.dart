import '../admin_event_category_entry.dart';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/presentation/enmori_localizations.dart';
import '../../features/event_browse/domain/activity_repository.dart';
import '../../features/event_detail/presentation/event_information.dart';
import '../../features/event_detail/presentation/event_action_buttons.dart';
import '../../features/event_detail/presentation/recent_events_page.dart';
import '../../features/event_participation/domain/participation_repository.dart';
import '../../features/event_participation/presentation/event_plans_page.dart';
import '../../features/event_participation/presentation/participation_event_page.dart';
import '../../features/event_participation/presentation/participants_page.dart';
import '../../features/event_participation/presentation/participation_events_page.dart';

/// Explicit module registration only. LI enables this for the isolated candidate
/// after overriding ParticipationRepository, Detail repository and session source.
List<GoRoute> eventParticipationRoutes({
  required ExternalActivityOpener opener,
  required void Function(BuildContext, String) onProfile,
  String listPath = '/participation-events',
  String? plansPath,
  Widget Function(BuildContext, Widget)? wrapList,
  Widget Function(BuildContext, VoidCallback)? recommendationsBuilder,
  required bool Function() current,
}) => [
  GoRoute(
    path: listPath,
    name: 'root-events',
    builder: (context, state) {
      final page = ParticipationEventsPage(
        initialDestination: state.uri.queryParameters['tab'] == 'browse'
            ? EventsDestination.browse
            : EventsDestination.forYou,
        recommendationsBuilder: recommendationsBuilder,
        onOpenRecent: () {
          if (!_atCurrentRoute(context, listPath, current)) return;
          Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (recentContext) => RecentEventsPage(
                onSelect: (id) {
                  if (!current() || !recentContext.mounted) return;
                  Navigator.of(recentContext).pop();
                  context.push(
                    '/events/${Uri.encodeComponent(id)}/participation',
                  );
                },
              ),
            ),
          );
        },
        onSelect: (id) {
          if (_atCurrentRoute(context, listPath, current)) {
            context.push('/events/${Uri.encodeComponent(id)}/participation');
          }
        },
        onOpenPlans: plansPath == null
            ? null
            : () {
                if (_atCurrentRoute(context, listPath, current)) {
                  context.push<void>(plansPath);
                }
              },
      );
      return wrapList?.call(context, page) ?? page;
    },
  ),
  if (plansPath != null)
    GoRoute(
      path: plansPath,
      builder: (context, state) => EventPlansPage(
        onOpenEvent: (id) {
          if (_atCurrentRoute(context, plansPath, current)) {
            context.push<void>(
              '/events/${Uri.encodeComponent(id)}/participation',
            );
          }
        },
        onBack: () {
          if (!_atCurrentRoute(context, plansPath, current)) return;
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(listPath);
          }
        },
      ),
    ),
  GoRoute(
    path: '/events/:eventId/participation',
    builder: (context, state) => ParticipationEventPage(
      key: ValueKey(state.pathParameters['eventId']),
      eventId: state.pathParameters['eventId'] ?? '',
      detailBuilder: (context, event) => EventInformation(event: event),
      adminCategoryBuilder: (event, refresh) => AdminEventCategoryEntry(
        eventId: event.eventId,
        title: event.title,
        onReturn: refresh,
      ),
      actionsBuilder: (context, event, current) =>
          EventActionButtons(event: event, current: current),
      opener: opener,
      onParticipants: (s) {
        if (_atCurrentRoute(context, state.uri.path, current)) {
          context.push(
            '/events/${Uri.encodeComponent(s.eventId)}/people/${s.status.name}/${s.group.name}',
          );
        }
      },
    ),
  ),
  GoRoute(
    path: '/events/:eventId/people/:status/:group',
    builder: (context, state) {
      final status = ParticipationStatus.values
          .where(
            (v) =>
                v.name == state.pathParameters['status'] &&
                v != ParticipationStatus.none,
          )
          .firstOrNull;
      final group = ParticipantGroup.values
          .where((v) => v.name == state.pathParameters['group'])
          .firstOrNull;
      if (status == null || group == null) {
        return Scaffold(
          body: SafeArea(
            child: Text(
              context.tr('Invalid participant selection.', '参与者选择无效。'),
            ),
          ),
        );
      }
      return EventParticipantsPage(
        key: ValueKey(state.uri.path),
        selection: (
          eventId: state.pathParameters['eventId'] ?? '',
          status: status,
          group: group,
        ),
        onProfile: (username) {
          if (_atCurrentRoute(context, state.uri.path, current)) {
            onProfile(context, username);
          }
        },
      );
    },
  ),
];

bool _atCurrentRoute(
  BuildContext context,
  String sourcePath,
  bool Function() current,
) =>
    context.mounted &&
    current() &&
    GoRouter.of(context).state.uri.path == sourcePath;
