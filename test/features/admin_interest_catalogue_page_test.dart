import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
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
    bool settle = true,
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
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      await tester.pump();
    }
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

  testWidgets('Back during an initial read leaves without a create warning', (
    tester,
  ) async {
    final pending = Completer<Result<List<InterestTagOption>>>();
    final repo = FakeAdminInterestRepository()..catalogues.add(pending.future);
    var back = 0;
    await page(tester, repository: repo, onBack: () => back++, settle: false);
    await tester.tap(find.byType(BackButton));
    await tester.pump();
    expect(find.text('Leave interest catalogue?'), findsNothing);
    expect(back, 1);
    expect(repo.createdNames, isEmpty);
    pending.complete(const Success([adminArt]));
    await tester.pumpAndSettle();
  });

  testWidgets('Back during a reload warns only about an existing draft', (
    tester,
  ) async {
    final h = await page(tester);
    await tester.enterText(
      find.byKey(const Key('admin-interest-name')),
      'Photography',
    );
    await tester.pump();
    final pending = Completer<Result<List<InterestTagOption>>>();
    h.repository.catalogues.add(pending.future);
    await tester.tap(find.byKey(const Key('admin-interest-reload')));
    await tester.pump();
    await tester.tap(find.byType(BackButton));
    await tester.pump();
    expect(
      find.text('Your unsaved interest name will be discarded.'),
      findsOneWidget,
    );
    expect(find.textContaining('will not undo a request'), findsNothing);
    await tester.tap(find.text('Keep editing'));
    await tester.pump();
    pending.complete(const Success([adminArt]));
    await tester.pumpAndSettle();
    expect(h.repository.createdNames, isEmpty);
  });

  testWidgets('Back during a dispatched create retains the outcome warning', (
    tester,
  ) async {
    final h = await page(tester);
    await tester.enterText(
      find.byKey(const Key('admin-interest-name')),
      'Photography',
    );
    await tester.pump();
    final pending = Completer<Result<CreatedInterestTag>>();
    h.repository.creates.add(pending.future);
    await tester.tap(find.byKey(const Key('admin-interest-create')));
    await tester.pump();
    await tester.tap(find.byType(BackButton));
    await tester.pump();
    expect(
      find.textContaining('will not undo a request already sent'),
      findsOneWidget,
    );
    await tester.tap(find.text('Keep editing'));
    await tester.pump();
    pending.complete(const Failure(adminUnavailable));
    await tester.pumpAndSettle();
    expect(h.state.needsReadback, isTrue);
    expect(h.state.draft, 'Photography');
    expect(h.repository.createdNames, ['Photography']);
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

  testWidgets(
    'management filters and lifecycle confirmation use current readback without exposing deletion',
    (tester) async {
      final repo = FakeManagedAdminInterestRepository();
      final h = await page(tester, repository: repo);
      await reveal(tester, find.byKey(const Key('admin-filter-inactive')));
      await tester.tap(find.byKey(const Key('admin-filter-inactive')));
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byKey(const Key('admin-interest-tag-tag-music')),
      );
      expect(find.byKey(const Key('admin-interest-tag-tag-art')), findsNothing);
      await tester.tap(find.byKey(const Key('admin-interest-tag-tag-music')));
      await tester.pumpAndSettle();
      final restore = find.byKey(const Key('admin-lifecycle-tag-music'));
      await reveal(tester, restore);
      expect(find.byKey(const Key('admin-delete-tag-music')), findsNothing);
      await tester.tap(restore);
      await tester.pumpAndSettle();
      expect(find.text('Restore Music?'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(repo.changes, isEmpty);
      await tester.tap(restore);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Restore'));
      await tester.pumpAndSettle();
      expect(repo.changes, hasLength(1));
      expect(repo.changes.single.revision, 4);
      expect(
        h.state.managedTags.last.lifecycleState,
        InterestLifecycleState.active,
      );
      expect(
        find.byKey(const Key('admin-interest-tag-tag-music')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'rename reveals its preserved draft, saves and reads back on a narrow large-text screen',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(360, 740);
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final repo = FakeManagedAdminInterestRepository();
      final h = await page(tester, repository: repo);
      final row = find.byKey(const Key('admin-interest-tag-tag-art'));
      await reveal(tester, row);
      await tester.tap(row);
      await tester.pumpAndSettle();
      final rename = find.byKey(const Key('admin-rename-tag-art'));
      await reveal(tester, rename);
      await tester.tap(rename);
      await tester.pumpAndSettle();
      final name = find.byKey(const Key('admin-interest-rename-name-tag-art'));
      await reveal(tester, name, delta: -180);
      await tester.enterText(name, 'Drawing');
      await tester.pump();
      final save = find.byKey(const Key('admin-interest-rename-save'));
      await reveal(tester, save);
      await tester.tap(save);
      await tester.pumpAndSettle();
      expect(repo.changes.single.name, 'Drawing');
      expect(h.state.managedTags.first.displayName, 'Drawing');
      expect(h.state.editTarget, isNull);
      expect(h.state.notice, contains('confirmed'));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'revoked capability hides the rename snapshot while retaining its draft',
    (tester) async {
      final repo = FakeManagedAdminInterestRepository();
      final h = await page(tester, repository: repo);
      final row = find.byKey(const Key('admin-interest-tag-tag-art'));
      await reveal(tester, row);
      await tester.tap(row);
      await tester.pumpAndSettle();
      final rename = find.byKey(const Key('admin-rename-tag-art'));
      await reveal(tester, rename);
      await tester.tap(rename);
      await tester.pumpAndSettle();
      final name = find.byKey(const Key('admin-interest-rename-name-tag-art'));
      await reveal(tester, name, delta: -180);
      await tester.enterText(name, 'Private rename draft');
      await tester.pump();
      await reveal(tester, find.text('ID: tag-art · Revision 1'), delta: -180);
      expect(find.text('ID: tag-art · Revision 1'), findsOneWidget);
      h.container.read(adminInterestCapabilityProvider.notifier).revoke();
      await tester.pumpAndSettle();
      expect(find.textContaining('tag-art'), findsNothing);
      expect(name, findsNothing);
      expect(find.byKey(const Key('admin-interest-rename-save')), findsNothing);
      expect(h.state.renameDraft, 'Private rename draft');
      expect(h.state.managedTags, isEmpty);
      expect(repo.changes, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same-UID session replacement removes a pending lifecycle dialog without writing',
    (tester) async {
      final repo = FakeManagedAdminInterestRepository();
      final h = await page(tester, repository: repo);
      final row = find.byKey(const Key('admin-interest-tag-tag-art'));
      await reveal(tester, row);
      await tester.tap(row);
      await tester.pumpAndSettle();
      final deactivate = find.byKey(const Key('admin-lifecycle-tag-art'));
      await reveal(tester, deactivate);
      await tester.tap(deactivate);
      await tester.pumpAndSettle();
      expect(find.text('Deactivate Art?'), findsOneWidget);
      await h.replaceSession();
      await tester.pumpAndSettle();
      expect(find.text('Deactivate Art?'), findsNothing);
      expect(repo.changes, isEmpty);
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
