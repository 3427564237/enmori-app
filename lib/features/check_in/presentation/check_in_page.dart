import 'check_in_place_controller.dart';
import 'check_in_place_controls.dart';
import '../../account/account_preferences_providers.dart';
import '../../account/domain/account_preferences_repository.dart';
import '../../auth/auth_providers.dart';
import 'located_check_in_actions.dart';
import 'located_check_in_controller.dart';
import 'check_in_record_view.dart';
import '../check_in_providers.dart';
import '../domain/check_in_mutations.dart';
import 'check_in_edit_page.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/check_in_repository.dart';
import '../../account/domain/account_repository.dart';
import 'check_in_controller.dart';

enum _CheckInAction { create, read }

final class CheckInComposerPage extends ConsumerStatefulWidget {
  const CheckInComposerPage({
    this.onReturnHome,
    this.onOpenSaved,
    this.onOpenHistory,
    this.socialStyle = false,
    this.located = false,
    this.openAttribution,
    this.visibility,
    super.key,
  });

  final VoidCallback? onReturnHome;
  final ValueChanged<String>? onOpenSaved;
  final VoidCallback? onOpenHistory;
  final bool socialStyle;
  final bool located;
  final Future<bool> Function(Uri)? openAttribution;
  final CheckInVisibility? visibility;

  @override
  ConsumerState<CheckInComposerPage> createState() =>
      _CheckInComposerPageState();
}

