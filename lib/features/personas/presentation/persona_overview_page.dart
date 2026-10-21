import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../persona_providers.dart';
import 'persona_page_parts.dart';

final class PersonaOverviewPage extends ConsumerWidget {
  const PersonaOverviewPage({
    required this.onManage,
    required this.onBack,
    super.key,
  });

  final VoidCallback onManage;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(personaSessionControllerProvider).sessionKey;
    return _PersonaOverview(
      key: ValueKey(session),
      onManage: onManage,
      onBack: onBack,
    );
  }
}

final class _PersonaOverview extends ConsumerStatefulWidget {
  const _PersonaOverview({
    required this.onManage,
    required this.onBack,
    super.key,
  });
  final VoidCallback onManage;
  final VoidCallback onBack;

  @override
  ConsumerState<_PersonaOverview> createState() => _PersonaOverviewState();
}

final class _PersonaOverviewState extends ConsumerState<_PersonaOverview> {
  final _confirmation = PersonaConfirmation();
  bool _checkingExit = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(personaSessionControllerProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _back() async {
    if (_checkingExit) return;
    _checkingExit = true;
    final state = ref.read(personaSessionControllerProvider);
    final leave =
        (!state.isBusy && state.pendingCreate == null) ||
        await _confirmation.exit(context);
    if (!mounted) return;
    _checkingExit = false;
    if (leave &&
        state.sessionKey ==
            ref.read(personaSessionControllerProvider).sessionKey) {
      widget.onBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(personaSessionControllerProvider);
    final controller = ref.read(personaSessionControllerProvider.notifier);
    final collection = state.collection;
    final active = collection?.items
        .where((p) => p.personaId == collection.activePersonaId)
        .firstOrNull;
    return PersonaPageScaffold(
      title: 'Personas',
      onBack: _back,
      child: state.isLoading && collection == null
          ? const PersonaLoading()
          : ListView(
              key: const Key('route-personas'),
              padding: const EdgeInsets.all(16),
              children: [
                PersonaStatusPanel(
                  state: state,
                  onReload: controller.load,
                  onRetryCreate: controller.retryCreate,
                  onEndCreate: controller.endUnresolvedCreate,
                  onBack: _back,
                ),
                if (state.isLoading) const LinearProgressIndicator(),
                if (collection != null && state.isCurrent) ...[
                  if (active != null) ...[
                    Text(
                      'Active Persona',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    PersonaSummary(persona: active),
                  ] else
                    const Text(
                      'No Persona is active. Future AI requests use default presentation until you activate one.',
                      key: Key('persona-no-active'),
                    ),
                  const SizedBox(height: 24),
                ],
                FilledButton(
                  key: const Key('persona-manage'),
                  onPressed: state.isBusy ? null : widget.onManage,
                  child: const Text('Manage Personas'),
                ),
              ],
            ),
    );
  }
}
