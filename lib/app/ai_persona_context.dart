import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/personas/persona_providers.dart';

/// App composition joins the public Persona state to the conversation drawer.
/// It performs only the existing authorized collection read, never generation.
final class AiPersonaContext extends ConsumerStatefulWidget {
  const AiPersonaContext({super.key});
  @override
  ConsumerState<AiPersonaContext> createState() => _AiPersonaContextState();
}

class _AiPersonaContextState extends ConsumerState<AiPersonaContext> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(personaSessionControllerProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(personaSessionControllerProvider);
    final collection = state.isCurrent ? state.collection : null;
    final active = collection?.items
        .where((p) => p.personaId == collection.activePersonaId)
        .firstOrNull;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(
        active == null
            ? (state.isLoading
                  ? 'Loading Persona…'
                  : collection == null
                  ? 'Persona details unavailable'
                  : 'No active Persona · default presentation')
            : 'Active: ${active.fields.displayName}',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}
