import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/check_in_repository.dart';
import 'check_in_controller.dart';

enum _CheckInAction { create, read }

final class CheckInComposerPage extends ConsumerStatefulWidget {
  const CheckInComposerPage({this.onReturnHome, super.key});

  final VoidCallback? onReturnHome;

  @override
  ConsumerState<CheckInComposerPage> createState() =>
      _CheckInComposerPageState();
}

final class _CheckInComposerPageState
    extends ConsumerState<CheckInComposerPage> {
  final _noteController = TextEditingController();
  CheckIn? _committedCheckIn;
  _CheckInAction? _lastAction;
  String? _noteErrorText;

  @override
  void dispose() {
    _noteController.dispose();
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
    });

    final state = ref.watch(checkInControllerProvider);
    final pending = state is CommandPending<CheckIn>;
    final noteLength = _noteController.text.trim().characters.length;
    return Scaffold(
      appBar: AppBar(title: const Text('New Check-in')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              key: const Key('route-check-in'),
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Note-only Check-in',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text('Write a note between 1 and 500 characters.'),
                const SizedBox(height: 20),
                TextField(
                  key: const Key('r6-check-in-note'),
                  controller: _noteController,
                  minLines: 5,
                  maxLines: 8,
                  maxLength: 500,
                  onChanged: (_) => setState(() => _noteErrorText = null),
                  decoration: InputDecoration(
                    alignLabelWithHint: true,
                    errorText: _noteErrorText,
                    helperText: '$noteLength / 500 characters',
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
            ? 'Reading the saved Check-in from backend-only product data.'
            : 'Saving your Check-in with the approved backend operation.',
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
          '${checkIn.note}\nSaved at ${checkIn.createdAt.toUtc().toIso8601String()}',
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
    if (noteLength == 0) {
      setState(() => _noteErrorText = 'Enter a Note before saving.');
      return;
    }
    if (noteLength > 500) {
      setState(() => _noteErrorText = 'Keep the Note within 500 characters.');
      return;
    }
    _lastAction = _CheckInAction.create;
    ref.read(checkInControllerProvider.notifier).create(note: normalized);
  }

  void _confirm(CheckIn checkIn) {
    _lastAction = _CheckInAction.read;
    ref
        .read(checkInControllerProvider.notifier)
        .readPersisted(checkInId: checkIn.checkInId);
  }

  String _createFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInInvalid => 'Enter a Note before saving.',
      AppFailureKind.idempotencyConflict =>
        'This Check-in attempt changed after it was submitted. Start a new attempt.',
      _ => "We couldn't save this Check-in yet.",
    };
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => 'This Check-in is unavailable.',
      _ => "We couldn't confirm this Check-in yet.",
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _readPersisted());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved Check-in')),
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
                    '${value.note}\nSaved at ${value.createdAt.toUtc().toIso8601String()}',
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
    ref
        .read(checkInControllerProvider.notifier)
        .readPersisted(checkInId: widget.checkInId);
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => 'This Check-in is unavailable.',
      _ => "We couldn't confirm this Check-in yet.",
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