final class _CheckInComposerPageState extends ConsumerState<CheckInComposerPage>
    with WidgetsBindingObserver {
  late final CheckInController _controller;
  final _noteController = TextEditingController();
  final _scroll = ScrollController();
  CheckIn? _committedCheckIn;
  final _locationDraft = Object();
  bool _settingsReady = false;
  bool _settingsFailed = false;
  String? _mood, _activity, _locationLabel;
  OwnSettings? _defaults;
  bool _defaultsApplied = false;
  bool _foreground = true;
  CheckInVisibility? _visibility;
  _CheckInAction? _lastAction;
  String? _noteErrorText;
  int? _activeOperation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground =
        lifecycle != AppLifecycleState.paused &&
        lifecycle != AppLifecycleState.hidden &&
        lifecycle != AppLifecycleState.detached;
    _controller = ref.read(checkInControllerProvider.notifier);
    if (widget.located) Future.microtask(_loadVisibility);
  }

  Future<void> _loadVisibility() async {
    final session = ref.read(authSessionProvider).asData?.value;
    final result = await ref
        .read(accountPreferencesRepositoryProvider)
        .readSettings();
    if (!mounted ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    setState(() {
      if (result case Success<OwnSettings>(:final value)) {
        _defaults = value;
        _visibility ??= value.checkInVisibility;
        _settingsReady = true;
        _settingsFailed = false;
      } else {
        _settingsFailed = true;
      }
    });
    if (!_defaultsApplied && _defaults != null && _foreground) {
      _defaultsApplied = true;
      final place = ref.read(
        checkInPlaceControllerProvider(_locationDraft).notifier,
      );
      await place.captureDefaults(_defaults!);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _foreground = true;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _foreground = false;
    }
    if (widget.located &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached)) {
      final saving = ref.read(locatedCheckInControllerProvider(_locationDraft));
      if (!saving.busy && !saving.uncertain) {
        ref
            .read(checkInPlaceControllerProvider(_locationDraft).notifier)
            .clear();
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _noteController.dispose();
    _scroll.dispose();
    if (_activeOperation case final operation?) _controller.abandon(operation);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CommandState<CheckIn>>(checkInControllerProvider, (
      previous,
      next,
    ) {
      if (!mounted) return;
      if (next case CommandSucceeded<CheckIn>(:final value)) {
        setState(() => _committedCheckIn = value);
      }
      if (next is CommandSucceeded<CheckIn> || next is CommandFailed<CheckIn>) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _scroll.hasClients) {
            _scroll.jumpTo(_scroll.position.maxScrollExtent);
          }
        });
      }
    });

    final state = ref.watch(checkInControllerProvider);
    final located = widget.located
        ? ref.watch(locatedCheckInControllerProvider(_locationDraft))
        : null;
    final saved = located?.savedId != null;
    final pending =
        state is CommandPending<CheckIn> ||
        located?.busy == true ||
        located?.uncertain == true ||
        saved;
    if (widget.located) {
      ref.listen(locatedCheckInControllerProvider(_locationDraft), (
        previous,
        next,
      ) {
        if (next.savedId != null && previous?.savedId == null) {
          FocusScope.of(context).unfocus();
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _scroll.hasClients) _scroll.jumpTo(0);
          });
        }
      });
    }
    final placeState = widget.located
        ? ref.watch(checkInPlaceControllerProvider(_locationDraft))
        : null;
    final noteLength = _noteController.text.trim().characters.length;
    return PopScope<void>(
      canPop:
          !widget.located ||
          saved ||
          (!pending &&
              _noteController.text.isEmpty &&
              _mood == null &&
              _activity == null &&
              _locationLabel == null &&
              placeState?.place == null),
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || !widget.located) return;
        final leave = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(
              pending ? 'Leave this Check-in?' : 'Discard this draft?',
            ),
            content: Text(
              pending
                  ? 'The save may still complete. Stay to recover the same request, or check History before making another Check-in.'
                  : 'Your unsaved Note, Mood and location choice will be discarded.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Keep editing'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Leave'),
              ),
            ],
          ),
        );
        if (mounted && leave == true) widget.onReturnHome?.call();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: widget.located
              ? BackButton(onPressed: () => Navigator.of(context).maybePop())
              : null,
          title: Text(widget.socialStyle ? 'Check-in' : 'New Check-in'),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: SingleChildScrollView(
                controller: _scroll,
                key: const Key('route-check-in'),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!saved) ...[
                      TextField(
                        key: const Key('r6-check-in-note'),
                        controller: _noteController,
                        enabled: !pending,
                        minLines: MediaQuery.sizeOf(context).height < 500
                            ? 3
                            : 6,
                        maxLines: 12,
                        maxLength: 500,
                        onChanged: (_) => setState(() => _noteErrorText = null),
                        decoration: InputDecoration(
                          alignLabelWithHint: true,
                          errorText: _noteErrorText,
                          helperText: widget.socialStyle
                              ? 'A note of up to 500 characters.'
                              : '$noteLength / 500 characters',
                          counterText: widget.socialStyle
                              ? '$noteLength / 500'
                              : null,
                          hintText: widget.socialStyle
                              ? 'What would you like to keep from today?'
                              : null,
                          labelText: 'Note',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _ComposerLabelChip(
                            selected: _mood != null,
                            avatar: const Icon(Icons.mood_outlined, size: 18),
                            label: _mood ?? 'Mood',
                            onPressed: pending
                                ? null
                                : () => _chooseLabel('Mood', _mood, [
                                    'Happy',
                                    'Calm',
                                    'Focused',
                                    'Tired',
                                    'Stressed',
                                    'Not sure',
                                  ], (v) => _mood = v),
                          ),
                          _ComposerLabelChip(
                            selected: _locationLabel != null,
                            avatar: const Icon(Icons.place_outlined, size: 18),
                            label: _locationLabel ?? 'Location',
                            onPressed: pending
                                ? null
                                : () => _chooseLabel(
                                    'Place name',
                                    _locationLabel,
                                    [],
                                    (v) => _locationLabel = v,
                                  ),
                          ),
                          _ComposerLabelChip(
                            selected: _activity != null,
                            avatar: const Icon(
                              Icons.local_activity_outlined,
                              size: 18,
                            ),
                            label: _activity ?? 'Activity',
                            onPressed: pending
                                ? null
                                : () => _chooseLabel('Activity', _activity, [
                                    'Study',
                                    'Fitness',
                                    'Social',
                                    'Food',
                                    'Travel',
                                  ], (v) => _activity = v),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Card(
                        child: ListTile(
                          key: const Key('check-in-permissions'),
                          leading: const Icon(Icons.tune),
                          title: const Text('Permissions'),
                          subtitle: MotionReveal(
                            trigger: (
                              _visibility,
                              placeState?.busy,
                              placeState?.place?.includeWeather,
                              placeState?.place?.location,
                            ),
                            distance: 0,
                            child: Text(
                              '$_visibilityLabel · ${placeState?.busy == true
                                  ? 'Getting GPS…'
                                  : placeState?.place == null
                                  ? 'No GPS'
                                  : 'GPS attached'} · ${placeState?.place?.includeWeather == true ? 'Weather on' : 'Weather off'}',
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: pending || (widget.located && !_settingsReady)
                              ? null
                              : _permissions,
                        ),
                      ),
                      if (placeState?.failure case final failure?)
                        Text(failure.message),
                      if (_defaults?.defaultCheckInWeather == true &&
                          placeState?.place == null &&
                          placeState?.busy != true)
                        const Text(
                          'Weather needs a GPS point. You can still save this Check-in.',
                        ),
                      const SizedBox(height: 12),
                    ],
                    if (widget.located && !_settingsReady)
                      _settingsFailed
                          ? TextButton(
                              onPressed: _loadVisibility,
                              child: const Text('Retry privacy settings'),
                            )
                          : const LinearProgressIndicator()
                    else if (widget.located)
                      LocatedCheckInActions(
                        draftKey: _locationDraft,
                        onOpenSaved: widget.onOpenSaved,
                        onOpenHistory: widget.onOpenHistory,
                        onReturnHome: widget.onReturnHome,
                        note: _noteController.text,
                        mood: _mood,
                        activity: _activity,
                        locationLabel: _locationLabel,
                        showPlaceControls: false,
                        visibility: _visibility ?? CheckInVisibility.private,
                        openAttribution:
                            widget.openAttribution ?? (uri) async => false,
                      )
                    else
                      FilledButton.icon(
                        key: const Key('r6-check-in-create'),
                        onPressed: pending ? null : _create,
                        icon: pending && _lastAction == _CheckInAction.create
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: const Text('Save Check-in'),
                      ),
                    const SizedBox(height: 20),
                    if (!widget.located) _statusBlock(state),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String get _visibilityLabel =>
      switch (_visibility ?? widget.visibility ?? CheckInVisibility.private) {
        CheckInVisibility.private => 'Private',
        CheckInVisibility.friendsOnly => 'Friends only',
        CheckInVisibility.public => 'Public',
      };

  Future<void> _chooseLabel(
    String title,
    String? current,
    List<String> choices,
    void Function(String?) update,
  ) async {
    var input = current ?? '';
    final value = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      sheetAnimationStyle: EnmoriMotion.surface(context),
      builder: (context) => SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          16,
          0,
          16,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              if (title == 'Place name')
                const Text(
                  'A display label only. GPS and weather are managed in Permissions.',
                ),
              if (title == 'Activity')
                const Text(
                  'A personal label, separate from an official event.',
                ),
              if (choices.isNotEmpty)
                Wrap(
                  spacing: 8,
                  children: [
                    for (final choice in choices)
                      ActionChip(
                        chipAnimationStyle: EnmoriMotion.chips(context),
                        label: Text(choice),
                        onPressed: () => Navigator.pop(context, choice),
                      ),
                  ],
                ),
              const SizedBox(height: 12),
              TextFormField(
                initialValue: input,
                onChanged: (value) => input = value,
                maxLength: 50,
                decoration: InputDecoration(labelText: 'Custom $title'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => Navigator.pop(context, input.trim()),
                child: const Text('Apply'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, ''),
                child: const Text('Clear'),
              ),
            ],
          ),
        ),
      ),
    );
    if (mounted && value != null) {
      setState(() {
        update(value.isEmpty ? null : value);
        _noteErrorText = null;
      });
    }
  }

  Future<void> _permissions() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      sheetAnimationStyle: EnmoriMotion.surface(context),
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'This Check-in',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<CheckInVisibility>(
                initialValue:
                    _visibility ??
                    widget.visibility ??
                    CheckInVisibility.private,
                decoration: const InputDecoration(labelText: 'Who can see it'),
                items: const [
                  DropdownMenuItem(
                    value: CheckInVisibility.private,
                    child: Text('Private'),
                  ),
                  DropdownMenuItem(
                    value: CheckInVisibility.friendsOnly,
                    child: Text('Friends only'),
                  ),
                  DropdownMenuItem(
                    value: CheckInVisibility.public,
                    child: Text('Public'),
                  ),
                ],
                onChanged: (v) {
                  if (mounted) setState(() => _visibility = v);
                },
              ),
              if (widget.located)
                CheckInPlaceControls(
                  draftKey: _locationDraft,
                  defaultLocationAuthorized:
                      _defaults?.defaultCheckInLocation ?? false,
                  defaultWeatherAuthorized:
                      _defaults?.defaultCheckInWeather ?? false,
                ),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusBlock(CommandState<CheckIn> state) {
    if (state is CommandPending<CheckIn>) {
      return _ResultPanel(
        key: Key(
          _lastAction == _CheckInAction.read
              ? 'r6-check-in-confirming'
              : 'r6-check-in-saving',
        ),
        icon: _lastAction == _CheckInAction.read ? Icons.sync : Icons.save,
        title: _lastAction == _CheckInAction.read
            ? 'Confirming your saved Check-in…'
            : 'Saving Check-in',
        body: _lastAction == _CheckInAction.read
            ? (widget.socialStyle
                  ? 'Checking your saved note…'
                  : 'Reading the saved Check-in from backend-only product data.')
            : (widget.socialStyle
                  ? 'Saving your moment…'
                  : 'Saving your Check-in with the approved backend operation.'),
      );
    }
    if (state case CommandFailed<CheckIn>(:final failure)) {
      final confirming = _lastAction == _CheckInAction.read;
      return _ResultPanel(
        key: Key(
          confirming ? 'r6-check-in-unavailable' : 'r6-check-in-failure',
        ),
        icon: confirming ? Icons.sync_problem : Icons.error_outline,
        title: confirming ? 'Confirmation unavailable' : 'Check-in not saved',
        body: confirming
            ? _confirmationFailureCopy(failure.kind)
            : _createFailureCopy(failure.kind),
        action: confirming && _committedCheckIn != null
            ? FilledButton.icon(
                key: const Key('r6-check-in-retry-confirmation'),
                onPressed: () => _confirm(_committedCheckIn!),
                icon: const Icon(Icons.sync),
                label: const Text('Reload Check-in'),
              )
            : null,
      );
    }
    final checkIn = _committedCheckIn;
    if (checkIn == null) return const SizedBox.shrink();
    final confirmed =
        state is CommandSucceeded<CheckIn> &&
        _lastAction == _CheckInAction.read;
    return _ResultPanel(
      key: Key(confirmed ? 'r6-check-in-confirmed' : 'r6-check-in-committed'),
      icon: confirmed ? Icons.verified : Icons.task_alt,
      title: confirmed ? 'Saved Check-in confirmed.' : 'Check-in saved.',
      body:
          '${checkIn.note}${checkIn.mood == null ? '' : '\nMood: ${checkIn.mood}'}${checkIn.activity == null ? '' : '\nActivity: ${checkIn.activity}'}\nSaved at ${checkIn.createdAt.toUtc().toIso8601String()}'
          '${switch (checkIn.checkInVisibility) {
            CheckInVisibility.private => '\nVisibility: Private',
            CheckInVisibility.friendsOnly => '\nVisibility: Friends-only',
            CheckInVisibility.public => '\nVisibility: Public',
            null => '',
          }}',
      action: confirmed
          ? OutlinedButton.icon(
              key: const Key('r6-return-home-inline'),
              onPressed: widget.onReturnHome ?? () {},
              icon: const Icon(Icons.home_outlined),
              label: const Text('Return Home'),
            )
          : FilledButton.icon(
              key: const Key('r6-check-in-confirm'),
              onPressed: () => _confirm(checkIn),
              icon: const Icon(Icons.sync),
              label: const Text('Confirm saved Check-in'),
            ),
    );
  }

  void _create() {
    final normalized = _noteController.text.trim();
    final noteLength = normalized.characters.length;
    if (noteLength == 0 && _mood == null) {
      setState(
        () => _noteErrorText = 'Enter a Note or select a Mood before saving.',
      );
      return;
    }
    if (noteLength > 500) {
      setState(() => _noteErrorText = 'Keep the Note within 500 characters.');
      return;
    }
    _lastAction = _CheckInAction.create;
    _controller.create(
      note: normalized,
      mood: _mood,
      activity: _activity,
      locationLabel: _locationLabel,
      visibility: _visibility,
    );
    _activeOperation = _controller.operationToken;
  }

  void _confirm(CheckIn checkIn) {
    _lastAction = _CheckInAction.read;
    _controller.readPersisted(checkInId: checkIn.checkInId);
    _activeOperation = _controller.operationToken;
  }

  String _createFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInInvalid =>
        'Enter a Note or select a Mood before saving.',
      AppFailureKind.idempotencyConflict => 'This Check-in attempt changed after it was submitted. Start a new attempt.',
      AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
      AppFailureKind.authForbidden => 'This account cannot continue.',
      AppFailureKind.serviceUnavailable ||
      AppFailureKind.configurationUnavailable =>
        'This service is temporarily unavailable. Try again.',
      _ => 'This service is temporarily unavailable. Try again.',
    };
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => 'This Check-in is unavailable.',
      AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
      AppFailureKind.authForbidden => 'This account cannot continue.',
      _ => 'This service is temporarily unavailable. Try again.',
    };
  }
}

