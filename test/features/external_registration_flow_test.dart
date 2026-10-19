import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_participation/domain/external_registration_flow.dart';
import 'package:flutter_test/flutter_test.dart';

final class _Opener implements ExternalActivityOpener {
  int calls = 0;
  bool opened = true;
  Completer<bool>? held;
  @override
  Future<bool> open(Uri sourceUrl, {required bool Function() current}) async {
    if (!current()) return false;
    calls++;
    return held?.future ?? opened;
  }
}

void main() {
  late _Opener opener;
  late ExternalRegistrationFlow flow;
  var current = true, writes = 0, reads = 0;
  Result<void> outcome = const Success(null);
  Result<bool> readOutcome = const Success(true);
  Completer<Result<void>>? pendingWrite;
  setUp(() {
    opener = _Opener();
    current = true;
    writes = 0;
    reads = 0;
    outcome = const Success(null);
    readOutcome = const Success(true);
    pendingWrite = null;
    flow = ExternalRegistrationFlow(
      eventId: 'stable-event-id',
      sourceUrl: Uri.https('www.ticketmaster.sg', '/event/test'),
      opener: opener,
      current: () => current,
      confirmGoing: (id) async {
        expect(id, 'stable-event-id');
        writes++;
        return pendingWrite?.future ?? outcome;
      },
      readGoing: (id) async {
        expect(id, 'stable-event-id');
        reads++;
        return readOutcome;
      },
    );
  });
  tearDown(() => flow.dispose());

  Future<void> returned() async {
    await flow.open();
    flow.background();
    flow.resume();
    expect(flow.phase, RegistrationPhase.confirmation);
  }

  test(
    'opening/ordinary resume never marks Going or assumes a return',
    () async {
      await flow.open();
      flow.resume();
      await flow.answer(true);
      expect(flow.phase, RegistrationPhase.outside);
      expect(writes, 0);
    },
  );
  test('return No changes no participation', () async {
    await returned();
    await flow.answer(false);
    expect(flow.phase, RegistrationPhase.idle);
    expect(writes, 0);
  });
  test(
    'return Yes writes stable ID once, not again on repeated resume',
    () async {
      await returned();
      await flow.answer(true);
      flow.resume();
      await flow.answer(true);
      expect(flow.phase, RegistrationPhase.saved);
      expect(writes, 1);
    },
  );
  test('failed open never permits return confirmation', () async {
    opener.opened = false;
    await flow.open();
    flow.background();
    flow.resume();
    await flow.answer(true);
    expect(flow.phase, RegistrationPhase.failed);
    expect(writes, 0);
  });
  test('duplicate taps fence the native opening synchronously', () async {
    opener.held = Completer();
    final first = flow.open();
    await flow.open();
    expect(opener.calls, 1);
    opener.held!.complete(true);
    await first;
  });
  test(
    'browser returns before native Future settles still asks once',
    () async {
      opener.held = Completer();
      final first = flow.open();
      flow.background();
      flow.resume();
      expect(flow.phase, RegistrationPhase.opening);
      opener.held!.complete(true);
      await first;
      expect(flow.phase, RegistrationPhase.confirmation);
      expect(writes, 0);
    },
  );
  test(
    'same UID replacement guard prevents late native handoff completion',
    () async {
      opener.held = Completer();
      final first = flow.open();
      current = false;
      opener.held!.complete(true);
      await first;
      flow.background();
      flow.resume();
      await flow.answer(true);
      expect(writes, 0);
    },
  );
  test(
    'duplicate Yes and background cycles cannot duplicate a pending write',
    () async {
      await returned();
      pendingWrite = Completer();
      final first = flow.answer(true);
      flow.background();
      flow.resume();
      await flow.answer(true);
      expect(writes, 1);
      pendingWrite!.complete(const Success(null));
      await first;
      expect(flow.phase, RegistrationPhase.saved);
    },
  );
  test('unknown write is read before another explicit attempt', () async {
    outcome = const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Unavailable',
      ),
    );
    await returned();
    await flow.answer(true);
    expect(flow.phase, RegistrationPhase.unresolved);
    await flow.open();
    await flow.answer(true);
    expect(writes, 1);
    await flow.reconcile();
    expect(reads, 1);
    expect(flow.phase, RegistrationPhase.saved);
  });
  test(
    'failed reconcile remains blocked; explicit read of not Going unlocks',
    () async {
      outcome = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Unavailable',
        ),
      );
      await returned();
      await flow.answer(true);
      readOutcome = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Unavailable',
        ),
      );
      await flow.reconcile();
      expect(flow.phase, RegistrationPhase.unresolved);
      readOutcome = const Success(false);
      await flow.reconcile();
      expect(flow.phase, RegistrationPhase.idle);
      expect(writes, 1);
    },
  );
  test(
    'dispose during write drops completion without rollback or replay',
    () async {
      await returned();
      pendingWrite = Completer();
      final first = flow.answer(true);
      flow.dispose();
      pendingWrite!.complete(const Success(null));
      await first;
      expect(flow.phase, RegistrationPhase.idle);
      expect(writes, 1);
    },
  );
}
