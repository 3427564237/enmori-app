import 'dart:async';

import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  group('normalizeCheckInNote', () {
    test('trims only the outer Unicode whitespace', () {
      final result = normalizeCheckInNote('\u2003first\nsecond\u2003');

      expect((result as Success<String>).value, 'first\nsecond');
    });

    test('counts extended grapheme clusters rather than code units', () {
      final familyEmoji = '👨‍👩‍👧‍👦';

      expect(normalizeCheckInNote(familyEmoji), isA<Success<String>>());
      expect(
        normalizeCheckInNote(List.filled(500, familyEmoji).join()),
        isA<Success<String>>(),
      );
      expect(
        normalizeCheckInNote(List.filled(501, familyEmoji).join()),
        isA<Failure<String>>(),
      );
    });

    test('rejects empty and whitespace-only notes', () {
      expect(normalizeCheckInNote(''), isA<Failure<String>>());
      expect(normalizeCheckInNote(' \n\t'), isA<Failure<String>>());
    });
  });

  test('controller sends the normalized Note to the Repository', () async {
    final repository = FakeCheckInRepository();
    final container = ProviderContainer(
      overrides: [checkInRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);

    await container
        .read(checkInControllerProvider.notifier)
        .create(note: '  A controlled test note.\n');

    expect(repository.createdNotes, ['A controlled test note.']);
    expect(container.read(checkInControllerProvider), isA<CommandSucceeded>());
  });

  for (final create in [false, true]) {
    test(
      'discard pending ${create ? "create" : "read"} after disposal',
      () async {
        final repository = _PendingCheckInRepository();
        final container = ProviderContainer(
          overrides: [checkInRepositoryProvider.overrideWithValue(repository)],
        );
        final controller = container.read(checkInControllerProvider.notifier);
        final operation = create
            ? controller.create(note: 'Synthetic note')
            : controller.readPersisted(checkInId: 'synthetic');
        container.dispose();
        repository.pending.complete(
          Success(
            CheckIn(
              checkInId: 'synthetic',
              note: 'Synthetic note',
              createdAt: DateTime.utc(2026),
            ),
          ),
        );
        await expectLater(operation, completes);
      },
    );
  }
}

final class _PendingCheckInRepository implements CheckInRepository {
  final pending = Completer<Result<CheckIn>>();
  @override
  Future<Result<CheckIn>> create({
    required String note,
    required String idempotencyKey,
  }) => pending.future;
  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) =>
      pending.future;
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Success(CheckInHistoryPage(checkIns: [], nextCursor: null));
}
