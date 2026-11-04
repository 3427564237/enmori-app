import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/presentation/admin_interest_catalogue_page.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'admin_interest_test_support.dart';

void main() {
  Future<AdminHarness> page(
    WidgetTester tester, {
    FakeAdminInterestRepository? repository,
    VoidCallback? onBack,
  }) async {
    final h = await AdminHarness.start(repository: repository);
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      await h.close();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: h.container,
        child: MaterialApp(
          home: AdminInterestCataloguePage(onBack: onBack ?? () {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return h;
  }

  testWidgets(
    'create shows independently confirmed stable ID and clears form',
    (tester) async {
      final h = await page(tester);
      await tester.enterText(
        find.byKey(const Key('admin-interest-name')),
        'Photography',
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('admin-interest-create')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('admin-interest-confirmed')), findsOneWidget);
      expect(find.text('Photography\nID: tag-new'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-interest-name')))
            .controller!
            .text,
        isEmpty,
      );
      expect(h.repository.createdNames, ['Photography']);
      expect(h.repository.catalogueReads, 2);
      await reveal(tester, find.byKey(const Key('admin-interest-tag-tag-new')));
      expect(
        find.byKey(const Key('admin-interest-tag-tag-new')),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'empty name has inline correction and focuses input without writing',
    (tester) async {
      final h = await page(tester);
      await tester.tap(find.byKey(const Key('admin-interest-create')));
      await tester.pumpAndSettle();
      expect(find.text('Enter an interest name.'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-interest-name')))
            .focusNode!
            .hasFocus,
        isTrue,
      );
      expect(h.repository.createdNames, isEmpty);
    },
  );

  testWidgets('exact duplicate-name feedback keeps draft', (tester) async {
    final repo = FakeAdminInterestRepository();
    repo.creates.add(
      Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.catalogueNameConflict,
            message: 'conflict',
          ),
        ),
      ),
    );
    await page(tester, repository: repo);
    await tester.enterText(
      find.byKey(const Key('admin-interest-name')),
      'Photography',
    );
    await tester.pump();
    await tester.tap(find.byKey(const Key('admin-interest-create')));
    await tester.pumpAndSettle();
    expect(find.textContaining('already exists'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('admin-interest-name')))
          .controller!
          .text,
      'Photography',
    );
  });

  testWidgets('unknown result offers read, never a second automatic create', (
    tester,
  ) async {
    final repo = FakeAdminInterestRepository();
    repo.creates.add(Future.value(const Failure(adminUnavailable)));
    await page(tester, repository: repo);
    await tester.enterText(
      find.byKey(const Key('admin-interest-name')),
      'Photography',
    );
    await tester.pump();
    await tester.tap(find.byKey(const Key('admin-interest-create')));
    await tester.pumpAndSettle();
    expect(find.textContaining('result is unknown'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('admin-interest-create')))
          .onPressed,
      isNull,
    );
    await tester.tap(find.byKey(const Key('admin-interest-reload')));
    await tester.pumpAndSettle();
    expect(repo.createdNames, hasLength(1));
    expect(find.byKey(const Key('admin-interest-confirmed')), findsNothing);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('admin-interest-name')))
          .controller!
          .text,
      'Photography',
    );
  });

  testWidgets(
    'dirty Back Keep editing retains draft then explicit Leave navigates',
    (tester) async {
      var back = 0;
      await page(tester, onBack: () => back++);
      await tester.enterText(
        find.byKey(const Key('admin-interest-name')),
        'Photography',
      );
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('Leave interest catalogue?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(back, 0);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-interest-name')))
            .controller!
            .text,
        'Photography',
      );
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Leave'));
      await tester.pumpAndSettle();
      expect(back, 1);
    },
  );

  testWidgets(
    'same-UID replacement clears raw draft and only removes its old exit dialog',
    (tester) async {
      final h = await page(tester);
      await tester.enterText(
        find.byKey(const Key('admin-interest-name')),
        'Private draft',
      );
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('Leave interest catalogue?'), findsOneWidget);
      await h.replaceSession();
      await tester.pumpAndSettle();
      expect(find.text('Leave interest catalogue?'), findsNothing);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('admin-interest-name')))
            .controller!
            .text,
        isEmpty,
      );
      expect(h.repository.createdNames, isEmpty);
    },
  );

  testWidgets('ordinary account sees denied state with no create command', (
    tester,
  ) async {
    final h = await page(
      tester,
      repository: FakeAdminInterestRepository()..allowed = false,
    );
    expect(find.byKey(const Key('admin-interest-denied')), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('admin-interest-create')))
          .onPressed,
      isNull,
    );
    expect(h.repository.catalogueReads, 0);
  });

  testWidgets('landscape keyboard leaves name and commands scroll reachable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(740, 400);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding(bottom: 200);
    addTearDown(tester.view.reset);
    await page(tester);
    await reveal(tester, find.byKey(const Key('admin-interest-name')));
    await tester.enterText(
      find.byKey(const Key('admin-interest-name')),
      'Photography',
    );
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('admin-interest-create')));
    expect(
      find.byKey(const Key('admin-interest-create')).hitTestable(),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'catalogue search and name order use loaded tags without writes',
    (tester) async {
      final repo = FakeAdminInterestRepository()
        ..tags = const [
          InterestTagOption(interestTagId: 'z-id', displayName: 'Yoga'),
          InterestTagOption(interestTagId: 'a-id', displayName: 'Art'),
        ];
      await page(tester, repository: repo);
      final search = find.byKey(const Key('admin-catalogue-search'));
      await reveal(tester, search);
      await tester.enterText(search, 'A-ID');
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('admin-interest-tag-a-id')));
      expect(find.byKey(const Key('admin-interest-tag-z-id')), findsNothing);
      expect(find.text('1 of 2 interests'), findsOneWidget);
      await reveal(tester, search, delta: -180);
      await tester.enterText(search, 'missing');
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('admin-search-empty')));
      expect(find.byKey(const Key('admin-search-empty')), findsOneWidget);
      await reveal(tester, search, delta: -180);
      await tester.enterText(search, '');
      await tester.pumpAndSettle();
      final order = find.byKey(const Key('admin-catalogue-sort'));
      await reveal(tester, order);
      await tester.tap(order);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Name A–Z').last);
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('admin-interest-tag-z-id')));
      final rows = tester
          .widgetList<ExpansionTile>(find.byType(ExpansionTile))
          .toList();
      expect(rows.map((r) => r.key), [
        const Key('admin-interest-tag-a-id'),
        const Key('admin-interest-tag-z-id'),
      ]);
      expect(repo.createdNames, isEmpty);
      expect(repo.catalogueReads, 1);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<void> reveal(
  WidgetTester tester,
  Finder finder, {
  double delta = 180,
}) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      delta,
      maxScrolls: 40,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.pumpAndSettle();
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}
