import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/presentation/own_profile_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [320.0, 390.0]) {
    testWidgets(
      'compact Home identity retains privacy and edit actions at width $width',
      (tester) async {
        await tester.binding.setSurfaceSize(Size(width, 844));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        var edits = 0;
        const profile = OwnProfile(
          username: 'synthetic-owner',
          displayName: 'Synthetic owner',
          visibility: ProfileVisibility.friendsOnly,
          revision: 1,
        );
        Future<void> pumpHeader({required bool compact}) => tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: Scaffold(
                body: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    OwnProfileHeader(
                      profile: profile,
                      compact: compact,
                      onEdit: () => edits++,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
        await pumpHeader(compact: false);
        await tester.pumpAndSettle();
        final regularHeight = tester
            .getSize(find.byType(OwnProfileHeader))
            .height;
        await pumpHeader(compact: true);
        await tester.pumpAndSettle();
        expect(
          tester.getSize(find.byType(OwnProfileHeader)).height,
          lessThan(regularHeight - 40),
        );
        expect(find.text('Synthetic owner'), findsOneWidget);
        expect(find.byKey(const Key('own-avatar-edit')), findsOneWidget);
        await tester.tap(find.byKey(const Key('profile-edit')));
        expect(edits, 1);
        await tester.tap(find.byKey(const Key('profile-audience')));
        await tester.pumpAndSettle();
        expect(find.textContaining('separate controls'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final width in [320.0, 390.0, 660.0]) {
    testWidgets(
      'Home check-in stays fixed across identity loading at width $width',
      (tester) async {
        await tester.binding.setSurfaceSize(Size(width, 844));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        final loaded = ValueNotifier(false);
        addTearDown(loaded.dispose);
        var checkIns = 0;
        await tester.pumpWidget(
          MaterialApp(
            home: HomeShellPage(
              socialStyle: true,
              onStartCheckIn: () => checkIns++,
              onSeeAllEvents: () {},
              onSelectTab: (_) {},
              onOpenProfile: () {},
              profileHeader: ValueListenableBuilder(
                valueListenable: loaded,
                builder: (context, value, child) => value
                    ? const SizedBox(
                        height: 200,
                        child: Text('Loaded identity'),
                      )
                    : const SizedBox.shrink(),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final action = find.byKey(const Key('r6-new-check-in-button'));
        final original = tester.getRect(action);
        loaded.value = true;
        await tester.pumpAndSettle();
        expect(tester.getRect(action), original);
        expect(action.hitTestable(), findsOneWidget);
        await tester.tap(action);
        expect(checkIns, 1);
        loaded.value = false;
        await tester.pumpAndSettle();
        expect(tester.getRect(action), original);
        expect(find.text('Loaded identity'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
