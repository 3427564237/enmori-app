import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/domain/event_content.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_event_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' show PlansRepo, pauseApp, resumeApp;

final class _Details implements EventDetailRepository {
  _Details(this.content);
  EventContent content;
  int reads = 0;
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads++;
    return Success(
      EventDetail(
        eventId: id,
        title: 'Synthetic event',
        startAt: DateTime.utc(2026, 11, 2),
        externalSourceUrl: content.bookingUrl ?? content.detailUrl,
        content: content,
      ),
    );
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async => const Success(null);
}

final class _Opener implements ExternalActivityOpener {
  _Opener([this.completion]);

  final Future<bool>? completion;
  Uri? opened;
  @override
  Future<bool> open(Uri uri, {required bool Function() current}) async {
    if (!current()) return false;
    opened = uri;
    return completion ?? true;
  }
}

Future<void> _pumpEvent(
  WidgetTester tester,
  _Details details,
  PlansRepo repo,
  _Opener opener,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
        ),
        participationRepositoryProvider.overrideWithValue(repo),
        eventDetailRepositoryProvider.overrideWithValue(details),
      ],
      child: MaterialApp(
        home: ParticipationEventPage(
          eventId: 'a',
          opener: opener,
          onParticipants: (_) {},
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _returnFromBrowser(WidgetTester tester) async {
  pauseApp(tester);
  resumeApp(tester);
  await tester.pumpAndSettle();
}

void main() {
  const ticketmasterDetail =
      'https://ticketmaster.sg/activity/detail/synthetic';
  final confirmation = find.text('Did you complete registration?');

  testWidgets(
    'separate information link stays visible above long details and opens without return confirmation',
    (tester) async {
      final content = EventContent(
        provider: 'ticketmaster',
        detailUrl: ticketmasterDetail,
        timeZone: 'Asia/Singapore',
        bookingUrl: 'https://ticketmaster.sg/ticket/area/synthetic/123',
        fullDescription: List.filled(
          100,
          'Full source paragraph.',
        ).join('\n\n'),
      );
      final repo = PlansRepo(), opener = _Opener();
      await _pumpEvent(tester, _Details(content), repo, opener);
      expect(find.text(content.fullDescription!), findsOneWidget);
      final action = find.text('Official event details');
      expect(action.hitTestable(), findsOneWidget);
      await tester.tap(action);
      await tester.pumpAndSettle();
      expect(opener.opened, Uri.parse(ticketmasterDetail));
      await _returnFromBrowser(tester);
      expect(confirmation, findsNothing);
      expect(repo.writes, isEmpty);
      await tester.pumpWidget(const SizedBox());
    },
  );

  for (final (provider, detailUrl, bookingUrl) in [
    ('onepa', 'https://www.onepa.gov.sg/events/synthetic-12345678', null),
    ('ticketmaster', ticketmasterDetail, ticketmasterDetail),
  ]) {
    testWidgets(
      '$provider sole official event link offers Going confirmation after a browser return',
      (tester) async {
        final content = EventContent(
          provider: provider,
          detailUrl: detailUrl,
          timeZone: 'Asia/Singapore',
          bookingUrl: bookingUrl,
        );
        final repo = PlansRepo(), opener = _Opener();
        try {
          await _pumpEvent(tester, _Details(content), repo, opener);
          await _returnFromBrowser(tester);
          expect(confirmation, findsNothing);

          final action = find.text('Official event details');
          expect(action.hitTestable(), findsOneWidget);
          await tester.tap(action);
          await tester.pumpAndSettle();
          expect(find.text('Continue to the official site?'), findsOneWidget);
          await tester.tap(find.text('Open website'));
          await tester.pumpAndSettle();
          expect(opener.opened, Uri.parse(detailUrl));
          expect(confirmation, findsNothing);
          expect(repo.writes, isEmpty);

          await _returnFromBrowser(tester);
          expect(confirmation, findsOneWidget);
          await tester.tap(find.text('Yes, mark Going'));
          await tester.pumpAndSettle();
          expect(repo.writes.map((fact) => fact.eventId), ['a']);
          expect(repo.facts['a']?.status, ParticipationStatus.going);

          await _returnFromBrowser(tester);
          expect(confirmation, findsNothing);
          expect(repo.writes, hasLength(1));
        } finally {
          await tester.pumpWidget(const SizedBox());
        }
      },
    );
  }

  testWidgets(
    'a pending registration return survives the five-minute source expiry',
    (tester) async {
      const bookingUrl = 'https://ticketmaster.sg/ticket/area/synthetic/123';
      final content = EventContent(
        provider: 'ticketmaster',
        detailUrl: ticketmasterDetail,
        timeZone: 'Asia/Singapore',
        bookingUrl: bookingUrl,
      );
      final repo = PlansRepo(), opener = _Opener();
      try {
        await _pumpEvent(tester, _Details(content), repo, opener);
        final action = find.text('Tickets / booking on the official provider');
        await tester.scrollUntilVisible(
          action,
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(action);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Open website'));
        await tester.pumpAndSettle();
        expect(opener.opened, Uri.parse(bookingUrl));
        expect(repo.writes, isEmpty);

        pauseApp(tester);
        await tester.pump(const Duration(minutes: 5, seconds: 1));
        resumeApp(tester);
        await tester.pumpAndSettle();
        expect(confirmation, findsOneWidget);
        await tester.tap(find.text('No'));
        await tester.pumpAndSettle();
        expect(repo.writes, isEmpty);
      } finally {
        await tester.pumpWidget(const SizedBox());
      }
    },
  );

  testWidgets(
    'a provider URL refresh preserves the pending native handoff for this Event',
    (tester) async {
      const originalUrl = 'https://ticketmaster.sg/ticket/area/synthetic/123';
      const updatedUrl = 'https://ticketmaster.sg/ticket/area/synthetic/124';
      final completed = Completer<bool>();
      final repo = PlansRepo(), opener = _Opener(completed.future);
      final details = _Details(
        const EventContent(
          provider: 'ticketmaster',
          detailUrl: originalUrl,
          timeZone: 'Asia/Singapore',
        ),
      );
      try {
        await _pumpEvent(tester, details, repo, opener);
        await tester.tap(find.text('Official event details'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Open website'));
        await tester.pumpAndSettle();
        expect(opener.opened, Uri.parse(originalUrl));

        pauseApp(tester);
        await tester.pump(const Duration(minutes: 5, seconds: 1));
        details.content = EventContent(
          provider: 'ticketmaster',
          detailUrl: ticketmasterDetail,
          timeZone: 'Asia/Singapore',
          bookingUrl: updatedUrl,
          fullDescription: List.filled(
            30,
            'Fresh provider information.',
          ).join('\n\n'),
        );
        resumeApp(tester);
        await tester.pumpAndSettle();
        expect(details.reads, 2);
        final refreshedAction = find
            .text('Tickets / booking on the official provider')
            .hitTestable();
        expect(refreshedAction, findsNothing);
        expect(confirmation, findsNothing);
        expect(repo.writes, isEmpty);

        completed.complete(true);
        await tester.pumpAndSettle();
        expect(confirmation, findsOneWidget);
        await tester.tap(find.text('Yes, mark Going'));
        await tester.pumpAndSettle();
        expect(repo.facts['a']?.status, ParticipationStatus.going);
        expect(repo.writes.map((fact) => fact.eventId), ['a']);

        await tester.scrollUntilVisible(
          refreshedAction,
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(refreshedAction);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Open website'));
        await tester.pumpAndSettle();
        expect(opener.opened, Uri.parse(updatedUrl));
        expect(repo.writes, hasLength(1));
      } finally {
        await tester.pumpWidget(const SizedBox());
      }
    },
  );
}
