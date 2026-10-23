import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_mutations.dart';
import 'package:enmori/features/check_in/presentation/check_in_edit_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository implements CheckInRepository, CheckInMutations {
  CheckIn? current = CheckIn(
    checkInId: 'one',
    note: 'Original',
    createdAt: DateTime.utc(2026, 10, 19),
    checkInVisibility: CheckInVisibility.private,
  );
  int updates = 0, deletes = 0;
  Completer<Result<CheckIn>>? delayed;
  bool conflict = false;
  @override
  Future<Result<CheckIn>> update({
    bool Function()? isEligible,
    String? locationLabel,
    required String checkInId,
    String? mood,
    String? activity,
    required String note,
    required CheckInVisibility visibility,
    required int expectedRevision,
  }) async {
    updates++;
    if (delayed != null) return delayed!.future;
    if (conflict) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.checkInRevisionPreconditionFailed,
          message: 'Conflict',
        ),
      );
    }
    current = CheckIn(
      checkInId: checkInId,
      note: note,
      mood: mood,
      activity: activity,
      locationLabel: locationLabel,
      createdAt: current!.createdAt,
      checkInVisibility: visibility,
      revision: expectedRevision + 1,
    );
    return Success(current!);
  }

  @override
  Future<Result<void>> remove({
    bool Function()? isEligible,
    required String checkInId,
    required int expectedRevision,
  }) async {
    deletes++;
    current = null;
    return const Success(null);
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async =>
      Success(current!);
  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) => throw UnimplementedError();
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) => throw UnimplementedError();
}

Future<void> _mount(WidgetTester tester, _Repository repository) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        checkInRepositoryProvider.overrideWithValue(repository),
        authSessionProvider.overrideWith(
          (ref) =>
              Stream.value(const AuthSessionAuthenticated(subject: 'owner')),
        ),
      ],
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push<CheckInEditResult>(
                MaterialPageRoute(
                  builder: (_) => CheckInEditPage(checkIn: repository.current!),
                ),
              ),
              child: const Text('Open record'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('Open record'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('custom Mood Activity and place labels survive save and reopen', (
    tester,
  ) async {
    final repo = _Repository();
    final originalDate = repo.current!.createdAt;
    await _mount(tester, repo);
    for (final item in [
      ('Mood', 'Proud'),
      ('Activity', 'Sketching'),
      ('Location', 'Library'),
    ]) {
      final chip = find.widgetWithText(ActionChip, item.$1);
      await tester.ensureVisible(chip);
      await tester.tap(chip);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), item.$2);
      await tester.ensureVisible(find.text('Apply'));
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(ActionChip, item.$2), findsOneWidget);
    }
    await tester.enterText(find.byKey(const Key('check-in-edit-note')), '');
    await tester.ensureVisible(find.byKey(const Key('check-in-edit-save')));
    await tester.tap(find.byKey(const Key('check-in-edit-save')));
    await tester.pumpAndSettle();
    expect(repo.current!.note, '');
    expect(repo.current!.mood, 'Proud');
    expect(repo.current!.activity, 'Sketching');
    expect(repo.current!.locationLabel, 'Library');
    expect(repo.current!.location, isNull);
    expect(repo.current!.createdAt, originalDate);
    await tester.tap(find.text('Open record'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(ActionChip, 'Sketching'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'Proud'), findsOneWidget);
  });

  testWidgets(
    'save prevents duplicate dispatch and returns to record after success',
    (tester) async {
      final repo = _Repository()..delayed = Completer<Result<CheckIn>>();
      await _mount(tester, repo);
      await tester.enterText(
        find.byKey(const Key('check-in-edit-note')),
        'Revised',
      );
      await tester.ensureVisible(find.byKey(const Key('check-in-edit-save')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('check-in-edit-save')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('check-in-edit-save')));
      expect(repo.updates, 1);
      repo.delayed!.complete(
        Success(
          CheckIn(
            checkInId: 'one',
            note: 'Revised',
            createdAt: DateTime.utc(2026, 10, 19),
            revision: 2,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Open record'), findsOneWidget);
      expect(find.byType(CheckInEditPage), findsNothing);
    },
  );
  testWidgets(
    'conflict keeps draft; explicit reload discards draft; delete requires confirmation',
    (tester) async {
      final repo = _Repository()..conflict = true;
      await _mount(tester, repo);
      await tester.enterText(
        find.byKey(const Key('check-in-edit-note')),
        'Unsaved',
      );
      await tester.ensureVisible(find.byKey(const Key('check-in-edit-save')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('check-in-edit-save')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Your draft is still here'), findsOneWidget);
      expect(find.text('Unsaved'), findsOneWidget);
      await tester.ensureVisible(find.text('Reload saved record'));
      await tester.tap(find.text('Reload saved record'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(find.text('Unsaved'), findsOneWidget);
      await tester.tap(find.text('Reload saved record'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(find.text('Original'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('check-in-edit-delete')));
      await tester.tap(find.byKey(const Key('check-in-edit-delete')));
      await tester.pumpAndSettle();
      expect(repo.deletes, 0);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(repo.deletes, 0);
      await tester.tap(find.byKey(const Key('check-in-edit-delete')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(repo.deletes, 1);
      expect(repo.current, isNull);
      expect(find.byType(CheckInEditPage), findsNothing);
    },
  );
}
