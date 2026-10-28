import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/domain/event_content.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' show PlansRepo;

final class _Details implements EventDetailRepository {
  _Details(this.content);
  final EventContent content;
  @override
  Future<Result<EventDetail>> read(String id) async => Success(
    EventDetail(
      eventId: id,
      title: 'Synthetic event',
      startAt: DateTime.utc(2026, 11, 2),
      externalSourceUrl: content.bookingUrl ?? content.detailUrl,
      content: content,
    ),
  );
  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

final class _Opener implements ExternalActivityOpener {
  Uri? opened;
  @override
  Future<bool> open(Uri uri, {required bool Function() current}) async {
    if (!current()) return false;
    opened = uri;
    return true;
  }
}

void main() {
  for (final provider in ['ticketmaster', 'onepa']) {
    testWidgets(
      '$provider official information action is visible before long details and opens the information URL without a participation write',
      (tester) async {
        final url = provider == 'onepa'
            ? 'https://www.onepa.gov.sg/events/synthetic-12345678'
            : 'https://ticketmaster.sg/activity/detail/synthetic';
        final content = EventContent(
          provider: provider,
          detailUrl: url,
          timeZone: 'Asia/Singapore',
          bookingUrl: provider == 'ticketmaster'
              ? 'https://ticketmaster.sg/ticket/area/synthetic/123'
              : null,
          fullDescription: List.filled(
            100,
            'Full source paragraph.',
          ).join('\n\n'),
        );
        final repo = PlansRepo(), opener = _Opener();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
              ),
              participationRepositoryProvider.overrideWithValue(repo),
              eventDetailRepositoryProvider.overrideWithValue(
                _Details(content),
              ),
            ],
            child: MaterialApp(
              home: ParticipationEventPage(
                eventId: 'a',
                opener: opener,
                onParticipants: (_) {},
                detailBuilder: (context, event) =>
                    Text(event.content!.fullDescription!),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final action = find.text('Official event details');
        expect(action.hitTestable(), findsOneWidget);
        await tester.tap(action);
        await tester.pumpAndSettle();
        expect(opener.opened, Uri.parse(url));
        expect(repo.writes, isEmpty);
        expect(find.text('Did you complete registration?'), findsNothing);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