final class SavedCheckInPage extends ConsumerStatefulWidget {
  const SavedCheckInPage({
    required this.checkInId,
    required this.onReturnHome,
    this.openAttribution,
    this.placeActions = false,
    super.key,
  });

  final String checkInId;
  final bool placeActions;
  final VoidCallback onReturnHome;
  final Future<bool> Function(Uri)? openAttribution;

  @override
  ConsumerState<SavedCheckInPage> createState() => _SavedCheckInPageState();
}

final class _SavedCheckInPageState extends ConsumerState<SavedCheckInPage> {
  late final CheckInController _controller;
  int? _activeOperation;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(checkInControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _readPersisted());
  }

  @override
  void dispose() {
    if (_activeOperation case final operation?) _controller.abandon(operation);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved Check-in'),
        actions: [
          if (state case CommandSucceeded<CheckIn>(:final value))
            if (ref.watch(checkInRepositoryProvider) is CheckInMutations)
              IconButton(
                key: const Key('saved-check-in-edit'),
                tooltip: 'Edit Check-in',
                icon: const Icon(Icons.edit_outlined),
                onPressed: () async {
                  final result = await Navigator.of(context)
                      .push<CheckInEditResult>(
                        MaterialPageRoute(
                          builder: (_) => CheckInEditPage(checkIn: value),
                        ),
                      );
                  if (!context.mounted) return;
                  if (result == CheckInEditResult.deleted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Check-in deleted.')),
                    );
                    if (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop();
                    } else {
                      widget.onReturnHome();
                    }
                  } else if (result == CheckInEditResult.saved) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Check-in updated.')),
                    );
                    _readPersisted();
                  }
                },
              ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          key: const Key('route-check-in-saved'),
          padding: const EdgeInsets.all(24),
          children: [
            if (state is CommandPending<CheckIn>)
              const _ResultPanel(
                key: Key('r6-saved-check-in-confirming'),
                icon: Icons.sync,
                title: 'Loading Check-in…',
                body: 'Getting your saved details.',
              )
            else if (state case CommandSucceeded<CheckIn>(:final value))
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CheckInRecordView(
                    key: const Key('r6-saved-check-in-confirmed'),
                    record: value,
                    openAttribution:
                        widget.openAttribution ?? (_) async => false,
                  ),
                  if (widget.placeActions)
                    SavedCheckInPlaceActions(
                      key: ValueKey('${value.checkInId}:${value.revision}'),
                      record: value,
                      onChanged: _readPersisted,
                      openAttribution:
                          widget.openAttribution ?? (_) async => false,
                    ),
                ],
              )
            else if (state case CommandFailed<CheckIn>(:final failure))
              _ResultPanel(
                key: const Key('r6-saved-check-in-unavailable'),
                icon: Icons.sync_problem,
                title: 'Check-in unavailable',
                body: _confirmationFailureCopy(failure.kind),
                action: FilledButton.icon(
                  key: const Key('r6-saved-check-in-retry-confirmation'),
                  onPressed: _readPersisted,
                  icon: const Icon(Icons.sync),
                  label: const Text('Reload Check-in'),
                ),
              ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              key: const Key('r6-return-home'),
              onPressed: widget.onReturnHome,
              icon: const Icon(Icons.home_outlined),
              label: const Text('Return Home'),
            ),
          ],
        ),
      ),
    );
  }

  void _readPersisted() {
    if (!mounted) return;
    _controller.readPersisted(checkInId: widget.checkInId);
    _activeOperation = _controller.operationToken;
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => 'This Check-in is unavailable.',
      AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
      AppFailureKind.authForbidden => 'This account cannot continue.',
      _ => 'This service is temporarily unavailable. Try again.',
    };
  }
}

