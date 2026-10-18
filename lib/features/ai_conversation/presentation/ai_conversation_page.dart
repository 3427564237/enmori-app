import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../ai_conversation_providers.dart';

Widget buildAiConversationPage(
  BuildContext context, {
  required VoidCallback onBack,
  required VoidCallback onOpenSettings,
  VoidCallback? onOpenPersonas,
}) => AiConversationPage(
  onBack: onBack,
  onOpenSettings: onOpenSettings,
  onOpenPersonas: onOpenPersonas,
);

/// LI supplies navigation; the feature retains request and session ownership.
final class AiConversationPage extends ConsumerWidget {
  const AiConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    this.socialStyle = false,
    this.navigationBarBuilder,
    this.onOpenPersonas,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;
  final bool socialStyle;
  final Widget Function(ValueChanged<VoidCallback> navigate)?
  navigationBarBuilder;
  final VoidCallback? onOpenPersonas;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _ConversationPage(
    key: ValueKey(
      ref.watch(aiConversationControllerProvider.select((s) => s.sessionKey)),
    ),
    onBack: onBack,
    onOpenSettings: onOpenSettings,
    socialStyle: socialStyle,
    navigationBarBuilder: navigationBarBuilder,
    onOpenPersonas: onOpenPersonas,
  );
}

final class _ConversationPage extends ConsumerStatefulWidget {
  const _ConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    this.socialStyle = false,
    this.navigationBarBuilder,
    this.onOpenPersonas,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;
  final bool socialStyle;
  final Widget Function(ValueChanged<VoidCallback> navigate)?
  navigationBarBuilder;
  final VoidCallback? onOpenPersonas;

  @override
  ConsumerState<_ConversationPage> createState() => _ConversationPageState();
}

