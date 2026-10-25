import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/proactive/proactive_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const fixtureTopic = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fixtureMessage = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const fixtureIntent = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
final fixtureNow = DateTime.utc(2026, 10, 25);
final fixtureTime = FollowUpTime(
  dueAt: DateTime.utc(2026, 10, 26, 8, 30),
  timeZone: 'Asia/Singapore',
  displayTime: '2026-10-26 16:30',
  offsetLabel: 'UTC+08:00',
);
final fixtureSource = SavedFollowUpSource.fromMessage(
  conversationId: fixtureTopic,
  message: AiMessage(
    messageId: fixtureMessage,
    sequence: 1,
    role: AiRole.user,
    availability: AiAvailability.available,
    text: 'Please follow up on my assignment tomorrow.',
    persistedAt: fixtureNow,
  ),
)!;
const unknownResult = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'Unsafe server text must never be rendered.',
);
const unavailableResult = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Not checked.',
);

ProactiveSettings fixtureSettings({
  ProactiveMode mode = ProactiveMode.off,
  int revision = 0,
  String? timeZone,
  ProactiveQuiet quiet = const ProactiveQuietWindow(22 * 60, 8 * 60),
}) => ProactiveSettings(
  revision: revision,
  mode: mode,
  categories: mode == ProactiveMode.off
      ? const []
      : const ['explicit_follow_up'],
  timeZone: timeZone ?? (revision == 0 ? '' : 'Asia/Singapore'),
  quiet: quiet,
  maximumInRolling24h: 1,
  cooldownMinutes: 480,
  pushEnabled: false,
  preview: ProactivePreview.generic,
);

FollowUpIntent fixtureReceipt({
  FollowUpIntentState state = FollowUpIntentState.queued,
  int revision = 1,
  String intentId = fixtureIntent,
}) => FollowUpIntent(
  intentId: intentId,
  revision: revision,
  state: state,
  dueAt: fixtureTime.dueAt,
  expiresAt: fixtureTime.dueAt.add(const Duration(hours: 1)),
  conversationId: fixtureTopic,
);

final class ProactiveRig {
  ProactiveRig._();
  final auth = FakeProactiveAuth();
  final repo = FakeProactiveRepository();
  final time = FakeFollowUpTimePort();
  final ids = FakeProactiveIds();
  late final ProviderContainer container;
  late final ProviderSubscription<ProactiveState> subscription;

  static Future<ProactiveRig> create(WidgetTester tester) async {
    final rig = ProactiveRig._();
    rig.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(rig.auth),
        proactiveRepositoryProvider.overrideWithValue(rig.repo),
        followUpTimePortProvider.overrideWithValue(rig.time),
        proactiveIntentIdsProvider.overrideWithValue(rig.ids),
        proactiveNowProvider.overrideWithValue(() => fixtureNow),
      ],
    );
    rig.subscription = rig.container.listen(
      proactiveControllerProvider,
      (_, _) {},
    );
    await tester.pump();
    rig.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
    await tester.pump();
    rig.consent(OptionalProcessingConsent.accepted);
    rig.controller.beginSourceReview();
    return rig;
  }

  ProactiveController get controller =>
      container.read(proactiveControllerProvider.notifier);
  ProactiveState get state => container.read(proactiveControllerProvider);
  void consent(OptionalProcessingConsent consent, {int revision = 1}) {
    container
        .read(accountSettingsSnapshotProvider.notifier)
        .observe(
          OwnSettings(
            checkInVisibility: CheckInVisibility.private,
            consent: consent,
            revision: revision,
          ),
        );
  }

  Future<void> ready(WidgetTester tester) async {
    repo.settings = fixtureSettings(mode: ProactiveMode.on, revision: 1);
    await controller.load();
    await tester.pump();
  }

  void dispose() {
    subscription.close();
    container.dispose();
    unawaited(auth.sessions.close());
  }
}

