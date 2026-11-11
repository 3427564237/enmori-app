import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/cloud_ai_consent.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/proactive/proactive_providers.dart';
import 'package:flutter_test/flutter_test.dart';

import 'proactive_test_support.dart';

void main() {
  for (final consent in [
    null,
    CloudAiConsent.accepted,
    CloudAiConsent.openaiDeclined,
  ]) {
    testWidgets(
      'OpenAI requires its own current grant for on and create: $consent',
      (tester) async {
        final r = await ProactiveRig.create(
          tester,
          processing: AiClientProcessing.openaiCloud,
          cloudConsent: consent,
        );
        await r.controller.load();
        await r.controller.changeMode(
          ProactiveMode.on,
          confirmedZone: fixtureTime.timeZone,
        );
        expect(r.repo.saved, isEmpty);
        await r.ready(tester);
        expect(await r.controller.schedule(fixtureSource, fixtureTime), isNull);
        expect(r.repo.creates, isEmpty);
        expect(r.ids.calls, 0);
        // Protective operations retain their original optional-purpose boundary.
        await r.controller.changeMode(ProactiveMode.paused);
        await tester.pump();
        expect(r.repo.saved.single.settings.mode, ProactiveMode.paused);
        await r.controller.changeMode(ProactiveMode.on);
        expect(r.repo.saved, hasLength(1));
        await r.controller.changeMode(ProactiveMode.off);
        await tester.pump();
        expect(r.repo.saved.last.settings.mode, ProactiveMode.off);
        r.repo.active = [fixtureReceipt()];
        await r.controller.readActive();
        await r.controller.cancel(fixtureReceipt());
        await tester.pump();
        expect(r.repo.cancels, hasLength(1));
        r.dispose();
      },
    );
  }
  testWidgets(
    'OpenAI grant withdrawal during token acquisition admits no request',
    (tester) async {
      final r = await ProactiveRig.create(
        tester,
        processing: AiClientProcessing.openaiCloud,
        cloudConsent: CloudAiConsent.openaiAccepted,
      );
      await r.ready(tester);
      final token = Completer<Result<String>>();
      r.auth.nextToken = token.future;
      final pending = r.controller.schedule(fixtureSource, fixtureTime);
      await tester.pump();
      r.consent(
        OptionalProcessingConsent.accepted,
        revision: 2,
        cloudConsent: CloudAiConsent.openaiDeclined,
      );
      await tester.pump();
      token.complete(const Success('late-token'));
      await pending;
      expect(r.repo.creates, isEmpty);
      expect(r.state.pendingIntent, isNull);
      expect(r.state.sourceUnavailable, isTrue);
      r.dispose();
    },
  );
  testWidgets(
    'OpenAI withdrawal preserves admitted unknown original key for readback and cancel',
    (tester) async {
      final r = await ProactiveRig.create(
        tester,
        processing: AiClientProcessing.openaiCloud,
        cloudConsent: CloudAiConsent.openaiAccepted,
      );
      await r.ready(tester);
      final ack = Completer<Result<FollowUpIntent>>();
      r.repo.nextCreate = ack.future;
      final pending = r.controller.schedule(fixtureSource, fixtureTime);
      await tester.pump();
      expect(r.repo.creates, hasLength(1));
      r.consent(
        OptionalProcessingConsent.accepted,
        revision: 2,
        cloudConsent: CloudAiConsent.openaiDeclined,
      );
      await tester.pump();
      await pending;
      expect(r.state.pendingIntent?.intentId, fixtureIntent);
      ack.complete(Success(fixtureReceipt()));
      await tester.pump();
      expect(r.state.lastIntent, isNull);
      r.repo.active = [fixtureReceipt()];
      final original = await r.controller.checkPendingIntent();
      expect(original?.intentId, fixtureIntent);
      await tester.pump();
      await r.controller.cancel(original!);
      await tester.pump();
      expect(r.repo.cancels, hasLength(1));
      r.consent(
        OptionalProcessingConsent.accepted,
        revision: 3,
        cloudConsent: CloudAiConsent.openaiAccepted,
      );
      await tester.pump();
      expect(r.repo.creates, hasLength(1));
      expect(r.state.sourceUnavailable, isTrue);
      r.dispose();
    },
  );
  testWidgets(
    'read-only entry is default off; settings ACK never creates an intent',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.controller.load();
      expect(r.state.settings!.mode, ProactiveMode.off);
      expect(r.state.settings!.timeZone, isEmpty);
      expect(r.repo.saved, isEmpty);
      expect(r.repo.creates, isEmpty);
      expect(await r.controller.schedule(fixtureSource, fixtureTime), isNull);
      expect(r.ids.calls, 0);
      await r.controller.changeMode(
        ProactiveMode.on,
        confirmedZone: fixtureTime.timeZone,
      );
      await tester.pump();
      expect(r.repo.saved.single.revision, 0);
      expect(r.repo.saved.single.settings.pushEnabled, isFalse);
      expect(r.repo.saved.single.settings.categories, ['explicit_follow_up']);
      expect(r.repo.creates, isEmpty);
      expect(r.state.canSchedule, isTrue);
      await r.controller.schedule(fixtureSource, fixtureTime);
      await tester.pump();
      expect(r.repo.creates.single.expectedSettingsRevision, 1);
      expect(r.repo.creates.single.sourceMessageId, fixtureMessage);
      expect(r.state.pendingIntent, isNull);
      r.dispose();
    },
  );

  testWidgets(
    'unknown settings requires GET before another mutation or create',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.controller.load();
      r.controller.keepSourceReview(fixtureSource, fixtureTime);
      r.repo.nextSave = Future.value(const Failure(unknownResult));
      await r.controller.changeMode(
        ProactiveMode.on,
        confirmedZone: fixtureTime.timeZone,
      );
      expect(r.state.settingsUnconfirmed, isTrue);
      expect(r.state.settings!.mode, ProactiveMode.off);
      expect(r.controller.reviewForSource(fixtureSource), same(fixtureTime));
      await r.controller.changeMode(
        ProactiveMode.on,
        confirmedZone: fixtureTime.timeZone,
      );
      await r.controller.schedule(fixtureSource, fixtureTime);
      expect(r.repo.saved, hasLength(1));
      expect(r.repo.creates, isEmpty);
      r.repo.settings = fixtureSettings(mode: ProactiveMode.on, revision: 1);
      await r.controller.readSettings();
      expect(r.state.settingsUnconfirmed, isFalse);
      await r.controller.schedule(fixtureSource, fixtureTime);
      await tester.pump();
      expect(r.repo.creates, hasLength(1));
      r.dispose();
    },
  );

  testWidgets(
    'unknown create retains exact ID; only original GET reconciles it',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      r.repo.nextCreate = Future.value(const Failure(unknownResult));
      expect(await r.controller.schedule(fixtureSource, fixtureTime), isNull);
      expect(r.state.pendingIntent!.intentId, fixtureIntent);
      expect(r.state.pendingIntent!.command!.sourceMessageId, fixtureMessage);
      await r.controller.schedule(fixtureSource, fixtureTime);
      expect(r.repo.creates, hasLength(1));
      expect(r.ids.calls, 1);
      r.repo.nextReadIntent = Future.value(const Failure(unavailableResult));
      await r.controller.checkPendingIntent();
      expect(r.state.pendingIntent!.intentId, fixtureIntent);
      r.repo.nextReadIntent = Future.value(Success(fixtureReceipt()));
      await r.controller.checkPendingIntent();
      await tester.pump();
      expect(r.repo.reads, [fixtureIntent, fixtureIntent]);
      expect(r.repo.creates, hasLength(1));
      expect(r.state.pendingIntent, isNull);
      expect(r.state.lastIntent!.state, FollowUpIntentState.queued);
      r.dispose();
    },
  );

  testWidgets('cancel unknown preserves row and cannot issue another delete', (
    tester,
  ) async {
    final r = await ProactiveRig.create(tester);
    r.repo.active = [fixtureReceipt(revision: 4)];
    await r.ready(tester);
    r.repo.nextCancel = Future.value(const Failure(unknownResult));
    await r.controller.cancel(r.state.intents!.single);
    expect(r.repo.cancels.single.revision, 4);
    expect(r.state.intents!.single.state, FollowUpIntentState.queued);
    await r.controller.cancel(r.state.intents!.single);
    expect(r.repo.cancels, hasLength(1));
    r.repo.active = [];
    r.repo.nextReadIntent = Future.value(
      Success(
        fixtureReceipt(state: FollowUpIntentState.cancelled, revision: 5),
      ),
    );
    await r.controller.checkPendingIntent();
    await tester.pump();
    expect(r.state.lastIntent!.state, FollowUpIntentState.cancelled);
    expect(r.state.intents, isEmpty);
    r.dispose();
  });

  testWidgets(
    'failed complete list remains unknown and cannot release the active cap',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      r.repo.nextActive = Future.value(const Failure(unavailableResult));
      await r.ready(tester);
      expect(r.state.intents, isNull);
      expect(r.state.canSchedule, isFalse);
      await r.controller.schedule(fixtureSource, fixtureTime);
      expect(r.repo.creates, isEmpty);
      r.repo.nextActive = null;
      r.repo.active = List.generate(
        3,
        (i) => fixtureReceipt(intentId: 'id-$i'),
      );
      await r.controller.readActive();
      expect(r.state.canSchedule, isFalse);
      r.repo.nextActive = Future.value(const Failure(unavailableResult));
      await r.controller.readActive();
      expect(r.state.intents, hasLength(3));
      expect(r.state.canSchedule, isFalse);
      r.dispose();
    },
  );

  testWidgets('revision 412 is a definite rejection requiring fresh settings', (
    tester,
  ) async {
    final r = await ProactiveRig.create(tester);
    await r.ready(tester);
    r.repo.nextCreate = Future.value(
      const Failure(
        AppFailure(
          kind: AppFailureKind.proactiveRevisionPreconditionFailed,
          message: 'unsafe',
        ),
      ),
    );
    await r.controller.schedule(fixtureSource, fixtureTime);
    expect(r.state.pendingIntent, isNull);
    expect(r.state.settingsStale, isTrue);
    await r.controller.schedule(fixtureSource, fixtureTime);
    expect(r.repo.creates, hasLength(1));
    await r.controller.readSettings();
    expect(r.state.settingsStale, isFalse);
    r.dispose();
  });

  testWidgets(
    'background aborts admitted create and ignores late ACK without replay',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      final response = Completer<Result<FollowUpIntent>>();
      r.repo.nextCreate = response.future;
      final pending = r.controller.schedule(fixtureSource, fixtureTime);
      await tester.pump();
      final signal = r.repo.signals.last;
      expect(r.repo.creates, hasLength(1));
      expect(r.state.pendingIntent, isNotNull);
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      await pending;
      expect(signal.isAborted, isTrue);
      expect(r.state.sourceUnavailable, isTrue);
      expect(r.state.intents, isNull);
      expect(r.state.lastIntent, isNull);
      response.complete(Success(fixtureReceipt()));
      await tester.pump();
      expect(r.state.lastIntent, isNull);
      r.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      expect(r.state.pendingIntent!.intentId, fixtureIntent);
      expect(r.repo.creates, hasLength(1));
      r.dispose();
    },
  );

  testWidgets('consent revoked before token admission creates no command', (
    tester,
  ) async {
    final r = await ProactiveRig.create(tester);
    await r.ready(tester);
    final token = Completer<Result<String>>();
    r.auth.nextToken = token.future;
    final pending = r.controller.schedule(fixtureSource, fixtureTime);
    await tester.pump();
    r.consent(OptionalProcessingConsent.rejected, revision: 2);
    await tester.pump();
    token.complete(const Success('late-token'));
    await pending;
    expect(r.repo.creates, isEmpty);
    expect(r.state.pendingIntent, isNull);
    expect(r.state.sourceUnavailable, isTrue);
    r.dispose();
  });

  testWidgets(
    'same UID replacement clears settings pending key and form review',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      r.controller.keepSourceReview(fixtureSource, fixtureTime);
      r.repo.nextCreate = Future.value(const Failure(unknownResult));
      await r.controller.schedule(fixtureSource, fixtureTime);
      final oldSession = r.state.sessionKey;
      r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
      await tester.pump();
      expect(r.state.sessionKey, isNot(same(oldSession)));
      expect(r.state.settings, isNull);
      expect(r.state.intents, isNull);
      expect(r.state.pendingIntent, isNull);
      expect(r.state.lastIntent, isNull);
      expect(r.controller.reviewForSource(fixtureSource), isNull);
      expect(r.repo.creates, hasLength(1));
      r.dispose();
    },
  );

  testWidgets(
    'unavailable source retires form while auth failure clears private state',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      r.repo.nextCreate = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'private',
          ),
        ),
      );
      await r.controller.schedule(fixtureSource, fixtureTime);
      expect(r.state.sourceUnavailable, isTrue);
      expect(r.state.pendingIntent, isNull);
      r.repo.nextReadSettings = Future.value(
        const Failure(
          AppFailure(kind: AppFailureKind.authForbidden, message: 'private'),
        ),
      );
      await r.controller.readSettings();
      expect(r.state.authenticated, isFalse);
      expect(r.state.settings, isNull);
      expect(r.state.intents, isNull);
      r.dispose();
    },
  );

  testWidgets(
    'off and pause preserve approved limits and never restore old work',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      await r.controller.changeMode(ProactiveMode.paused);
      await tester.pump();
      expect(r.state.settings!.mode, ProactiveMode.paused);
      expect(r.state.settings!.pausedUntil, isNull);
      await r.controller.changeMode(ProactiveMode.off);
      await tester.pump();
      await r.controller.changeMode(
        ProactiveMode.on,
        confirmedZone: fixtureTime.timeZone,
      );
      await tester.pump();
      expect(r.repo.saved.map((v) => v.settings.mode), [
        ProactiveMode.paused,
        ProactiveMode.off,
        ProactiveMode.on,
      ]);
      expect(
        r.repo.saved.every(
          (v) =>
              v.settings.maximumInRolling24h == 1 &&
              v.settings.cooldownMinutes == 480 &&
              !v.settings.pushEnabled,
        ),
        isTrue,
      );
      expect(r.repo.creates, isEmpty);
      r.dispose();
    },
  );
}
