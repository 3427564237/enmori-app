import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';

import 'proactive_messaging_test_support.dart';
import 'proactive_test_support.dart';

void main() {
  testWidgets(
    'null installation performs no SDK work, network registration or consent read',
    (tester) async {
      final r = await MessagingRig.create(
        tester,
        configured: false,
        initial: deliveryReference,
      );
      addTearDown(r.dispose);
      await r.controller.enablePush();
      await r.controller.readRegistration();
      await r.controller.beforeSignOut();
      expect(r.state.configured, isFalse);
      expect(r.sdk.calls, isEmpty);
      expect(r.sdk.clickSubscriptions, 0);
      expect(r.preferences.reads, 0);
      expect(r.registrations.reads, 0);
      expect(r.settings.saved, isEmpty);
    },
  );
  testWidgets(
    'ordinary configured launch captures click capability without token, registration or account reads',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      expect(r.sdk.calls.where((v) => v == 'initial'), hasLength(1));
      expect(r.sdk.calls.where((v) => v != 'initial'), isEmpty);
      expect(r.preferences.reads, 0);
      expect(r.registrations.puts, 0);
      expect(r.sdk.refreshSubscriptions, 0);
    },
  );
  testWidgets(
    'explicit enable requires permission, channel, settings ACK and exact registration ACK',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      await r.controller.enablePush();
      await tester.pump();
      expect(r.sdk.calls, ['initial', 'request', 'channel', 'token']);
      expect(r.settings.saved.single.settings.pushEnabled, isTrue);
      expect(r.settings.saved.single.settings.mode, ProactiveMode.on);
      expect(r.registrations.puts, 1);
      expect(r.registrations.revisions, [0]);
      expect(r.state.registration?.enabled, isTrue);
      expect(r.state.unconfirmed, isFalse);
      expect(r.sdk.refreshSubscriptions, 1);
      expect(r.resolutions, isEmpty);
    },
  );
  testWidgets(
    'permission denial and follow-ups off never obtain a token or upload registration',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      r.sdk.permissionValue = ProactiveNotificationPermission.denied;
      await r.controller.enablePush();
      expect(r.sdk.calls, ['initial', 'request']);
      expect(r.registrations.puts, 0);
      expect(r.settings.saved, isEmpty);
      r.settings.settings = fixtureSettings();
      await r.controller.enablePush();
      expect(r.sdk.calls, ['initial', 'request']);
    },
  );
  testWidgets(
    'same-UID session replacement during permission blocks the late token and write',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      final permission = Completer<Result<ProactiveNotificationPermission>>();
      r.sdk.requested = permission.future;
      final future = r.controller.enablePush();
      await tester.pump();
      expect(r.sdk.calls, contains('request'));
      r.auth.sessions.add(AuthSessionAuthenticated(subject: r.actor.subject));
      await tester.pump();
      permission.complete(
        const Success(ProactiveNotificationPermission.granted),
      );
      await future;
      await tester.pump();
      expect(r.sdk.calls, isNot(contains('token')));
      expect(r.registrations.puts, 0);
      expect(r.targets, isEmpty);
    },
  );
  testWidgets(
    'native permission foreground loss resumes only the original explicit command after fresh consent',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      final permission = Completer<Result<ProactiveNotificationPermission>>();
      r.sdk.requested = permission.future;
      final future = r.controller.enablePush();
      await tester.pump();
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      permission.complete(
        const Success(ProactiveNotificationPermission.granted),
      );
      await tester.pump();
      expect(r.sdk.calls, isNot(contains('token')));
      r.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      await future;
      expect(r.preferences.reads, greaterThanOrEqualTo(3));
      expect(r.registrations.puts, 1);
    },
  );
  testWidgets(
    'revoked consent during SDK getToken prevents late registration',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      final token = Completer<Result<String>>();
      r.sdk.tokenFuture = token.future;
      final future = r.controller.enablePush();
      await tester.pump();
      expect(r.sdk.calls, contains('token'));
      r.preferences.value = ownConsent(
        consent: OptionalProcessingConsent.rejected,
        revision: 2,
      );
      r.container
          .read(accountSettingsSnapshotProvider.notifier)
          .observe(r.preferences.value);
      await tester.pump();
      token.complete(const Success('late-private-token'));
      await future;
      expect(r.registrations.puts, 0);
      expect(r.settings.saved, isEmpty);
    },
  );
  testWidgets(
    'unknown registration PUT allows only GET; unchanged revision cannot prove no effect',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      r.registrations.nextReplace = Future.value(const Failure(unknownResult));
      await r.controller.enablePush();
      expect(r.state.unconfirmed, isTrue);
      expect(r.registrations.puts, 1);
      await r.controller.readRegistration();
      expect(r.state.unconfirmed, isTrue);
      await r.controller.enablePush();
      expect(r.registrations.puts, 1);
      r.registrations.metadata = registered();
      await r.controller.readRegistration();
      expect(r.state.unconfirmed, isFalse);
      expect(r.state.registration?.enabled, isTrue);
      expect(r.sdk.refreshSubscriptions, 0);
      expect(r.registrations.puts, 1);
    },
  );
  testWidgets(
    'unknown settings PUT cannot proceed to registration or be cleared by unchanged GET',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      r.settings.nextSave = Future.value(const Failure(unknownResult));
      await r.controller.enablePush();
      expect(r.state.unconfirmed, isTrue);
      expect(r.registrations.puts, 0);
      await r.controller.readRegistration();
      expect(r.state.unconfirmed, isTrue);
      expect(r.settings.saved, hasLength(1));
    },
  );
  testWidgets(
    'token refresh updates only the explicitly confirmed current scope without new getToken',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      await r.controller.enablePush();
      r.sdk.refreshed.add('synthetic-rotated');
      await tester.pump();
      expect(r.registrations.puts, 2);
      expect(r.registrations.revisions, [0, 1]);
      expect(r.registrations.tokens.last, 'synthetic-rotated');
      expect(r.sdk.calls.where((v) => v == 'token'), hasLength(1));
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      r.sdk.refreshed.add('background-token');
      await tester.pump();
      expect(r.registrations.puts, 2);
    },
  );
  testWidgets(
    'disable releases only current installation and does not turn off in-app follow-ups',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      await r.controller.enablePush();
      await r.controller.disablePush();
      expect(r.registrations.deletes, 1);
      expect(r.state.registration?.enabled, isFalse);
      expect(r.settings.settings.pushEnabled, isFalse);
      expect(r.settings.settings.mode, ProactiveMode.on);
      expect(r.sdk.calls.where((v) => v == 'delete'), hasLength(1));
      r.sdk.refreshed.add('late-token');
      await tester.pump();
      expect(r.registrations.puts, 1);
    },
  );
  testWidgets(
    'sign-out cleanup is bounded while old physical SDK deletion retains admission',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      await r.controller.enablePush();
      final deleting = Completer<Result<void>>();
      r.sdk.deleting = deleting.future;
      final signOut = r.controller.beforeSignOut();
      await tester.pump();
      expect(r.registrations.deletes, 1);
      await tester.pump(const Duration(seconds: 15));
      await signOut;
      r.auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'replacement-user'),
      );
      await tester.pump();
      await r.controller.enablePush();
      expect(r.sdk.calls.where((v) => v == 'token'), hasLength(1));
      deleting.complete(const Success(null));
      await tester.pump();
      expect(r.state.registration, isNull);
    },
  );
  testWidgets(
    'cold click waits for sign-in then reads real consent before resolving exact session-bound target',
    (tester) async {
      final r = await MessagingRig.create(
        tester,
        authenticated: false,
        initial: deliveryReference,
      );
      addTearDown(r.dispose);
      expect(r.state.hasPendingDelivery, isTrue);
      expect(r.preferences.reads, 0);
      expect(r.resolutions, isEmpty);
      r.auth.sessions.add(r.actor);
      await tester.pump();
      expect(r.preferences.reads, 1);
      expect(r.resolutions, [deliveryReference]);
      expect(r.targets.single.session, same(r.actor));
      expect(r.targets.single.target.messageId, fixtureMessage);
      expect(r.registrations.puts, 0);
      expect(r.sdk.calls, ['initial']);
      expect(r.settings.saved, isEmpty);
      r.sdk.clicked.add(deliveryReference);
      await tester.pump();
      expect(r.targets, hasLength(1));
    },
  );
  testWidgets(
    'cold denied/unknown consent never resolves and cannot silently become accepted',
    (tester) async {
      final r = await MessagingRig.create(
        tester,
        authenticated: false,
        initial: deliveryReference,
      );
      addTearDown(r.dispose);
      r.preferences.value = ownConsent(
        consent: OptionalProcessingConsent.rejected,
      );
      r.auth.sessions.add(r.actor);
      await tester.pump();
      expect(r.resolutions, isEmpty);
      expect(r.targets, isEmpty);
      expect(r.state.hasPendingDelivery, isTrue);
      expect(
        r.container.read(accountSettingsSnapshotProvider)?.consent,
        OptionalProcessingConsent.rejected,
      );
    },
  );
  testWidgets(
    'late target after account replacement never navigates and does not mark anything read',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      final resolving = Completer<Result<ProactiveMessageTarget>>();
      r.resolving = resolving.future;
      r.sdk.clicked.add(deliveryReference);
      await tester.pump();
      expect(r.resolutions, [deliveryReference]);
      r.auth.sessions.add(AuthSessionAuthenticated(subject: r.actor.subject));
      await tester.pump();
      resolving.complete(const Success(messageTarget));
      await tester.pump();
      expect(r.targets, isEmpty);
      expect(r.state.hasPendingDelivery, isFalse);
      expect(r.registrations.puts, 0);
    },
  );
  testWidgets(
    'unknown resolver does not auto retry and a user may explicitly recheck the read-only target',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      r.resolving = Future.value(const Failure(unavailableResult));
      r.sdk.clicked.add(deliveryReference);
      await tester.pump();
      expect(r.resolutions, hasLength(1));
      expect(r.targets, isEmpty);
      expect(r.state.hasPendingDelivery, isTrue);
      await tester.pump(const Duration(seconds: 2));
      expect(r.resolutions, hasLength(1));
      r.resolving = null;
      await r.controller.openPendingDelivery();
      expect(r.targets, hasLength(1));
      expect(r.registrations.puts, 0);
    },
  );
}
