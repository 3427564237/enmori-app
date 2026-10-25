import '../../../core/result/result.dart';
import '../domain/proactive.dart';

final class PendingFollowUp {
  const PendingFollowUp({required this.intentId, this.command});
  final String intentId;

  /// Present only for an uncertain original create. Never automatically replay.
  final CreateFollowUp? command;
}

final class ProactiveState {
  ProactiveState({
    required this.sessionKey,
    required this.authenticated,
    this.settings,
    List<FollowUpIntent>? intents,
    this.settingsBusy = false,
    this.intentsBusy = false,
    this.settingsUnconfirmed = false,
    this.settingsStale = false,
    this.pendingIntent,
    this.lastIntent,
    this.failure,
    this.sourceUnavailable = false,
  }) : intents = intents == null ? null : List.unmodifiable(intents);

  final Object sessionKey;
  final bool authenticated;
  final ProactiveSettings? settings;

  /// null means not successfully read, never an empty-success substitute.
  final List<FollowUpIntent>? intents;
  final bool settingsBusy, intentsBusy, settingsUnconfirmed, settingsStale;
  final PendingFollowUp? pendingIntent;
  final FollowUpIntent? lastIntent;
  final AppFailure? failure;
  final bool sourceUnavailable;

  bool get canChangeSettings =>
      authenticated &&
      settings != null &&
      !settingsBusy &&
      !settingsUnconfirmed &&
      !settingsStale;
  bool get canSchedule =>
      canChangeSettings &&
      settings!.allowsExplicitFollowUp &&
      intents != null &&
      intents!.length < 3 &&
      !intentsBusy &&
      pendingIntent == null &&
      !sourceUnavailable;

  ProactiveState copy({
    ProactiveSettings? settings,
    List<FollowUpIntent>? intents,
    bool clearIntents = false,
    FollowUpIntent? lastIntent,
    bool? settingsBusy,
    bool? intentsBusy,
    bool? settingsUnconfirmed,
    bool? settingsStale,
    PendingFollowUp? pendingIntent,
    bool clearPending = false,
    AppFailure? failure,
    bool clearFailure = false,
    bool? sourceUnavailable,
  }) => ProactiveState(
    sessionKey: sessionKey,
    authenticated: authenticated,
    settings: settings ?? this.settings,
    intents: clearIntents ? null : intents ?? this.intents,
    lastIntent: lastIntent ?? this.lastIntent,
    settingsBusy: settingsBusy ?? this.settingsBusy,
    intentsBusy: intentsBusy ?? this.intentsBusy,
    settingsUnconfirmed: settingsUnconfirmed ?? this.settingsUnconfirmed,
    settingsStale: settingsStale ?? this.settingsStale,
    pendingIntent: clearPending ? null : pendingIntent ?? this.pendingIntent,
    failure: clearFailure ? null : failure ?? this.failure,
    sourceUnavailable: sourceUnavailable ?? this.sourceUnavailable,
  );
}
