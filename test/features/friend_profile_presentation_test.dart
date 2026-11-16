import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/remote_social_composition.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/user_participation_section.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/presentation/social_profile_page.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'social_profile_flow_test.dart' show SocialFake;
import 'plan_comparison_test.dart' show ComparisonRepo;
import 'event_plans_test.dart' show Details;

void main() {
  for (final locale in ['en', 'zh']) {
    for (final (label, size, scale, dark) in [
      ('phone', const Size(375, 812), 1.0, false),
      ('narrow-large', const Size(320, 640), 2.0, false),
      ('landscape', const Size(812, 375), 2.0, false),
      ('tablet-dark', const Size(1024, 768), 1.0, true),
    ]) {
      testWidgets(
        'Friend profile $locale $label shows shared plans and remains usable',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final rig = await _pump(
            tester,
            locale: locale,
            scale: scale,
            dark: dark,
          );
          expect(find.text('Avery Tan'), findsOneWidget);
          expect(tester.takeException(), isNull);
          await _capture(tester, 'profile-$locale-$label');
          await _show(tester, find.byType(UserParticipationSection));
          await tester.pumpAndSettle();
          expect(find.text('An evening of music a'), findsOneWidget);
          expect(find.text('An evening of music b'), findsOneWidget);
          expect(
            find.text(locale == 'en' ? 'Interested' : '感兴趣'),
            findsOneWidget,
          );
          expect(find.text(locale == 'en' ? 'Going' : '将参加'), findsOneWidget);
          expect(rig.plans.requests.single.username, 'member_b');
          await _capture(tester, 'events-$locale-$label');
          await _show(
            tester,
            find.text(locale == 'en' ? 'Remove friend' : '删除好友'),
          );
          expect(tester.takeException(), isNull);
          await _dispose(tester, rig);
        },
      );
    }
  }

  testWidgets(
    'Inline event opens its stable ID, returns and freshly rereads privacy',
    (tester) async {
      final rig = await _pump(tester);
      await _show(tester, find.text('An evening of music b'));
      await tester.tap(find.text('An evening of music b'));
      await tester.pumpAndSettle();
      expect(rig.router.state.uri.path, '/events/b/participation');
      rig.profile.available = false;
      rig.container.read(contentAccessProvider.notifier).changed();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(rig.profile.reads, 2);
      await _show(
        tester,
        find.text('No event participation is available to view.'),
      );
      expect(find.byType(UserParticipationSection), findsNothing);
      expect(find.text('An evening of music b'), findsNothing);
      expect(rig.plans.requests.length, 1);
      await _dispose(tester, rig);
    },
  );

  testWidgets(
    'Sparse participation pages continue and errors remain distinct from empty',
    (tester) async {
      final plans = ComparisonRepo()
        ..pages[null] = Success(PublicParticipationPage([], 'next'));
      plans.pages['next'] = const Failure(participationUnavailable);
      final rig = await _pump(tester, plans: plans);
      await _show(tester, find.text('Next visible participation page'));
      expect(
        find.text('No visible records on this page; more pages are available.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Next visible participation page'));
      await tester.pumpAndSettle();
      expect(plans.requests.last.cursor, 'next');
      expect(find.text(participationUnavailable.message), findsOneWidget);
      plans.pages['next'] = Success(PublicParticipationPage([], null));
      await _show(tester, find.text('Read visible participation'));
      await tester.tap(find.text('Read visible participation'));
      await tester.pumpAndSettle();
      expect(find.text('No visible participation records.'), findsOneWidget);
      expect(find.text(participationUnavailable.message), findsNothing);
      await _dispose(tester, rig);
    },
  );

  testWidgets('Unavailable participation never reads the friend list', (
    tester,
  ) async {
    final rig = await _pump(tester, profile: _Profile()..available = false);
    await _show(
      tester,
      find.text('No event participation is available to view.'),
    );
    expect(rig.plans.requests, isEmpty);
    await _dispose(tester, rig);
  });

  testWidgets(
    'Late friend events and old taps cannot survive background revocation',
    (tester) async {
      final rig = await _pump(tester);
      await _show(tester, find.text('An evening of music a'));
      final oldTap = tester
          .widget<ListTile>(
            find.ancestor(
              of: find.text('An evening of music a'),
              matching: find.byType(ListTile),
            ),
          )
          .onTap!;
      final pending = Completer<Result<PublicParticipationPage>>();
      rig.plans.pendingPublic = pending;
      rig.container.invalidate(
        userParticipationPageProvider((username: 'member_b', cursor: null)),
      );
      await tester.pump();
      rig.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pumpAndSettle();
      pending.complete(
        Success(
          PublicParticipationPage([
            const PublicParticipation('secret', ParticipationStatus.going),
          ], null),
        ),
      );
      await tester.pumpAndSettle();
      oldTap();
      await tester.pumpAndSettle();
      expect(find.text('An evening of music secret'), findsNothing);
      expect(rig.router.state.uri.path, '/');
      expect(tester.takeException(), isNull);
      await _dispose(tester, rig);
    },
  );

  testWidgets('Replaced session retires inline event callbacks', (
    tester,
  ) async {
    final sessions = StreamController<AuthSession>.broadcast();
    final rig = await _pump(tester, sessions: sessions);
    await _show(tester, find.text('An evening of music a'));
    final oldTap = tester
        .widget<ListTile>(
          find.ancestor(
            of: find.text('An evening of music a'),
            matching: find.byType(ListTile),
          ),
        )
        .onTap!;
    sessions.add(AuthSessionAuthenticated(subject: 'viewer'));
    await tester.pumpAndSettle();
    oldTap();
    await tester.pumpAndSettle();
    expect(rig.router.state.uri.path, '/');
    expect(find.text('An evening of music a'), findsNothing);
    expect(tester.takeException(), isNull);
    await _dispose(tester, rig);
    await sessions.close();
  });
}

