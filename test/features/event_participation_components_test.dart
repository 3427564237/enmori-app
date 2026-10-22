import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_participation/presentation/event_card.dart';
import 'package:enmori/features/event_participation/presentation/external_registration_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _Opener implements ExternalActivityOpener {
  var calls = 0;
  @override
  Future<bool> open(Uri sourceUrl, {required bool Function() current}) async {
    if (!current()) return false;
    calls++;
    return true;
  }
}

void main() {
  testWidgets(
    'same-subject replacement while disclosure is open cannot launch',
    (tester) async {
      final opener = _Opener();
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((ref) => sessions.stream),
          ],
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: Scaffold(
              body: ExternalRegistrationAction(
                eventId: 'event-a',
                sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
                opener: opener,
                confirmGoing: (_) async =>
                    throw StateError('No write expected'),
                readGoing: (_) async => throw StateError('No read expected'),
              ),
            ),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Register on organiser website'));
      await tester.pumpAndSettle();
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open website'));
      await tester.pumpAndSettle();
      expect(opener.calls, 0);
    },
  );

  testWidgets('account replacement while return dialog is open cannot write', (
    tester,
  ) async {
    final opener = _Opener();
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    var writes = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authSessionProvider.overrideWith((ref) => sessions.stream)],
        child: MaterialApp(
          theme: ThemeData(splashFactory: NoSplash.splashFactory),
          home: Scaffold(
            body: ExternalRegistrationAction(
              eventId: 'event-a',
              sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
              opener: opener,
              confirmGoing: (_) async {
                writes++;
                return const Success(null);
              },
              readGoing: (_) async => const Success(true),
            ),
          ),
        ),
      ),
    );
    sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register on organiser website'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open website'));
    await tester.pumpAndSettle();
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Did you complete registration?'), findsOneWidget);
    sessions.add(AuthSessionAuthenticated(subject: 'other-synthetic'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yes, mark Going'));
    await tester.pumpAndSettle();
    expect(writes, 0);
  });

  testWidgets(
    'shared card forwards stable ID and never invents hidden totals',
    (tester) async {
      String? selected;
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(splashFactory: NoSplash.splashFactory),
          home: Scaffold(
            body: EventCard(
              event: EventDetail(
                eventId: 'event-a',
                title: 'Source-backed title',
                startAt: DateTime.utc(2027),
                externalSourceUrl: 'https://www.ticketmaster.sg/event/a',
              ),
              onSelect: (id) => selected = id,
            ),
          ),
        ),
      );
      expect(find.textContaining('Until '), findsNothing);
      expect(find.textContaining('participants'), findsNothing);
      await tester.tap(find.text('Source-backed title'));
      expect(selected, 'event-a');
    },
  );

  testWidgets('disclosure cancel does not open or write', (tester) async {
    final opener = _Opener();
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authSessionProvider.overrideWith((ref) => sessions.stream)],
        child: MaterialApp(
          theme: ThemeData(splashFactory: NoSplash.splashFactory),
          home: Scaffold(
            body: ExternalRegistrationAction(
              eventId: 'event-a',
              sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
              opener: opener,
              confirmGoing: (_) async => throw StateError('No write expected'),
              readGoing: (_) async => throw StateError('No read expected'),
            ),
          ),
        ),
      ),
    );
    sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register on organiser website'));
    await tester.pumpAndSettle();
    expect(find.text('Continue to third-party registration?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(opener.calls, 0);
  });

  testWidgets('real lifecycle return requires explicit Yes and writes once', (
    tester,
  ) async {
    final opener = _Opener();
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    var writes = 0;
    String? writtenId;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authSessionProvider.overrideWith((ref) => sessions.stream)],
        child: MaterialApp(
          theme: ThemeData(splashFactory: NoSplash.splashFactory),
          home: Scaffold(
            body: ExternalRegistrationAction(
              eventId: 'event-a',
              sourceUrl: Uri.https('www.ticketmaster.sg', '/event/a'),
              opener: opener,
              confirmGoing: (id) async {
                writtenId = id;
                writes++;
                return const Success(null);
              },
              readGoing: (_) async => const Success(true),
            ),
          ),
        ),
      ),
    );
    sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register on organiser website'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open website'));
    await tester.pumpAndSettle();
    expect(writes, 0);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Did you complete registration?'), findsOneWidget);
    await tester.tap(find.text('Yes, mark Going'));
    await tester.pumpAndSettle();
    expect(writes, 1);
    expect(writtenId, 'event-a');
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Did you complete registration?'), findsNothing);
    expect(writes, 1);
  });
}