final class _ConversationPageState extends ConsumerState<_ConversationPage>
    with WidgetsBindingObserver {
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  late final AiConversationController _controller;
  late final Object _sessionKey;
  DialogRoute<bool>? _confirmationRoute;
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
    _dismissConfirmation();
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

  Future<void> _navigate(
    VoidCallback navigate, {
    bool explicitUnknownExit = false,
  }) async {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    final state = ref.read(aiConversationControllerProvider);
    if (state.canCancel || (!explicitUnknownExit && state.isBusy)) {
      _confirming = true;
      final leave = await _confirm(
        message: state.canCancel
            ? 'Leave this conversation?'
            : 'The request may still complete. Leave this screen?',
        keepLabel: 'Stay',
        actionLabel: state.canCancel ? 'Request cancel and leave' : 'Leave',
        actionKey: 'ai-confirm-leave',
      );
      if (!_ownsCurrentSession) return;
      _confirming = false;
      if (!leave) return;
    } else if (!explicitUnknownExit && _message.text.isNotEmpty) {
      _confirming = true;
      final discard = await _confirm(
        message: 'Discard unsaved changes?',
        keepLabel: 'Keep editing',
        actionLabel: 'Discard',
        actionKey: 'ai-confirm-discard',
      );
      if (!_ownsCurrentSession) return;
      _confirming = false;
      if (!discard) return;
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

  void _newConversation() {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    final value = _message.value;
    final focused = _messageFocus.hasFocus;
    _controller.startNewConversation();
    // The same editor stays mounted. Switching a determined conversation must
    // preserve an unsent draft, selection and focus just like local rejection.
    _message.value = value;
    if (focused) _messageFocus.requestFocus();
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
  }) async {
    final navigator = Navigator.of(context, rootNavigator: true);
    late final DialogRoute<bool> route;
    void complete(bool confirmed) {
      if (_ownsCurrentSession &&
          identical(_confirmationRoute, route) &&
          route.isCurrent) {
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
            style: _buttonStyle,
            onPressed: () => complete(false),
            child: Text(keepLabel),
          ),
          TextButton(
            key: Key(actionKey),
            style: _buttonStyle,
            onPressed: () => complete(true),
            child: Text(actionLabel),
          ),
        ],
      ),
    );
    _confirmationRoute = route;
    try {
      return await navigator.push<bool>(route) ?? false;
    } finally {
      if (identical(_confirmationRoute, route)) _confirmationRoute = null;
    }
  }

  void _dismissConfirmation() {
    final route = _confirmationRoute;
    _confirmationRoute = null;
    if (route == null) return;
    // Session-key rebuilding disposes this page during a frame. Defer the
    // Navigator mutation, retaining only the exact old route, never a top pop.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (route.isActive) route.navigator?.removeRoute<bool>(route, false);
    });
  }

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
    final sending = retry ? _controller.retry(text) : _controller.send(text);
    // Local validation and exact Retry matching happen synchronously before
    // preparation. Preserve editing when they reject without a new attempt.
    if (_ownsCurrentSession) {
      final admitted = ref.read(aiConversationControllerProvider);
      if (admitted.phase == AiConversationPhase.preparing &&
          admitted.canCancel) {
        _message.clear();
        _messageFocus.unfocus();
      }
    }
    unawaited(sending);
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
        _dismissConfirmation();
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

    if (widget.socialStyle) {
      return _socialScaffold(state, status, contentHidden, hasText);
    }

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
            if (widget.onOpenPersonas case final openPersonas?)
              IconButton(
                key: const Key('ai-personas'),
                tooltip: 'Manage Personas',
                onPressed: () => unawaited(_navigate(openPersonas)),
                icon: const Icon(Icons.person_outline),
              ),
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
                  if (state.canStartNewConversation) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      key: const Key('ai-new-conversation'),
                      style: _buttonStyle,
                      onPressed: _newConversation,
                      child: const Text('New conversation'),
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
                      onPressed: () => unawaited(
                        _navigate(widget.onBack, explicitUnknownExit: true),
                      ),
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

  Widget _socialScaffold(
    AiConversationState state,
    String? status,
    bool contentHidden,
    bool hasText,
  ) {
    final content = <Widget>[
      if (state.messages.isEmpty && !contentHidden) ...[
        const SizedBox(height: 28),
        Center(
          child: Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Icon(
              Icons.auto_awesome_outlined,
              size: 38,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'A little space for you',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -.6),
        ),
        const SizedBox(height: 10),
        const Text(
          'Write a message whenever you feel ready.',
          textAlign: TextAlign.center,
          style: TextStyle(height: 1.6),
        ),
        const SizedBox(height: 28),
      ],
      if (status != null)
        Semantics(
          key: const Key('ai-status'),
          liveRegion: true,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(status, style: const TextStyle(height: 1.5)),
            ),
          ),
        ),
      if (state.canCancel)
        _socialAction('ai-cancel', 'Cancel', _controller.cancel),
      if (state.canCheckResult &&
          state.phase != AiConversationPhase.idle &&
          state.phase != AiConversationPhase.success)
        _socialAction(
          'ai-check-result',
          'Check result',
          state.readBusy ? null : () => unawaited(_controller.checkResult()),
        ),
      if (state.canLeaveWithoutRetrying) ...[
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 12),
          child: Text(
            'We may not be able to confirm whether this message was '
            'saved. You can leave without retrying it. Leaving does '
            'not delete saved messages.',
            key: Key('ai-recovery-explanation'),
          ),
        ),
        _socialAction(
          'ai-leave-without-retrying',
          'Leave without retrying',
          () => unawaited(_navigate(widget.onBack, explicitUnknownExit: true)),
        ),
      ],
      if (!contentHidden) ...[
        for (final message in state.messages)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: _MessageTile(message: message, bubble: true),
          ),
      ],
      if (state.phase == AiConversationPhase.deleteUnknown)
        _socialAction(
          'ai-check-delete',
          'Check again',
          state.readBusy
              ? null
              : () => unawaited(_controller.deleteConversation()),
        ),
    ];
    final composer = Padding(
      key: const Key('ai-pinned-composer'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  key: const Key('ai-message-input'),
                  controller: _message,
                  focusNode: _messageFocus,
                  enabled: state.canSend || state.canRetry,
                  minLines: 1,
                  maxLines: 4,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'Message',
                    hintText: 'Write a message…',
                    alignLabelWithHint: true,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                key: const Key('ai-send'),
                style: _buttonStyle,
                onPressed: state.canSend && hasText
                    ? () => _submit(retry: false)
                    : null,
                child: Semantics(
                  label: 'Send message',
                  child: const ExcludeSemantics(
                    child: Icon(Icons.arrow_upward),
                  ),
                ),
              ),
            ],
          ),
          if (state.canRetry)
            _socialAction(
              'ai-retry',
              'Retry',
              hasText ? () => _submit(retry: true) : null,
            ),
        ],
      ),
    );
    return PopScope<void>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_navigate(widget.onBack));
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: widget.navigationBarBuilder == null,
          leading: widget.navigationBarBuilder == null
              ? IconButton(
                  key: const Key('ai-back'),
                  tooltip: 'Back',
                  onPressed: () => unawaited(_navigate(widget.onBack)),
                  icon: const Icon(Icons.arrow_back),
                )
              : null,
          title: const Text('AI companion'),
          actions: [
            if (widget.onOpenPersonas case final openPersonas?)
              IconButton(
                key: const Key('ai-personas'),
                tooltip: 'Manage Personas',
                onPressed: () => unawaited(_navigate(openPersonas)),
                icon: const Icon(Icons.person_outline),
              ),
            if (state.canStartNewConversation ||
                state.canCheckResult ||
                (!contentHidden && state.conversationId != null))
              PopupMenuButton<String>(
                key: const Key('ai-conversation-actions'),
                tooltip: 'Conversation actions',
                onSelected: _selectSocialAction,
                itemBuilder: (context) => [
                  if (state.canStartNewConversation)
                    const PopupMenuItem(
                      value: 'new',
                      key: Key('ai-new-conversation'),
                      child: Text('New conversation'),
                    ),
                  if (state.canCheckResult)
                    PopupMenuItem(
                      value: 'check',
                      key: const Key('ai-check-result-menu'),
                      enabled: !state.readBusy,
                      child: const Text('Check result'),
                    ),
                  if (!contentHidden && state.conversationId != null)
                    PopupMenuItem(
                      value: 'reload',
                      key: const Key('ai-reload-messages'),
                      enabled: !state.readBusy,
                      child: const Text('Reload messages'),
                    ),
                  if (!contentHidden && state.nextCursor != null)
                    PopupMenuItem(
                      value: 'earlier',
                      key: const Key('ai-load-earlier'),
                      enabled: !state.readBusy,
                      child: const Text('Load earlier messages'),
                    ),
                  if (!contentHidden && state.canDelete)
                    const PopupMenuItem(
                      value: 'delete',
                      key: Key('ai-delete'),
                      child: Text('Delete conversation'),
                    ),
                ],
              ),
            IconButton(
              key: const Key('ai-settings'),
              tooltip: 'Settings',
              onPressed: () => unawaited(_navigate(widget.onOpenSettings)),
              icon: const Icon(Icons.tune),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Column(
                    key: const Key('route-ai-conversation'),
                    children: [
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                          children: content,
                        ),
                      ),
                      if (!contentHidden)
                        // Keep the editor in one stable subtree when the
                        // keyboard opens. A tall draft scrolls locally while
                        // retaining room for the independently lazy history.
                        ConstrainedBox(
                          constraints: BoxConstraints(
                            maxHeight: constraints.maxHeight * .6,
                          ),
                          child: SingleChildScrollView(
                            primary: false,
                            child: composer,
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
        bottomNavigationBar: widget.navigationBarBuilder?.call(
          (navigate) => unawaited(_navigate(navigate)),
        ),
      ),
    );
  }

  void _selectSocialAction(String action) {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    final state = ref.read(aiConversationControllerProvider);
    final hidden = {
      AiConversationPhase.deleting,
      AiConversationPhase.deleteUnknown,
      AiConversationPhase.deleted,
      AiConversationPhase.unauthenticated,
    }.contains(state.phase);
    switch (action) {
      case 'new':
        if (state.canStartNewConversation) _newConversation();
      case 'check':
        if (state.canCheckResult && !state.readBusy) {
          unawaited(_controller.checkResult());
        }
      case 'reload':
        if (!hidden && state.conversationId != null && !state.readBusy) {
          unawaited(_controller.loadMessages());
        }
      case 'earlier':
        if (!hidden && !state.readBusy && state.nextCursor != null) {
          unawaited(_controller.loadMessages(before: state.nextCursor));
        }
      case 'delete':
        if (!hidden && state.canDelete) unawaited(_delete());
    }
  }

  Widget _socialAction(String key, String label, VoidCallback? action) =>
      Padding(
        padding: const EdgeInsets.only(top: 8),
        child: OutlinedButton(
          key: Key(key),
          style: _buttonStyle,
          onPressed: action,
          child: Text(label),
        ),
      );
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
  const _MessageTile({required this.message, this.bubble = false});

  final AiMessage message;
  final bool bubble;

  @override
  Widget build(BuildContext context) {
    if (bubble) {
      final fromUser = message.role == AiRole.user;
      final time = message.persistedAt.toUtc();
      final clock =
          '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')} UTC';
      return Align(
        alignment: fromUser ? Alignment.centerRight : Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: .88,
          child: Container(
            key: ValueKey('ai-message-${message.messageId}'),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: fromUser
                  ? Theme.of(context).colorScheme.primaryContainer
                  : Colors.white,
              border: fromUser
                  ? null
                  : Border.all(
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(fromUser ? 20 : 5),
                topRight: Radius.circular(fromUser ? 5 : 20),
                bottomLeft: const Radius.circular(20),
                bottomRight: const Radius.circular(20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fromUser ? 'You' : 'AI',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  message.availability == AiAvailability.unavailable
                      ? 'This reply is no longer available.'
                      : message.text ?? '',
                  style: const TextStyle(height: 1.6),
                ),
                const SizedBox(height: 10),
                Semantics(
                  label: 'Saved at ${time.toIso8601String()}',
                  child: Text(
                    clock,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return Card(
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
}
