import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/presentation/enmori_localizations.dart';
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
                  ? context.tr('Loading Persona…', '正在加载人设…')
                  : collection == null
                  ? context.tr('Persona details unavailable', '人设详情暂不可用')
                  : context.tr(
                      'No active Persona · default presentation',
                      '未启用人设 · 使用默认表达',
                    ))
            : context.tr(
                'Active: ${active.fields.displayName}',
                '当前人设：${active.fields.displayName}',
              ),
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}