final class FakeProactiveAuth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  Future<Result<String>>? nextToken;
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() {
    final next = nextToken;
    nextToken = null;
    return next ?? Future.value(const Success('fixture-token'));
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> signOut() async => const Success(null);
}

final class FakeProactiveIds implements ProactiveIntentIdPort {
  int calls = 0;
  @override
  String nextId() {
    calls++;
    return fixtureIntent;
  }
}

final class FakeFollowUpTimePort implements FollowUpTimePort {
  String deviceZone = 'Asia/Singapore';
  Result<List<FollowUpTime>> resolution = Success([fixtureTime]);
  Future<Result<List<FollowUpTime>>>? delayedResolution;
  int resolves = 0;
  @override
  Future<Result<String>> currentIanaZone() async => Success(deviceZone);
  @override
  Future<Result<List<FollowUpTime>>> resolveCivil({
    required FollowUpCivilTime civil,
    required String timeZone,
  }) {
    resolves++;
    return delayedResolution ?? Future.value(resolution);
  }
}

final class FakeProactiveRepository implements ProactiveRepository {
  ProactiveSettings settings = fixtureSettings();
  List<FollowUpIntent> active = [];
  Future<Result<ProactiveSettings>>? nextReadSettings, nextSave;
  Future<Result<List<FollowUpIntent>>>? nextActive;
  Future<Result<FollowUpIntent>>? nextCreate, nextReadIntent, nextCancel;
  int settingsReads = 0, activeReads = 0;
  final saved = <({ProactiveSettings settings, int revision})>[];
  final creates = <CreateFollowUp>[];
  final reads = <String>[];
  final cancels = <({String id, int revision})>[];
  final signals = <ProactiveAbortSignal>[];
  @override
  Future<Result<ProactiveSettings>> readSettings({
    required String token,
    required ProactiveAbortSignal abort,
  }) {
    settingsReads++;
    signals.add(abort);
    return nextReadSettings ?? Future.value(Success(settings));
  }

  @override
  Future<Result<ProactiveSettings>> saveSettings({
    required String token,
    required ProactiveAbortSignal abort,
    required ProactiveSettings settings,
    required int expectedRevision,
  }) {
    saved.add((settings: settings, revision: expectedRevision));
    signals.add(abort);
    if (nextSave != null) return nextSave!;
    this.settings = ProactiveSettings(
      revision: expectedRevision + 1,
      mode: settings.mode,
      categories: settings.categories,
      timeZone: settings.timeZone,
      quiet: settings.quiet,
      maximumInRolling24h: 1,
      cooldownMinutes: 480,
      pushEnabled: settings.pushEnabled,
      preview: settings.preview,
      pausedUntil: settings.pausedUntil,
    );
    return Future.value(Success(this.settings));
  }

  @override
  Future<Result<List<FollowUpIntent>>> readActiveIntents({
    required String token,
    required ProactiveAbortSignal abort,
  }) {
    activeReads++;
    signals.add(abort);
    return nextActive ?? Future.value(Success(active));
  }

  @override
  Future<Result<FollowUpIntent>> createIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required CreateFollowUp command,
  }) {
    creates.add(command);
    signals.add(abort);
    return nextCreate ?? Future.value(Success(fixtureReceipt()));
  }

  @override
  Future<Result<FollowUpIntent>> readIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
  }) {
    reads.add(intentId);
    signals.add(abort);
    return nextReadIntent ?? Future.value(Success(fixtureReceipt()));
  }

  @override
  Future<Result<FollowUpIntent>> cancelIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
    required int expectedRevision,
  }) {
    cancels.add((id: intentId, revision: expectedRevision));
    signals.add(abort);
    return nextCancel ??
        Future.value(
          Success(
            fixtureReceipt(
              state: FollowUpIntentState.cancelled,
              revision: expectedRevision + 1,
            ),
          ),
        );
  }
}