class _Profile extends SocialFake {
  bool available = true;
  int reads = 0;
  @override
  Future<Result<SocialProfile>> profile(String username) async {
    reads++;
    return Success(
      SocialProfile(
        username: username,
        displayName: 'Avery Tan',
        details: const ProfileDetails(
          bio: 'Weekend walks, live music and finding a new favourite café.',
          affiliationName: 'Northshore University',
          region: 'North-East',
        ),
        relationship: SocialRelationship.friend,
        specialCare: false,
        friendshipRevision: 4,
        interests: const [
          SharedInterest('music', 'Music'),
          SharedInterest('outdoors', 'Outdoors'),
          SharedInterest('art', 'Art & design'),
        ],
        mapAvailable: true,
        participationAvailable: available,
      ),
    );
  }
}

typedef _Rig = ({
  ProviderContainer container,
  GoRouter router,
  _Profile profile,
  ComparisonRepo plans,
});

Future<_Rig> _pump(
  WidgetTester tester, {
  String locale = 'en',
  double scale = 1,
  bool dark = false,
  _Profile? profile,
  ComparisonRepo? plans,
  StreamController<AuthSession>? sessions,
}) async {
  if (Platform.environment['ENMORI_PROFILE_PREVIEW'] != null) {
    await _fonts(tester);
  }
  profile ??= _Profile();
  plans ??= ComparisonRepo()
    ..pages[null] = Success(
      PublicParticipationPage([
        const PublicParticipation('a', ParticipationStatus.interested),
        const PublicParticipation('b', ParticipationStatus.going),
      ], null),
    );
  final container = ProviderContainer(
    overrides: [
      if (sessions == null)
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'viewer')),
        )
      else
        authSessionProvider.overrideWith((ref) => sessions.stream),
      socialRepositoryProvider.overrideWithValue(profile),
      participationRepositoryProvider.overrideWithValue(plans),
      eventDetailRepositoryProvider.overrideWithValue(Details()),
    ],
  );
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => SocialProfilePage(
          username: 'member_b',
          initialDate: '2026-11-16',
          timeZone: 'Asia/Singapore',
          openAttribution: (_) async => false,
          participationSectionBuilder: groupProfileParticipationBuilder,
          participationBuilder: groupParticipationBuilder,
        ),
      ),
      GoRoute(
        path: '/events/:id/participation',
        builder: (_, state) => Scaffold(
          appBar: AppBar(title: const Text('Event')),
          body: Text('Event ${state.pathParameters['id']}'),
        ),
      ),
    ],
  );
  final theme = dark
      ? ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff244b3f),
            brightness: Brightness.dark,
          ),
        )
      : enmoriTheme();
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: RepaintBoundary(
        key: const Key('capture'),
        child: MaterialApp.router(
          routerConfig: router,
          debugShowCheckedModeBanner: false,
          theme: theme.copyWith(
            textTheme: theme.textTheme.apply(
              fontFamilyFallback: ['Preview CJK'],
            ),
          ),
          locale: Locale(locale),
          supportedLocales: const [Locale('en'), Locale('zh')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(scale),
              disableAnimations: true,
            ),
            child: child!,
          ),
        ),
      ),
    ),
  );
  if (sessions != null) {
    sessions.add(AuthSessionAuthenticated(subject: 'viewer'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reload'));
  }
  await tester.pumpAndSettle();
  return (container: container, router: router, profile: profile, plans: plans);
}

Future<void> _show(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      150,
      scrollable: find.byType(Scrollable).first,
      maxScrolls: 80,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, _Rig rig) async {
  await tester.pumpWidget(const SizedBox.shrink());
  rig.router.dispose();
  rig.container.dispose();
  await tester.pump();
}

Future<void> _fonts(WidgetTester tester) async {
  for (final (family, path) in [
    ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
    ('Preview CJK', Platform.environment['ENMORI_CAPTURE_CJK']),
    ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
    (
      'Playfair Display',
      'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
    ),
  ]) {
    if (path == null) continue;
    await tester.runAsync(() async {
      final bytes = await File(path).readAsBytes();
      await (FontLoader(
        family,
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    });
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_PROFILE_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('capture')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
