import 'package:flutter/material.dart';

import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../domain/persona_session.dart';

/// Common chrome for the approved isolated Persona surfaces. Navigation stays
/// in the app composition; each page completes its own exit checks first.
final class PersonaPageScaffold extends StatelessWidget {
  const PersonaPageScaffold({
    required this.title,
    required this.onBack,
    required this.child,
    super.key,
  });

  final String title;
  final VoidCallback onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) => PopScope<void>(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) onBack();
    },
    child: Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: BackButton(key: const Key('persona-back'), onPressed: onBack),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: child,
          ),
        ),
      ),
    ),
  );
}

final class PersonaLoading extends StatelessWidget {
  const PersonaLoading({super.key});

  @override
  Widget build(BuildContext context) => const Center(
    child: CircularProgressIndicator(semanticsLabel: 'Loading Personas'),
  );
}

final class PersonaStatusPanel extends StatelessWidget {
  const PersonaStatusPanel({
    required this.state,
    required this.onReload,
    required this.onRetryCreate,
    required this.onEndCreate,
    this.onBack,
    super.key,
  });

  final PersonaSessionState state;
  final VoidCallback onReload;
  final VoidCallback onRetryCreate;
  final VoidCallback onEndCreate;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final pending = state.pendingCreate;
    final message = state.message;
    if (message == null && pending == null && !state.isBusy) {
      return const SizedBox.shrink();
    }
    final initialFailure = state.collection == null && pending == null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message != null)
              Semantics(
                liveRegion: true,
                child: Text(
                  message,
                  key: Key(
                    message == 'Your change was saved.'
                        ? 'persona-saved'
                        : 'persona-status',
                  ),
                ),
              ),
            if (state.isBusy) ...[
              const SizedBox(height: 16),
              const LinearProgressIndicator(
                semanticsLabel: 'Saving Persona change',
              ),
            ],
            if (!state.isBusy &&
                (pending != null || !state.isCurrent || state.failure != null))
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (state.failure?.kind ==
                            AppFailureKind.personaUnavailable &&
                        onBack != null)
                      TextButton(
                        onPressed: onBack,
                        child: const Text('Back to Personas'),
                      ),
                    if (pending?.canRetry ?? false)
                      FilledButton(
                        key: const Key('persona-retry-create'),
                        onPressed: state.isLoading ? null : onRetryCreate,
                        child: const Text('Retry same request'),
                      ),
                    OutlinedButton(
                      key: Key(
                        initialFailure ? 'persona-retry' : 'persona-reload',
                      ),
                      onPressed: state.isLoading ? null : onReload,
                      child: Text(
                        initialFailure
                            ? 'Retry'
                            : pending != null
                            ? 'Reload Personas'
                            : 'Reload',
                      ),
                    ),
                  ],
                ),
              ),
            if (pending?.canEnd ?? false) ...[
              const SizedBox(height: 16),
              const Text(
                'Review your saved Personas. Ending this request does not mean it failed.',
              ),
              const SizedBox(height: 8),
              const Text(
                'Current saved Personas',
                key: Key('persona-reconciled-set'),
              ),
              const SizedBox(height: 8),
              if (state.collection?.items.isEmpty ?? true)
                const Text('You have no Personas yet.')
              else
                for (final persona in state.collection!.items) ...[
                  PersonaSummary(persona: persona),
                  Text(
                    state.collection!.activePersonaId == persona.personaId
                        ? 'Active'
                        : 'Inactive',
                  ),
                  const SizedBox(height: 8),
                ],
              if (state.collection?.activePersonaId == null)
                const Text(
                  'No Persona is active. Future AI requests use default presentation until you activate one.',
                ),
              const SizedBox(height: 8),
              OutlinedButton(
                key: const Key('persona-end-create'),
                onPressed: state.isBusy || state.isLoading ? null : onEndCreate,
                child: const Text('End unresolved request'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final class PersonaSummary extends StatelessWidget {
  const PersonaSummary({required this.persona, super.key});

  final Persona persona;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        persona.fields.displayName,
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 8),
      Text('Tone: ${persona.fields.tone.name}'),
      Text('Response length: ${persona.fields.responseLength.name}'),
      Text('Format: ${persona.fields.formatStyle.name}'),
    ],
  );
}

Future<bool> confirmPersonaAction(
  BuildContext context, {
  required String message,
  required String cancelLabel,
  required String actionLabel,
  required String actionKey,
}) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        content: Text(message),
        actions: [
          TextButton(
            autofocus: true,
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(cancelLabel),
          ),
          FilledButton(
            key: Key(actionKey),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(actionLabel),
          ),
        ],
      ),
    ) ??
    false;

Future<bool> confirmPersonaExit(BuildContext context) => confirmPersonaAction(
  context,
  message: 'The request may still complete. Leave this screen?',
  cancelLabel: 'Stay',
  actionLabel: 'Leave',
  actionKey: 'persona-confirm-leave',
);
