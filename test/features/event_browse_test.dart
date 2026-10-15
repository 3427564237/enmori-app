import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/event_browse/data/activity_source_actions.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_browse/presentation/activity_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const id = 'tm_U3ludGhldGljXzAx';
const summary = ActivitySummary(
  browseId: id,
  title: 'Synthetic concert',
  startAt: '2026-10-16T00:00:00Z',
);
final detail = ActivityDetail(
  summary: summary,
  sourceUrl: Uri.parse('https://ticketmaster.sg/event/synthetic'),
);

final class Repo implements ActivityRepository {
  Result<ActivityRead> result = Success(
    ActivityBatch(asOf: '2026-10-15T00:00:00Z', items: [summary]),
  );
  Completer<Result<ActivityRead>>? pending;
  int calls = 0;
  @override
  Future<Result<ActivityRead>> read(String? browseId) async {
    calls++;
    return pending == null ? result : pending!.future;
  }
}

final class Opener implements ExternalActivityOpener {
  int calls = 0;
  bool success = true;
  Uri? received;
  @override
  Future<bool> open(Uri url, {required bool Function() current}) async {
    if (!current()) return false;
    calls++;
    received = url;
    return success;
  }
}

Future<void> reveal(WidgetTester tester, Finder target) async {
  // Long disclosure paragraphs can move a sibling outside ListView's build
  // cache. Start at the top and scroll it into the built, laid-out viewport.
  await tester.drag(find.byType(ListView), const Offset(0, 5000));
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(target, 200);
  await tester.pumpAndSettle();
}

