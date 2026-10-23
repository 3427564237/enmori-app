import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../domain/persona.dart';
import 'persona_copy.dart';
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
    child: FocusTraversalGroup(
      policy: OrderedTraversalPolicy(),
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          leading: FocusTraversalOrder(
            order: const NumericFocusOrder(0),
            child: BackButton(
              key: const Key('persona-back'),
              onPressed: onBack,
            ),
          ),
        ),
        body: FocusTraversalOrder(
          order: const NumericFocusOrder(1),
          child: SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: child,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

final class PersonaLoading extends StatelessWidget {
  const PersonaLoading({super.key});

  @override
  Widget build(BuildContext context) => Center(
    child: CircularProgressIndicator(
      semanticsLabel: context.tr('Loading Personas', '正在加载人设'),
    ),
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
                  personaStatusCopy(context, message),
                  key: Key(
                    message == 'Your change was saved.'
                        ? 'persona-saved'
                        : 'persona-status',
                  ),
                ),
              ),
            if (state.isBusy) ...[
              const SizedBox(height: 16),
              LinearProgressIndicator(
                semanticsLabel: context.tr('Saving Persona change', '正在保存人设修改'),
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
                        child: Text(context.tr('Back to Personas', '返回人设')),
                      ),
                    if (pending?.canRetry ?? false)
                      FilledButton(
                        key: const Key('persona-retry-create'),
                        onPressed: state.isLoading ? null : onRetryCreate,
                        child: Text(context.tr('Retry same request', '重试同一请求')),
                      ),
                    OutlinedButton(
                      key: Key(
                        initialFailure ? 'persona-retry' : 'persona-reload',
                      ),
                      onPressed: state.isLoading ? null : onReload,
                      child: Text(
                        initialFailure
                            ? context.tr('Retry', '重试')
                            : pending != null
                            ? context.tr('Reload Personas', '重新加载人设')
                            : context.tr('Reload', '重新加载'),
                      ),
                    ),
                  ],
                ),
              ),
            if (pending?.canEnd ?? false) ...[
              const SizedBox(height: 16),
              Text(
                context.tr(
                  'Review your saved Personas. Ending this request does not mean it failed.',
                  '请核对已保存的人设。结束此请求不代表它已经失败。',
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr('Current saved Personas', '当前已保存的人设'),
                key: Key('persona-reconciled-set'),
              ),
              const SizedBox(height: 8),
              if (state.collection?.items.isEmpty ?? true)
                Text(context.tr('You have no Personas yet.', '你还没有人设。'))
              else
                for (final persona in state.collection!.items) ...[
                  PersonaSummary(persona: persona),
                  Text(
                    state.collection!.activePersonaId == persona.personaId
                        ? context.tr('Active', '已启用')
                        : context.tr('Inactive', '未启用'),
                  ),
                  const SizedBox(height: 8),
                ],
              if (state.collection?.activePersonaId == null)
                Text(
                  context.tr(
                    'No Persona is active. Future AI requests use default presentation until you activate one.',
                    '尚未启用人设。后续 AI 回复将使用默认表达，直到你启用一个人设。',
                  ),
                ),
              const SizedBox(height: 8),
              OutlinedButton(
                key: const Key('persona-end-create'),
                onPressed: state.isBusy || state.isLoading ? null : onEndCreate,
                child: Text(context.tr('End unresolved request', '结束结果未确认的请求')),
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
      Text(
        '${context.tr('Tone', '语气')}: ${personaLabel(context, persona.fields.tone.name)}',
      ),
      Text(
        '${context.tr('Response length', '回复长度')}: ${personaLabel(context, persona.fields.responseLength.name)}',
      ),
      Text(
        '${context.tr('Format', '格式')}: ${personaLabel(context, persona.fields.formatStyle.name)}',
      ),
      for (final entry in persona.fields.expressionFields.entries)
        if (entry.value.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              '${personaLabel(context, _personaFieldLabels[entry.key]!)}: ${entry.value}',
            ),
          ),
    ],
  );
}

const _personaFieldLabels = {
  'relationship': 'Relationship',
  'shortIntroduction': 'Short Introduction',
  'description': 'Description',
  'personality': 'Personality',
  'communicationStyle': 'Communication Style',
  'interests': 'Custom interests',
  'extraInstructions': 'Extra instructions',
};

/// A confirmation belongs to the invoking page, including its session-key
/// lifetime. An old callback must never pop a later page or confirmation.
final class PersonaConfirmation {
  DialogRoute<bool>? _route;
  bool _disposed = false;

  Future<bool> action(
    BuildContext context, {
    required String message,
    required String cancelLabel,
    required String actionLabel,
    required String actionKey,
  }) async {
    if (_disposed || _route != null) return false;
    final navigator = Navigator.of(context, rootNavigator: true);
    late final DialogRoute<bool> route;
    void complete(bool confirmed) {
      if (!_disposed && identical(_route, route) && route.isCurrent) {
        navigator.pop(confirmed);
      }
    }

    route = DialogRoute<bool>(
      context: context,
      themes: InheritedTheme.capture(from: context, to: navigator.context),
      barrierColor:
          DialogTheme.of(context).barrierColor ??
          Theme.of(context).dialogTheme.barrierColor ??
          Colors.black54,
      traversalEdgeBehavior: TraversalEdgeBehavior.closedLoop,
      builder: (_) => AlertDialog(
        scrollable: true,
        content: Text(message),
        actions: [
          TextButton(
            autofocus: true,
            onPressed: () => complete(false),
            child: Text(cancelLabel),
          ),
          FilledButton(
            key: Key(actionKey),
            onPressed: () => complete(true),
            child: Text(actionLabel),
          ),
        ],
      ),
    );
    _route = route;
    try {
      return await navigator.push<bool>(route) ?? false;
    } finally {
      if (identical(_route, route)) _route = null;
    }
  }

  Future<bool> exit(BuildContext context) => action(
    context,
    message: context.tr(
      'The request may still complete. Leave this screen?',
      '请求仍有可能完成。要离开此页面吗？',
    ),
    cancelLabel: context.tr('Stay', '留在此页'),
    actionLabel: context.tr('Leave', '离开'),
    actionKey: 'persona-confirm-leave',
  );

  void dispose() {
    _disposed = true;
    final route = _route;
    _route = null;
    if (route == null) return;
    // Disposing a keyed page can happen while Navigator is building. Remove
    // only this page's old dialog after the frame, even beneath a newer route.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (route.isActive) route.navigator?.removeRoute<bool>(route, false);
    });
  }
}