final class _ResultPanel extends StatelessWidget {
  const _ResultPanel({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon),
            const SizedBox(height: 12),
            Semantics(
              header: true,
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 8),
            Text(body),
            if (action != null) ...[const SizedBox(height: 12), action!],
          ],
        ),
      ),
    );
  }
}

final class _ComposerLabelChip extends StatelessWidget {
  const _ComposerLabelChip({
    required this.label,
    required this.avatar,
    required this.selected,
    required this.onPressed,
  });
  final String label;
  final Widget avatar;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => AnimatedSize(
    duration: EnmoriMotion.duration(context, EnmoriMotion.content),
    curve: EnmoriMotion.settle,
    alignment: Alignment.centerLeft,
    child: AnimatedContainer(
      duration: EnmoriMotion.duration(context, EnmoriMotion.feedback),
      curve: EnmoriMotion.settle,
      decoration: ShapeDecoration(
        shape: const StadiumBorder(),
        color: selected
            ? Theme.of(context).colorScheme.primaryContainer
            : Colors.transparent,
      ),
      child: ActionChip(
        chipAnimationStyle: EnmoriMotion.chips(context),
        backgroundColor: Colors.transparent,
        avatar: avatar,
        label: MotionReveal(trigger: label, distance: 0, child: Text(label)),
        onPressed: onPressed,
      ),
    ),
  );
}
