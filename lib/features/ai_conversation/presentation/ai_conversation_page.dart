import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../ai_conversation_providers.dart';

Widget buildAiConversationPage(
  BuildContext context, {
  required VoidCallback onBack,
  required VoidCallback onOpenSettings,
}) => AiConversationPage(onBack: onBack, onOpenSettings: onOpenSettings);

/// LI supplies navigation; the feature retains request and session ownership.
final class AiConversationPage extends ConsumerWidget {
  const AiConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _ConversationPage(
    key: ValueKey(
      ref.watch(aiConversationControllerProvider.select((s) => s.sessionKey)),
    ),
    onBack: onBack,
    onOpenSettings: onOpenSettings,
  );
}

final class _ConversationPage extends ConsumerStatefulWidget {
  const _ConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;

  @override
  ConsumerState<_ConversationPage> createState() => _ConversationPageState();
}

final class _ConversationPageState extends ConsumerState<_ConversationPage>
    with WidgetsBindingObserver {
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  late final AiConversationController _controller;
  late final Object _sessionKey;
  bool _confirming = false;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(aiConversationControllerProvider.notifier);
    _sessionKey = ref.read(aiConversationControllerProvider).sessionKey;
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_ownsCurrentSession) return;
      final state = ref.read(aiConversationControllerProvider);
      if (state.conversationId != null &&
          !state.isBusy &&
          state.phase != AiConversationPhase.deleted &&
          state.phase != AiConversationPhase.deleteUnknown &&
          state.phase != AiConversationPhase.unauthenticated) {
        unawaited(_controller.loadMessages());
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // No deferred callback: disposal must close dispatch before a late token.
    // detach deliberately does not publish Riverpod state during disposal.
    _controller.detach(sessionKey: _sessionKey);
    _message.dispose();
    _messageFocus.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_ownsCurrentSession) return;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _controller.cancel();
    }
  }

  bool get _ownsCurrentSession =>
      mounted &&
      ref.read(aiConversationControllerProvider).sessionKey == _sessionKey;

  Future<void> _navigate(VoidCallback navigate) async {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    final state = ref.read(aiConversationControllerProvider);
    if (state.canCancel) {
      _confirming = true;
      final leave = await _confirm(
        message: 'Leave this conversation?',
        keepLabel: 'Stay',
        actionLabel: 'Request cancel and leave',
        actionKey: 'ai-confirm-leave',
      );
      if (!_ownsCurrentSession) return;
      _confirming = false;
      if (!leave) return;
    }
    if (!_ownsCurrentSession || _leaving) return;
    _leaving = true;
    _message.clear();
    _messageFocus.unfocus();
    _controller.leave();
    try {
      navigate();
    } finally {
      // A Settings push may retain this page below the new route. Returning
      // permits a new explicit action; it never resumes the cancelled request.
      if (_ownsCurrentSession) _leaving = false;
    }
  }

  Future<void> _delete() async {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    if (!ref.read(aiConversationControllerProvider).canDelete) return;
    _confirming = true;
    final confirmed = await _confirm(
      message:
          'Delete this conversation? All messages will be permanently deleted.',
      keepLabel: 'Keep',
      actionLabel: 'Delete',
      actionKey: 'ai-confirm-delete',
    );
    if (!_ownsCurrentSession) return;
    _confirming = false;
    if (!confirmed || !ref.read(aiConversationControllerProvider).canDelete) {
      return;
    }
    _message.clear();
    _messageFocus.unfocus();
    // The controller hides content synchronously, before awaiting DELETE.
    unawaited(_controller.deleteConversation());
  }

  Future<bool> _confirm({
    required String message,
    required String keepLabel,
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
              style: _buttonStyle,
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(keepLabel),
            ),
            TextButton(
              key: Key(actionKey),
              style: _buttonStyle,
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(actionLabel),
            ),
          ],
        ),
      ) ??
      false;

  void _submit({required bool retry}) {
    if (!_ownsCurrentSession ||
        _leaving ||
        _confirming ||
        _message.text.trim().isEmpty) {
      return;
    }
    final state = ref.read(aiConversationControllerProvider);
    if (retry ? !state.canRetry : !state.canSend) return;
    final text = _message.text;
    _message.clear();
    _messageFocus.unfocus();
    unawaited(retry ? _controller.retry(text) : _controller.send(text));
  }

  static const _buttonStyle = ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(48, 48)),
  );

  @override
  Widget build(BuildContext context) {
    ref.listen<AiConversationState>(aiConversationControllerProvider, (
      _,
      next,
    ) {
      if (_ownsCurrentSession &&
          next.phase == AiConversationPhase.unauthenticated) {
        // A Backend auth rejection can precede an observed session replacement.
        // Removing the input widget alone would retain its private draft.
        _message.clear();
        _messageFocus.unfocus();
      }
    });
    final state = ref.watch(aiConversationControllerProvider);
    final hasText = _message.text.trim().isNotEmpty;
    final status = state.statusMessage ?? _statusCopy(state.phase);
    final contentHidden =
        state.phase == AiConversationPhase.deleting ||
        state.phase == AiConversationPhase.deleteUnknown ||
        state.phase == AiConversationPhase.deleted ||
        state.phase == AiConversationPhase.unauthenticated;

    return PopScope<void>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_navigate(widget.onBack));
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            key: const Key('ai-back'),
            tooltip: 'Back',
            onPressed: () => unawaited(_navigate(widget.onBack)),
            icon: const Icon(Icons.arrow_back),
          ),
          actions: [
            IconButton(
              key: const Key('ai-settings'),
              tooltip: 'Settings',
              onPressed: () => unawaited(_navigate(widget.onOpenSettings)),
              icon: const Icon(Icons.settings_outlined),
            ),
          ],
        ),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                key: const Key('route-ai-conversation'),
                padding: const EdgeInsets.all(24),
                children: [
                  Text(
                    'AI Conversation',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  if (status != null) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      key: const Key('ai-status'),
                      liveRegion: true,
                      child: Text(status),
                    ),
                  ],
                  if (state.canCancel) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      key: const Key('ai-cancel'),
                      style: _buttonStyle,
                      onPressed: _controller.cancel,
                      child: const Text('Cancel'),
                    ),
                  ],
                  if (state.canCheckResult) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      key: const Key('ai-check-result'),
                      style: _buttonStyle,
                      onPressed: state.readBusy
                          ? null
                          : () => unawaited(_controller.checkResult()),
                      child: const Text('Check result'),
                    ),
                  ],
                  if (state.canLeaveWithoutRetrying) ...[
                    const SizedBox(height: 12),
                    const Text(
                      'We may not be able to confirm whether this message was '
                      'saved. You can leave without retrying it. Leaving does '
                      'not delete saved messages.',
                      key: Key('ai-recovery-explanation'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      key: const Key('ai-leave-without-retrying'),
                      style: _buttonStyle,
                      onPressed: () => unawaited(_navigate(widget.onBack)),
                      child: const Text('Leave without retrying'),
                    ),
                  ],
                  if (!contentHidden) ...[
                    if (state.conversationId != null) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        key: const Key('ai-reload-messages'),
                        style: _buttonStyle,
                        onPressed: state.readBusy
                            ? null
                            : () => unawaited(_controller.loadMessages()),
                        child: const Text('Reload messages'),
                      ),
                    ],
                    for (final message in state.messages) ...[
                      const SizedBox(height: 16),
                      _MessageTile(message: message),
                    ],
                    if (state.nextCursor case final before?) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        key: const Key('ai-load-earlier'),
                        style: _buttonStyle,
                        onPressed: state.readBusy
                            ? null
                            : () => unawaited(
                                _controller.loadMessages(before: before),
                              ),
                        child: const Text('Load earlier messages'),
                      ),
                    ],
                    const SizedBox(height: 24),
                    TextField(
                      key: const Key('ai-message-input'),
                      controller: _message,
                      focusNode: _messageFocus,
                      enabled: state.canSend || state.canRetry,
                      minLines: 2,
                      maxLines: 6,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        labelText: 'Message',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      key: const Key('ai-send'),
                      style: _buttonStyle,
                      onPressed: state.canSend && hasText
                          ? () => _submit(retry: false)
                          : null,
                      child: const Text('Send'),
                    ),
                    if (state.canRetry) ...[
                      const SizedBox(height: 8),
                      OutlinedButton(
                        key: const Key('ai-retry'),
                        style: _buttonStyle,
                        onPressed: hasText ? () => _submit(retry: true) : null,
                        child: const Text('Retry'),
                      ),
                    ],
                  ],
                  if (state.canDelete && !contentHidden) ...[
                    const SizedBox(height: 24),
                    OutlinedButton(
                      key: const Key('ai-delete'),
                      style: _buttonStyle,
                      onPressed: () => unawaited(_delete()),
                      child: const Text('Delete conversation'),
                    ),
                  ],
                  if (state.phase == AiConversationPhase.deleteUnknown) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      key: const Key('ai-check-delete'),
                      style: _buttonStyle,
                      onPressed: state.readBusy
                          ? null
                          : () => unawaited(_controller.deleteConversation()),
                      child: const Text('Check again'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String? _statusCopy(AiConversationPhase phase) => switch (phase) {
  AiConversationPhase.idle || AiConversationPhase.success => null,
  AiConversationPhase.preparing => 'Sending…',
  AiConversationPhase.waiting => 'Waiting for a reply…',
  AiConversationPhase.limited =>
    'Check-in context is not available under your current permissions.',
  AiConversationPhase.busy => 'AI is busy. Try again later.',
  AiConversationPhase.unavailable =>
    'AI is unavailable right now. Try again later.',
  AiConversationPhase.rejected => 'A reply could not be provided.',
  AiConversationPhase.timedOut =>
    'This request timed out. Check saved messages before trying again.',
  AiConversationPhase.unknown =>
    'We couldn’t confirm the result. Check saved messages before trying again.',
  AiConversationPhase.authorityChanged => 'This reply is no longer available.',
  AiConversationPhase.deleted => 'Conversation deleted.',
  AiConversationPhase.deleting => 'Deleting…',
  AiConversationPhase.deleteUnknown =>
    'Deletion has not been confirmed. Check again.',
  AiConversationPhase.unauthenticated =>
    'Your session has expired. Sign in again.',
};

final class _MessageTile extends StatelessWidget {
  const _MessageTile({required this.message});

  final AiMessage message;

  @override
  Widget build(BuildContext context) => Card(
    key: ValueKey('ai-message-${message.messageId}'),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message.role == AiRole.user ? 'You' : 'AI',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 8),
          Text(
            message.availability == AiAvailability.unavailable
                ? 'This reply is no longer available.'
                : message.text ?? '',
          ),
          const SizedBox(height: 8),
          Text(
            message.persistedAt.toUtc().toIso8601String(),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    ),
  );
}
