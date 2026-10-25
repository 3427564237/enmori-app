import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';
import 'package:enmori/features/proactive/proactive_providers.dart';
import 'package:enmori/features/proactive/proactive_notification_controller.dart';

import 'proactive_test_support.dart';

const messagingInstallation = '00000000-0000-4000-8000-000000000010';
const deliveryReference = '00000000-0000-4000-8000-000000000020';
const messageTarget = ProactiveMessageTarget(
  conversationId: fixtureTopic,
  messageId: fixtureMessage,
);
OwnSettings ownConsent({
  OptionalProcessingConsent consent = OptionalProcessingConsent.accepted,
  int revision = 1,
}) => OwnSettings(
  checkInVisibility: CheckInVisibility.private,
  consent: consent,
  revision: revision,
);
ProactiveRegistration registered({int revision = 1}) => ProactiveRegistration(
  revision: revision,
  enabled: true,
  availability: ProactiveRegistrationAvailability.registered,
  installationRef: messagingInstallation,
  expiresAt: fixtureNow.add(const Duration(minutes: 45)),
);

class MessagingPreferences extends Fake
    implements AccountPreferencesRepository {
  OwnSettings value = ownConsent();
  Future<Result<OwnSettings>>? next;
  int reads = 0;
  @override
  Future<Result<OwnSettings>> readSettings() {
    reads++;
    return next ?? Future.value(Success(value));
  }
}

class MessagingPort extends Fake implements ProactiveMessagingPort {
  final calls = <String>[];
  final clicked = StreamController<String>.broadcast(),
      refreshed = StreamController<String>.broadcast();
  String? initial;
  ProactiveNotificationPermission permissionValue =
      ProactiveNotificationPermission.granted;
  Future<Result<ProactiveNotificationPermission>>? requested;
  Future<Result<String>>? tokenFuture;
  Future<Result<void>>? deleting;
  int clickSubscriptions = 0, refreshSubscriptions = 0;
  @override
  Future<Result<ProactiveNotificationPermission>> permission() async {
    calls.add('permission');
    return Success(permissionValue);
  }

  @override
  Future<Result<ProactiveNotificationPermission>> requestPermission() {
    calls.add('request');
    return requested ?? Future.value(Success(permissionValue));
  }

  @override
  Future<Result<bool>> prepareChannel() async {
    calls.add('channel');
    return const Success(true);
  }

  @override
  Future<Result<String>> getToken() {
    calls.add('token');
    return tokenFuture ?? Future.value(const Success('synthetic-token'));
  }

  @override
  Future<Result<void>> deleteToken() {
    calls.add('delete');
    return deleting ?? Future.value(const Success(null));
  }

  @override
  Stream<String> get openedDeliveryRefs {
    clickSubscriptions++;
    return clicked.stream;
  }

  @override
  Stream<String> get tokenRefreshes {
    refreshSubscriptions++;
    return refreshed.stream;
  }

  @override
  Future<Result<String?>> initialDeliveryRef() async {
    calls.add('initial');
    return Success(initial);
  }

  Future<void> close() async {
    await clicked.close();
    await refreshed.close();
  }
}

class RegistrationRepo extends Fake implements ProactiveRegistrationRepository {
  ProactiveRegistration metadata = const ProactiveRegistration(
    revision: 0,
    enabled: false,
    availability: ProactiveRegistrationAvailability.unregistered,
  );
  Future<Result<ProactiveRegistration>>? nextRead, nextReplace, nextDelete;
  int reads = 0, puts = 0, deletes = 0;
  final revisions = <int>[], tokens = <String>[], authTokens = <String>[];
  @override
  Future<Result<ProactiveRegistration>> read({
    required String token,
    required ProactiveAbortSignal abort,
  }) {
    reads++;
    authTokens.add(token);
    return nextRead ?? Future.value(Success(metadata));
  }

  @override
  Future<Result<ProactiveRegistration>> replace({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
    required String registrationValue,
  }) {
    puts++;
    revisions.add(expectedRevision);
    tokens.add(registrationValue);
    authTokens.add(token);
    if (nextReplace != null) return nextReplace!;
    expect(installationRef, messagingInstallation);
    expect(expectedRevision, metadata.revision);
    metadata = registered(revision: expectedRevision + 1);
    return Future.value(Success(metadata));
  }

  @override
  Future<Result<ProactiveRegistration>> delete({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
  }) {
    deletes++;
    authTokens.add(token);
    expect(installationRef, messagingInstallation);
    expect(expectedRevision, metadata.revision);
    if (nextDelete != null) return nextDelete!;
    metadata = ProactiveRegistration(
      revision: expectedRevision + 1,
      enabled: false,
      availability: ProactiveRegistrationAvailability.unregistered,
    );
    return Future.value(Success(metadata));
  }
}

class MessagingRig {
  final auth = FakeProactiveAuth(), settings = FakeProactiveRepository();
  final sdk = MessagingPort(),
      registrations = RegistrationRepo(),
      preferences = MessagingPreferences();
  final targets =
      <({AuthSessionAuthenticated session, ProactiveMessageTarget target})>[];
  final resolutions = <String>[];
  late ProviderContainer container;
  late ProviderSubscription<ProactiveNotificationState> subscription;
  late AuthSessionAuthenticated actor;
  Future<Result<ProactiveMessageTarget>>? resolving;
  static Future<MessagingRig> create(
    WidgetTester tester, {
    bool configured = true,
    bool authenticated = true,
    String? initial,
  }) async {
    final r = MessagingRig();
    r.sdk.initial = initial;
    r.settings.settings = fixtureSettings(mode: ProactiveMode.on, revision: 1);
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        proactiveRepositoryProvider.overrideWithValue(r.settings),
        accountPreferencesRepositoryProvider.overrideWithValue(r.preferences),
        proactiveNowProvider.overrideWithValue(() => fixtureNow),
        proactiveMessagingEnabledProvider.overrideWithValue(true),
        proactiveMessagingPortProvider.overrideWithValue(r.sdk),
        proactiveMessagingInstallationRefProvider.overrideWithValue(
          configured ? messagingInstallation : null,
        ),
        proactiveRegistrationRepositoryProvider.overrideWithValue(
          r.registrations,
        ),
        proactiveDeliveryResolverProvider.overrideWithValue(({
          required token,
          required deliveryRef,
          required abort,
        }) {
          r.resolutions.add(deliveryRef);
          return r.resolving ?? Future.value(const Success(messageTarget));
        }),
        proactiveMessageTargetHandlerProvider.overrideWithValue(
          (session, target) =>
              r.targets.add((session: session, target: target)),
        ),
      ],
    );
    await tester.pumpWidget(UncontrolledProviderScope(container: r.container, child: const SizedBox()));
    r.subscription = r.container.listen(
      proactiveNotificationControllerProvider,
      (_, _) {},
    );
    await tester.pump();
    r.actor = const AuthSessionAuthenticated(subject: 'same-user');
    r.auth.sessions.add(
      authenticated ? r.actor : const AuthSessionUnauthenticated(),
    );
    await tester.pump();
    await tester.pump();
    return r;
  }

  ProactiveNotificationController get controller =>
      container.read(proactiveNotificationControllerProvider.notifier);
  ProactiveNotificationState get state =>
      container.read(proactiveNotificationControllerProvider);
  void dispose() {
    subscription.close();
    container.dispose();
    unawaited(auth.sessions.close());
    unawaited(sdk.close());
  }
}