Future<void> pump(
  WidgetTester tester,
  Repo repo, {
  String key = '',
  ValueChanged<String>? select,
  Opener? opener,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWith(
          (_) => Stream.value(
            const AuthSessionAuthenticated(subject: 'synthetic'),
          ),
        ),
        activityRepositoryProvider.overrideWithValue(repo),
        externalActivityOpenerProvider.overrideWithValue(opener),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: ActivityPage(browseId: key, onSelect: select),
      ),
    ),
  );
  await tester.pumpAndSettle();
  // First observation may arrive after page init. Only this explicit Reload is
  // issued when observation reset leaves the page empty; no hidden retry.
  if (repo.calls == 0) {
    await reveal(tester, find.text('Reload'));
    await tester.tap(find.text('Reload'));
    await tester.pump();
  }
  if (repo.pending == null) await tester.pumpAndSettle();
  await tester.drag(find.byType(ListView), const Offset(0, 5000));
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('strict parser preserves nanos, rejects invalid calendar/keys/Unicode/URL/identity and false empty', () async {
    Future<Result<ActivityRead>> read(
      Map<String, Object?> raw, {
      String? key,
    }) async {
      final client = BackendApiClient(
        Uri.parse('https://controlled.example'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (r) async => http.Response(
            jsonEncode(raw),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      );
      return BackendActivityRepository(client).read(key);
    }

    final raw = <String, Object?>{
      'browseId': id,
      'title': summary.title,
      'startAt': '2026-10-16T00:00:00.123456789Z',
      'endAt': '2026-10-16T00:00:00.123456790Z',
      'externalSourceUrl': detail.sourceUrl.toString(),
    };
    final valid = await read(raw, key: id);
    expect(valid, isA<Success<ActivityRead>>());
    expect(
      ((valid as Success<ActivityRead>).value as ActivityDetail)
          .summary
          .startAt,
      raw['startAt'],
    );
    for (final bad in [
      {...raw, 'title': '\ud800'},
      {...raw, 'title': 'bad\u202e'},
      {...raw, 'startAt': '2026-02-30T00:00:00Z'},
      {...raw, 'externalSourceUrl': 'https://ticketmaster.sg.evil/x'},
      {...raw, 'browseId': 'tm_YQ'},
      {...raw, 'unexpected': true},
      {...raw, 'endAt': raw['startAt']},
      {
        ...raw,
        'externalSourceUrl': 'https://ticketmaster.sg/x?apikey=synthetic',
      },
    ]) {
      expect(await read(bad, key: id), isA<Failure<ActivityRead>>());
    }
    expect(
      await read({
        'asOf': '2026-10-15T00:00:00Z',
        'scope': 'ticketmaster_sg_first_batch_v1',
        'items': [],
      }),
      isA<Success<ActivityRead>>(),
    );
    expect(
      await read({'scope': 'ticketmaster_sg_first_batch_v1'}),
      isA<Failure<ActivityRead>>(),
    );
    expect(validBrowseId('$id='), false);
  });
  testWidgets(
    'independent list selection forwards only browse locator and labels bounded/missing-end data',
    (tester) async {
      final repo = Repo();
      String? selected;
      await pump(tester, repo, select: (id) => selected = id);
      expect(find.text(summary.title), findsOneWidget);
      expect(find.textContaining('not the full catalogue'), findsOneWidget);
      expect(find.textContaining('End time unavailable.'), findsOneWidget);
      await tester.tap(find.byType(ListTile));
      expect(selected, id);
      expect(repo.calls, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'zero batch and provider failure stay distinct; only explicit retry starts next read',
    (tester) async {
      final repo = Repo()
        ..result = Success(
          ActivityBatch(asOf: '2026-10-15T00:00:00Z', items: []),
        );
      await pump(tester, repo);
      expect(
        find.text('No eligible activities were found in this source batch.'),
        findsOneWidget,
      );
      repo.result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Activities are unavailable. Try again.',
        ),
      );
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(find.text('Retry'), findsOneWidget);
      expect(find.textContaining('No eligible activities'), findsNothing);
      expect(repo.calls, 2);
      repo.result = Success(
        ActivityBatch(asOf: '2026-10-15T00:00:00Z', items: [summary]),
      );
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(repo.calls, 3);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'Detail opens only on explicit action, exact URL handoff/failure/copy; no registration state',
    (tester) async {
      final repo = Repo()..result = Success(detail), opener = Opener();
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (c) async {
          if (c.method == 'Clipboard.setData') {
            copied = (c.arguments as Map)['text'] as String;
          }
          return null;
        },
      );
      await pump(tester, repo, key: id, opener: opener);
      expect(opener.calls, 0);
      expect(find.text('Description unavailable.'), findsOneWidget);
      await reveal(tester, find.text('View on Ticketmaster'));
      await tester.tap(find.text('View on Ticketmaster'));
      await tester.pumpAndSettle();
      expect(opener.calls, 1);
      expect(opener.received, detail.sourceUrl);
      expect(find.textContaining('registered'), findsNothing);
      expect(find.text('Going'), findsNothing);
      opener.success = false;
      await reveal(tester, find.text('View on Ticketmaster'));
      await tester.tap(find.text('View on Ticketmaster'));
      await tester.pumpAndSettle();
      expect(
        find.text('Could not open the source page. You can copy the link.'),
        findsOneWidget,
      );
      await reveal(tester, find.text('Copy source link'));
      await tester.tap(find.text('Copy source link'));
      await tester.pumpAndSettle();
      expect(copied, detail.sourceUrl.toString());
      await tester.pumpWidget(const SizedBox());
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      );
    },
  );
  testWidgets(
    'background/return clears pending or visible content; no auto read or late resurrection',
    (tester) async {
      final repo = Repo()..pending = Completer<Result<ActivityRead>>();
      await pump(tester, repo);
      expect(repo.calls, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      repo.pending!.complete(Success(detail));
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(find.text(summary.title), findsNothing);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(repo.calls, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'same-identity replacement and logout discard pending reads without automatic reload',
    (tester) async {
      final sessions = StreamController<AuthSession>.broadcast();
      final repo = Repo()..pending = Completer<Result<ActivityRead>>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith((_) => sessions.stream),
            activityRepositoryProvider.overrideWithValue(repo),
          ],
          child: const MaterialApp(home: ActivityPage()),
        ),
      );
      await tester.pump();
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reload'));
      await tester.pump();
      expect(repo.calls, 1);
      sessions.add(AuthSessionAuthenticated(subject: 'synthetic'));
      await tester.pumpAndSettle();
      repo.pending!.complete(Success(detail));
      await tester.pump();
      expect(find.text(summary.title), findsNothing);
      expect(repo.calls, 1);
      repo.pending = null;
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(find.text(summary.title), findsOneWidget);
      sessions.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      expect(find.text(summary.title), findsNothing);
      await tester.pumpWidget(const SizedBox());
      await sessions.close();
    },
  );
  testWidgets(
    'list disclosure stays available for empty and failed reads without extra requests',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = Repo()
        ..result = Success(
          ActivityBatch(asOf: '2026-10-15T00:00:00Z', items: []),
        );
      await pump(tester, repo, scale: 2);
      final disclosure = find.text(
        'Source: Ticketmaster. Activity requests pass through ENMORI to Ticketmaster. '
        'Your ENMORI sign-in token, profile, Check-ins, Personas and AI messages are '
        'not shared with Ticketmaster. Ticketmaster receives the activity request '
        'and server connection information.',
      );
      await reveal(tester, disclosure);
      expect(disclosure, findsOneWidget);
      await reveal(tester, find.textContaining('at most five minutes'));
      expect(find.textContaining('at most five minutes'), findsOneWidget);
      expect(repo.calls, 1);
      repo.result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Activities are unavailable. Try again.',
        ),
      );
      await reveal(tester, find.text('Reload'));
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      await reveal(tester, disclosure);
      expect(disclosure, findsOneWidget);
      await reveal(tester, find.text('Retry'));
      expect(find.text('Retry'), findsOneWidget);
      expect(find.textContaining('No eligible activities'), findsNothing);
      expect(repo.calls, 2);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'Detail disclosure precedes explicit source actions and remains reachable at 320px with 2x text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = Repo()..result = Success(detail), opener = Opener();
      await pump(tester, repo, key: id, opener: opener, scale: 2);
      final explanation = find.text(
        '“View on Ticketmaster” opens the source page in your browser. Your browser '
        'connects directly to Ticketmaster; its privacy and cookie policies apply. '
        'Opening or copying a link does not register you or mark you as Going. '
        "A copied link can remain on your device's clipboard.",
      );
      await reveal(tester, explanation);
      expect(explanation, findsOneWidget);
      expect(opener.calls, 0);
      await reveal(tester, find.text('View on Ticketmaster'));
      expect(
        tester.getTopLeft(explanation).dy,
        lessThan(tester.getTopLeft(find.text('View on Ticketmaster')).dy),
      );
      await tester.tap(find.text('View on Ticketmaster'));
      await tester.pumpAndSettle();
      expect(opener.calls, 1);
      expect(opener.received, detail.sourceUrl);
      await reveal(tester, find.textContaining('at most five minutes'));
      expect(
        find.textContaining('Reload to request current information.'),
        findsOneWidget,
      );
      expect(repo.calls, 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'five-minute visible limit clears and requires explicit Reload; 320px large text remains scrollable',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = Repo()..result = Success(detail);
      await pump(tester, repo, key: id, scale: 1.5);
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(minutes: 5));
      await tester.pump();
      expect(find.text(summary.title), findsNothing);
      expect(find.text('Reload activities to continue.'), findsOneWidget);
      expect(repo.calls, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );
  test(
    'source actions reject revoked or nonapproved URL before platform handoff',
    () async {
      final opener = Opener(), actions = ClipboardActivityActions(Opener());
      expect(
        await ClipboardActivityActions(opener)
            .open(detail.sourceUrl, () => false),
        isA<Failure<void>>(),
      );
      expect(
        await actions.open(Uri.parse('https://evil.example'), () => true),
        isA<Failure<void>>(),
      );
      expect(opener.calls, 0);
    },
  );
}
