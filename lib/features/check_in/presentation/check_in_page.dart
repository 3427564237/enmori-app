import '../check_in_providers.dart';
import '../domain/check_in_mutations.dart';
import 'check_in_edit_page.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/check_in_repository.dart';
import '../../account/domain/account_repository.dart';
import 'check_in_controller.dart';

enum _CheckInAction { create, read }

final class CheckInComposerPage extends ConsumerStatefulWidget {
  const CheckInComposerPage({
    this.onReturnHome,
    this.socialStyle = false,
    this.visibility,
    super.key,
  });

  final VoidCallback? onReturnHome;
  final bool socialStyle;
  final CheckInVisibility? visibility;

  @override
  ConsumerState<CheckInComposerPage> createState() =>
      _CheckInComposerPageState();
}

final class _CheckInComposerPageState
    extends ConsumerState<CheckInComposerPage> {
  late final CheckInController _controller;
  final _noteController = TextEditingController();
  final _scroll = ScrollController();
  CheckIn? _committedCheckIn;
  String? _mood, _activity;
  CheckInVisibility? _visibility;
  _CheckInAction? _lastAction;
  String? _noteErrorText;
  int? _activeOperation;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(checkInControllerProvider.notifier);
  }

  @override
  void dispose() {
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
    final pending = state is CommandPending<CheckIn>;
    final noteLength = _noteController.text.trim().characters.length;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.socialStyle ? 'Check-in' : 'New Check-in'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: SingleChildScrollView(
              controller: _scroll,
              key: const Key('route-check-in'),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.socialStyle) ...[
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.edit_note,
                            size: 36,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Keep a little moment',
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -.5,
                                ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Something you noticed. Something you want to remember.',
                            style: TextStyle(height: 1.6),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    if (widget.visibility case final visibility?)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Chip(
                          avatar: Icon(
                            visibility == CheckInVisibility.private
                                ? Icons.lock_outline
                                : visibility == CheckInVisibility.public
                                ? Icons.public
                                : Icons.people_outline,
                            size: 18,
                          ),
                          label: Text(switch (visibility) {
                            CheckInVisibility.private => 'Private',
                            CheckInVisibility.public => 'Public',
                            CheckInVisibility.friendsOnly => 'Friends only',
                          }),
                        ),
                      ),
                  ] else ...[
                    Text(
                      'New Check-in',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Add a Note or Mood. A Note can contain up to 500 characters.',
                    ),
                  ],
                  const SizedBox(height: 20),
                  ExpansionTile(
                    title: const Text('Mood, activity and visibility'),
                    children: [
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final mood in [
                            'Happy',
                            'Calm',
                            'Focused',
                            'Tired',
                            'Stressed',
                            'Not sure',
                          ])
                            ChoiceChip(
                              label: Text(mood),
                              selected: _mood == mood,
                              onSelected: pending
                                  ? null
                                  : (selected) => setState(() {
                                      _mood = selected ? mood : null;
                                      _noteErrorText = null;
                                    }),
                            ),
                        ],
                      ),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final activity in [
                            'Study',
                            'Fitness',
                            'Social',
                            'Food',
                            'Travel',
                          ])
                            FilterChip(
                              label: Text(activity),
                              selected: _activity == activity,
                              onSelected: pending
                                  ? null
                                  : (selected) => setState(
                                      () => _activity = selected
                                          ? activity
                                          : null,
                                    ),
                            ),
                        ],
                      ),
                      DropdownButtonFormField<CheckInVisibility>(
                        initialValue:
                            widget.visibility ?? CheckInVisibility.private,
                        decoration: const InputDecoration(
                          labelText: 'This Check-in visibility',
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: CheckInVisibility.private,
                            child: Text('Private'),
                          ),
                          DropdownMenuItem(
                            value: CheckInVisibility.friendsOnly,
                            child: Text('Friends-only'),
                          ),
                          DropdownMenuItem(
                            value: CheckInVisibility.public,
                            child: Text('Public'),
                          ),
                        ],
                        onChanged: pending
                            ? null
                            : (value) => setState(() => _visibility = value),
                      ),
                    ],
                  ),
                  TextField(
                    key: const Key('r6-check-in-note'),
                    controller: _noteController,
                    minLines: widget.socialStyle ? 7 : 5,
                    maxLines: widget.socialStyle ? 12 : 8,
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
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    key: const Key('r6-check-in-create'),
                    onPressed: pending ? null : _create,
                    icon: pending && _lastAction == _CheckInAction.create
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_outline),
                    label: const Text('Save Check-in'),
                  ),
                  const SizedBox(height: 20),
                  _statusBlock(state),
                ],
              ),
            ),
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
                label: const Text('Retry confirmation'),
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
    super.key,
  });

  final String checkInId;
  final VoidCallback onReturnHome;

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
                title: 'Confirming your saved Check-in…',
                body: 'Reading backend-only product data.',
              )
            else if (state case CommandSucceeded<CheckIn>(:final value))
              _ResultPanel(
                key: const Key('r6-saved-check-in-confirmed'),
                icon: Icons.verified,
                title: 'Saved Check-in confirmed.',
                body:
                    '${value.note}${value.mood == null ? '' : '\nMood: ${value.mood}'}${value.activity == null ? '' : '\nActivity: ${value.activity}'}\nSaved at ${value.createdAt.toUtc().toIso8601String()}'
                    '${switch (value.checkInVisibility) {
                      CheckInVisibility.private => '\nVisibility: Private',
                      CheckInVisibility.friendsOnly => '\nVisibility: Friends-only',
                      CheckInVisibility.public => '\nVisibility: Public',
                      null => '',
                    }}',
              )
            else if (state case CommandFailed<CheckIn>(:final failure))
              _ResultPanel(
                key: const Key('r6-saved-check-in-unavailable'),
                icon: Icons.sync_problem,
                title: 'Confirmation unavailable',
                body: _confirmationFailureCopy(failure.kind),
                action: FilledButton.icon(
                  key: const Key('r6-saved-check-in-retry-confirmation'),
                  onPressed: _readPersisted,
                  icon: const Icon(Icons.sync),
                  label: const Text('Retry confirmation'),
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
