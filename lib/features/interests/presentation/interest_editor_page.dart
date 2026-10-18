import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/interest_repository.dart';
import 'interest_editor_controller.dart';

final class InterestEditorPage extends ConsumerStatefulWidget {
  const InterestEditorPage({this.onSaved, super.key});

  final ValueChanged<InterestSelection>? onSaved;

  @override
  ConsumerState<InterestEditorPage> createState() => _InterestEditorPageState();
}

final class _InterestEditorPageState extends ConsumerState<InterestEditorPage> {
  late final InterestEditorController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(interestEditorControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    Future<void>.microtask(() => _controller.abandon(resetState: false));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(interestEditorControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Your interests')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: _body(state),
          ),
        ),
      ),
    );
  }

  Widget _body(InterestEditorState state) {
    if (state.phase == InterestEditorPhase.loading ||
        state.phase == InterestEditorPhase.initial) {
      return const Center(
        key: Key('interest-loading'),
        child: CircularProgressIndicator(),
      );
    }
    if (!state.hasLoaded) {
      return _FailurePanel(
        key: const Key('interest-load-failure'),
        message: _failureCopy(state.failure?.kind),
        actionLabel: 'Retry',
        onAction: _load,
      );
    }

    final saving = state.phase == InterestEditorPhase.saving;
    final conflict = state.phase == InterestEditorPhase.conflict;
    return ListView(
      key: const Key('route-interests'),
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Choose up to 10',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text('${state.selectedCount} of 10 selected'),
        Text(
          '${state.options.where((option) => option.lifecycleState == InterestLifecycleState.active).length} available interests',
        ),
        const SizedBox(height: 16),
        if (state.options.isEmpty)
          const Text('No interests are available right now.')
        else
          for (final option in state.options)
            CheckboxListTile(
              key: Key('interest-option-${option.interestTagId}'),
              value: option.isSelected,
              onChanged:
                  saving ||
                      conflict ||
                      (!option.isSelected && !option.canSelect)
                  ? null
                  : (_) => ref
                        .read(interestEditorControllerProvider.notifier)
                        .toggle(option.interestTagId),
              title: Text(option.displayName),
              subtitle: option.lifecycleState == InterestLifecycleState.inactive
                  ? const Text('No longer available — you can remove it.')
                  : null,
              controlAffinity: ListTileControlAffinity.leading,
            ),
        if (state.validationMessage case final message?) ...[
          const SizedBox(height: 12),
          Text(
            message,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (conflict) ...[
          const SizedBox(height: 16),
          _FailurePanel(
            key: const Key('interest-conflict'),
            message: 'Your interests changed. Reload them before saving again.',
            actionLabel: 'Reload interests',
            onAction: _load,
          ),
        ] else if (state.phase == InterestEditorPhase.failed) ...[
          const SizedBox(height: 16),
          _FailurePanel(
            key: const Key('interest-save-failure'),
            message: _failureCopy(state.failure?.kind),
            actionLabel:
                state.failure?.kind == AppFailureKind.interestSelectionInvalid
                ? 'Reload interests'
                : 'Retry save',
            onAction:
                state.failure?.kind == AppFailureKind.interestSelectionInvalid
                ? _load
                : _save,
          ),
        ] else if (state.phase == InterestEditorPhase.saved) ...[
          const SizedBox(height: 16),
          Semantics(
            liveRegion: true,
            child: const Text(
              'Interests saved.',
              key: Key('interest-save-success'),
            ),
          ),
        ],
        const SizedBox(height: 20),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            OutlinedButton(
              key: const Key('interest-clear'),
              onPressed: saving || conflict
                  ? null
                  : () => ref
                        .read(interestEditorControllerProvider.notifier)
                        .clear(),
              child: const Text('Clear selection'),
            ),
            FilledButton.icon(
              key: const Key('interest-save'),
              onPressed: saving || conflict ? null : _save,
              icon: saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(saving ? 'Saving…' : 'Save interests'),
            ),
            if (state.savedSelection case final selection?)
              TextButton(
                key: const Key('interest-done'),
                onPressed: () => widget.onSaved?.call(selection),
                child: const Text('Done'),
              ),
          ],
        ),
      ],
    );
  }

  void _load() {
    if (!mounted) return;
    ref.read(interestEditorControllerProvider.notifier).load();
  }

  void _save() {
    ref.read(interestEditorControllerProvider.notifier).save();
  }

  String _failureCopy(AppFailureKind? kind) => switch (kind) {
    AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
    AppFailureKind.authForbidden => 'This account cannot continue.',
    AppFailureKind.onboardingRequired =>
      'Finish setting up your ENMORI account.',
    AppFailureKind.interestSelectionInvalid => 'One or more selected interests are no longer available. Reload and try again.',
    _ => 'This service is temporarily unavailable. Try again.',
  };
}

final class _FailurePanel extends StatelessWidget {
  const _FailurePanel({
    required this.message,
    required this.actionLabel,
    required this.onAction,
    super.key,
  });

  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message),
            const SizedBox(height: 12),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
      ),
    );
  }
}
