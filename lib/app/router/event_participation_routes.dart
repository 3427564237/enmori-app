import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/event_browse/domain/activity_repository.dart';
import '../../features/event_participation/domain/participation_repository.dart';
import '../../features/event_participation/presentation/participation_event_page.dart';
import '../../features/event_participation/presentation/participants_page.dart';
import '../../features/event_participation/presentation/participation_events_page.dart';

/// Explicit module registration only. LI enables this for the isolated candidate
/// after overriding ParticipationRepository, Detail repository and session source.
List<GoRoute> eventParticipationRoutes({
  required ExternalActivityOpener opener,
  required ValueChanged<String> onProfile,
  required bool Function() current,
}) => [
  GoRoute(
    path: '/participation-events',
    builder: (context, state) => ParticipationEventsPage(
      onSelect: (id) {
        if (context.mounted && current()) {
          context.push('/events/${Uri.encodeComponent(id)}/participation');
        }
      },
    ),
  ),
  GoRoute(
    path: '/events/:eventId/participation',
    builder: (context, state) => ParticipationEventPage(
      key: ValueKey(state.pathParameters['eventId']),
      eventId: state.pathParameters['eventId'] ?? '',
      opener: opener,
      onParticipants: (s) {
        if (context.mounted && current()) {
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
        return const Scaffold(
          body: SafeArea(child: Text('Invalid participant selection.')),
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
          if (context.mounted && current()) onProfile(username);
        },
      );
    },
  ),
];
