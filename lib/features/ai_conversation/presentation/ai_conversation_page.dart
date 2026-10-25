import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import '../../../core/presentation/local_time.dart';

import '../ai_conversation_providers.dart';
import '../ai_owned_sources_providers.dart';
import '../ai_selected_sources_providers.dart';
import '../../proactive/domain/proactive.dart';
import 'ai_plan_draft_page.dart';
import 'ai_message_search_page.dart';
import 'ai_selected_sources_page.dart';
import 'ai_status_copy.dart';
import 'ai_visible_message.dart';

Widget buildAiConversationPage(
  BuildContext context, {
  required VoidCallback onBack,
  required VoidCallback onOpenSettings,
  VoidCallback? onOpenPersonas,
  ValueChanged<SavedFollowUpSource>? onFollowUpRequested,
  VoidCallback? onOpenFollowUps,
  AiMessageLocator? initialMessage,
  String? initialCheckInId,
  Object? initialCheckInSessionKey,
  ValueChanged<AiSourceTarget>? onOpenSourceTarget,
}) => AiConversationPage(
  onBack: onBack,
  onOpenSettings: onOpenSettings,
  onOpenPersonas: onOpenPersonas,
  onFollowUpRequested: onFollowUpRequested,
  onOpenFollowUps: onOpenFollowUps,
  initialMessage: initialMessage,
  initialCheckInId: initialCheckInId,
  initialCheckInSessionKey: initialCheckInSessionKey,
  onOpenSourceTarget: onOpenSourceTarget,
);

/// LI supplies navigation; the feature retains request and session ownership.
final class AiConversationPage extends ConsumerWidget {
  const AiConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    this.socialStyle = false,
    this.navigationBarBuilder,
    this.onOpenPersonas,
    this.personaContext,
    this.onFollowUpRequested,
    this.onOpenFollowUps,
    this.initialMessage,
    this.initialCheckInId,
    this.initialCheckInSessionKey,
    this.onOpenSourceTarget,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;
  final bool socialStyle;
  final Widget Function(ValueChanged<VoidCallback> navigate)?
  navigationBarBuilder;
  final VoidCallback? onOpenPersonas;
  final Widget? personaContext;
  final ValueChanged<SavedFollowUpSource>? onFollowUpRequested;
  final VoidCallback? onOpenFollowUps;
  final AiMessageLocator? initialMessage;
  final String? initialCheckInId;
  final Object? initialCheckInSessionKey;
  final ValueChanged<AiSourceTarget>? onOpenSourceTarget;

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
    personaContext: personaContext,
    onFollowUpRequested: onFollowUpRequested,
    onOpenFollowUps: onOpenFollowUps,
    initialMessage: initialMessage,
    initialCheckInId: initialCheckInId,
    initialCheckInSessionKey: initialCheckInSessionKey,
    onOpenSourceTarget: onOpenSourceTarget,
  );
}

final class _ConversationPage extends ConsumerStatefulWidget {
  const _ConversationPage({
    required this.onBack,
    required this.onOpenSettings,
    this.socialStyle = false,
    this.navigationBarBuilder,
    this.onOpenPersonas,
    this.personaContext,
    this.onFollowUpRequested,
    this.onOpenFollowUps,
    this.initialMessage,
    this.initialCheckInId,
    this.initialCheckInSessionKey,
    this.onOpenSourceTarget,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onOpenSettings;
  final bool socialStyle;
  final Widget Function(ValueChanged<VoidCallback> navigate)?
  navigationBarBuilder;
  final VoidCallback? onOpenPersonas;
  final Widget? personaContext;
  final ValueChanged<SavedFollowUpSource>? onFollowUpRequested;
  final VoidCallback? onOpenFollowUps;
  final AiMessageLocator? initialMessage;
  final String? initialCheckInId;
  final Object? initialCheckInSessionKey;
  final ValueChanged<AiSourceTarget>? onOpenSourceTarget;

  @override
  ConsumerState<_ConversationPage> createState() => _ConversationPageState();
}

final class _ConversationPageState extends ConsumerState<_ConversationPage>
    with WidgetsBindingObserver {
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _historyScroll = ScrollController();
  final _latestVisible = ValueNotifier(false);
  bool _latestUpdatePending = false;
  int _scrollGeneration = 0;
  late final AiConversationController _controller;
  late final Object _sessionKey;
  DialogRoute<bool>? _confirmationRoute;
  bool _confirming = false;
  bool _leaving = false;
  bool _planning = false;
  bool _finding = false;
  bool _choosingReferences = false;
  bool _initialCheckInHandled = false;
  bool _initialLocationDismissed = false;
  final _messageKeys = <String, GlobalKey>{};
  final Object _editorToken = Object();
  bool? _routeCurrent;
  bool _syncingEditor = false;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(aiConversationControllerProvider.notifier);
    _sessionKey = ref.read(aiConversationControllerProvider).sessionKey;
    _message.value = _controller.draftFor(_sessionKey);
    _message.addListener(() {
      if (!_syncingEditor && _isCurrentEditor) {
        _controller.updateDraft(
          _message.value,
          sessionKey: _sessionKey,
          editor: _editorToken,
        );
      }
    });
    WidgetsBinding.instance.addObserver(this);
    _historyScroll.addListener(_updateLatestVisibility);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!_ownsCurrentSession) return;
      final state = ref.read(aiConversationControllerProvider);
      if (widget.initialMessage case final target?) {
        unawaited(_openMessage(target));
        return;
      }
      if (state.messageLocation != null) _controller.dismissMessageLocation();
      if (widget.socialStyle &&
          (state.messages.isNotEmpty || state.localOutgoingText != null)) {
        _jumpToLatest();
      }
      if (state.conversationId != null &&
          !state.isBusy &&
          state.phase != AiConversationPhase.deleted &&
          state.phase != AiConversationPhase.deleteUnknown &&
          state.phase != AiConversationPhase.unauthenticated) {
        await _controller.loadMessages();
        if (!_ownsCurrentSession) return;
      }
      if (ref.read(aiCompanionReferencesEnabledProvider)) {
        unawaited(
          ref.read(aiOwnedSourcesControllerProvider.notifier).checkReadState(),
        );
      }
      if (_isCurrentEditor && widget.initialCheckInId != null) {
        await _openReferences(initialCheckInId: widget.initialCheckInId);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final current = ModalRoute.of(context)?.isCurrent == true;
    final returning = _routeCurrent == false && current;
    _routeCurrent = current;
    if (!current || !_ownsCurrentSession) return;
    _controller.claimDraftEditor(_editorToken, sessionKey: _sessionKey);
    if (returning) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_isCurrentEditor) return;
        _syncingEditor = true;
        _message.value = _controller.draftFor(_sessionKey);
        _syncingEditor = false;
        setState(() => _initialLocationDismissed = true);
        final location = ref
            .read(aiConversationControllerProvider)
            .messageLocation;
        if (location?.phase == AiMessageLocationPhase.ready) {
          _revealLocatedMessage(location!.locator.messageId);
        }
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _dismissConfirmation();
    _controller.releaseDraftEditor(_editorToken);
    // The session owns the request and draft; route removal only releases UI.
    _message.dispose();
    _messageFocus.dispose();
    _historyScroll.dispose();
    _latestVisible.dispose();
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

  @override
  void didChangeMetrics() {
    // Capture bottom proximity before keyboard/viewport layout changes.
    if (widget.socialStyle && _ownsCurrentSession) {
      _followMessages(null, ref.read(aiConversationControllerProvider));
    }
  }

  bool get _ownsCurrentSession =>
      mounted &&
      ref.read(aiConversationControllerProvider).sessionKey == _sessionKey;
  bool get _isCurrentEditor =>
      _ownsCurrentSession &&
      ModalRoute.of(context)?.isCurrent == true &&
      _controller.ownsDraftEditor(_editorToken, sessionKey: _sessionKey);

  void _backFromChat() {
    if (!_ownsCurrentSession) return;
    final scaffold = _scaffoldKey.currentState;
    if (scaffold?.isDrawerOpen == true) {
      scaffold!.closeDrawer();
      return;
    }
    unawaited(_navigate(widget.onBack));
  }

  Future<void> _navigate(
    VoidCallback navigate, {
    bool explicitUnknownExit = false,
  }) async {
    if (!_isCurrentEditor || _confirming || _leaving) return;
    _leaving = true;
    _messageFocus.unfocus();
    if (explicitUnknownExit) {
      _message.clear();
      _controller.leave();
    }
    try {
      navigate();
    } finally {
      if (_ownsCurrentSession) _leaving = false;
    }
  }

  void _newConversation() {
    if (!_isCurrentEditor || _confirming || _leaving) return;
    _initialLocationDismissed = true;
    final value = _message.value;
    final focused = _messageFocus.hasFocus;
    _controller.startNewConversation();
    // The same editor stays mounted. Switching a determined conversation must
    // preserve an unsent draft, selection and focus just like local rejection.
    _message.value = value;
    if (focused) _messageFocus.requestFocus();
  }

  Future<void> _makePlan() async {
    if (!_isCurrentEditor || _planning || _confirming || _leaving) return;
    final before = ref.read(aiConversationControllerProvider);
    if (!before.canSend) return;
    final original = _message.value;
    _planning = true;
    _messageFocus.unfocus();
    final draft = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => AiPlanDraftPage(initialText: original.text),
      ),
    );
    if (!_ownsCurrentSession) return;
    _planning = false;
    final current = ref.read(aiConversationControllerProvider);
    if (draft == null ||
        !current.canSend ||
        current.conversationId != before.conversationId ||
        _message.value != original) {
      return;
    }
    setState(() {
      _message.value = TextEditingValue(
        text: draft,
        selection: TextSelection.collapsed(offset: draft.length),
      );
    });
    _messageFocus.requestFocus();
  }

  Widget _planAction(AiConversationState state) => Align(
    alignment: Alignment.centerLeft,
    child: TextButton.icon(
      key: const Key('ai-make-plan'),
      onPressed: state.canSend ? _makePlan : null,
      icon: const Icon(Icons.checklist_outlined),
      label: Text(context.tr('Make a small plan', '制定小计划')),
    ),
  );

  bool get _selectionReady {
    if (!ref.read(aiCompanionReferencesEnabledProvider)) return true;
    final selection = ref.read(aiSelectedSourcesControllerProvider);
    return !selection.active ||
        ref.read(aiSelectedSourcesControllerProvider.notifier).canSubmit;
  }

  Future<void> _openReferences({String? initialCheckInId}) async {
    if (!_isCurrentEditor ||
        _choosingReferences ||
        _confirming ||
        _leaving ||
        !ref.read(aiCompanionReferencesEnabledProvider)) {
      return;
    }
    final state = ref.read(aiConversationControllerProvider);
    if (state.canCancel) return;
    if (initialCheckInId != null) {
      if (_initialCheckInHandled ||
          widget.initialCheckInSessionKey != _sessionKey ||
          (!state.canSend && !state.canRetry) ||
          state.readBusy) {
        return;
      }
      _initialCheckInHandled = true;
    }
    _choosingReferences = true;
    _messageFocus.unfocus();
    try {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) =>
              AiSelectedSourcesPage(initialCheckInId: initialCheckInId),
        ),
      );
    } finally {
      if (mounted) _choosingReferences = false;
    }
  }

  Widget _referencesAction(AiConversationState state) {
    if (!ref.read(aiCompanionReferencesEnabledProvider)) {
      return const SizedBox.shrink();
    }
    final selected = ref.read(aiSelectedSourcesControllerProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.initialCheckInId != null && !_initialCheckInHandled) ...[
          Text(
            context.tr(
              'The requested Check-in has not been added. Check the current conversation or original operation before attaching it.',
              '请求的签到尚未附加。请先核对当前对话或原操作，再明确附加。',
            ),
            key: const Key('ai-requested-check-in-pending'),
          ),
          TextButton(
            key: const Key('ai-attach-requested-check-in'),
            onPressed:
                widget.initialCheckInSessionKey == _sessionKey &&
                    (state.canSend || state.canRetry) &&
                    !state.readBusy
                ? () => unawaited(
                    _openReferences(initialCheckInId: widget.initialCheckInId),
                  )
                : null,
            child: Text(context.tr('Attach the requested Check-in', '附加请求的签到')),
          ),
        ],
        TextButton.icon(
          key: const Key('ai-references'),
          onPressed:
              !state.canCancel &&
                  (state.canSend || state.canRetry || selected.active)
              ? () => unawaited(_openReferences())
              : null,
          icon: const Icon(Icons.fact_check_outlined),
          label: Text(
            selected.active
                ? selected.mode==AiReferenceMode.today
                  ?context.tr("Today's Check-ins · local references",'今天的签到 · 本地参考')
                  :selected.mode==AiReferenceMode.off
                  ?context.tr('Check-in references off for this topic','本话题签到参考已关闭')
                  : context.tr(
                    'References: ${selected.selectedIds.length} selected',
                    '本次参考：已选 ${selected.selectedIds.length} 条',
                  )
                : context.tr('References for this reply', '本次参考'),
          ),
        ),
        if (selected.active)
          Padding(
            padding: const EdgeInsets.only(left: 12, bottom: 8),
            child: Text(
              selected.reviewRequired
                  ?aiSelectionNoticeCopy(context,AiSelectionNotice.conflict)
                  :{AiSelectionNotice.unknown,AiSelectionNotice.unavailable}.contains(selected.notice)
                  ?aiSelectionNoticeCopy(context,selected.notice)
                  :selected.mode==AiReferenceMode.today
                  ?context.tr('Uses up to the latest 5 from today when you send.','发送时最多参考今天最近 5 条。')
                  :selected.mode==AiReferenceMode.off
                  ?context.tr('You can still chat.','仍可正常聊天。')
                  :selected.confirmed &&
                      ref
                          .read(aiSelectedSourcesControllerProvider.notifier)
                          .canSend
                  ? context.tr(
                      'Reviewed for this local reply. Send when ready.',
                      '已审阅，仅用于本次本地回复。准备好后明确发送。',
                    )
                  : {
                      AiSelectionNotice.none,
                      AiSelectionNotice.recheck,
                      AiSelectionNotice.expired,
                    }.contains(selected.notice)
                  ? context.tr(
                      'References will be checked when you send. Your draft is kept if they change.',
                      '发送时会核对本次参考；来源变化时会保留草稿。',
                    )
                  : aiSelectionNoticeCopy(
                      context,
                      selected.notice == AiSelectionNotice.none
                          ? AiSelectionNotice.recheck
                          : selected.notice,
                    ),
              key: const Key('ai-reference-status'),
            ),
          ),
      ],
    );
  }

  Future<void> _findMessages() async {
    if (!_ownsCurrentSession ||
        _finding ||
        _confirming ||
        _leaving ||
        !canFindAiMessages(ref.read(aiConversationControllerProvider))) {
      return;
    }
    _finding = true;
    _messageFocus.unfocus();
    try {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(builder: (_) => const AiMessageSearchPage()),
      );
    } finally {
      if (mounted) _finding = false;
    }
  }

  void _openHistoryMenu() {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    if (!ref.read(aiConversationControllerProvider).canBrowseHistory) return;
    _scaffoldKey.currentState?.openDrawer();
  }

  VoidCallback? _followUpAction(AiConversationState state, AiMessage message) {
    if (widget.onFollowUpRequested == null ||
        !state.canSelectConversation ||
        state.conversationId == null ||
        SavedFollowUpSource.fromMessage(
              conversationId: state.conversationId!,
              message: message,
            ) ==
            null) {
      return null;
    }
    final conversation = state.conversationId;
    return () {
      if (!_ownsCurrentSession || _confirming || _leaving) return;
      final current = ref.read(aiConversationControllerProvider);
      if (!current.canSelectConversation ||
          current.conversationId != conversation) {
        return;
      }
      final matches = current.messages.where(
        (m) => m.messageId == message.messageId,
      );
      if (matches.length != 1) return;
      final source = SavedFollowUpSource.fromMessage(
        conversationId: conversation!,
        message: matches.single,
      );
      final open = widget.onFollowUpRequested;
      if (source == null || open == null) return;
      unawaited(_navigate(() => open(source)));
    };
  }

  Future<void> _chooseLaterContact() async {
    if(!_isCurrentEditor || _confirming || _leaving) return;
    final initial=ref.read(aiConversationControllerProvider);
    final topic=initial.conversationId,session=initial.sessionKey;
    _messageFocus.unfocus();
    final id=await showModalBottomSheet<String>(context:context,isScrollControlled:true,
      builder:(sheet)=>Consumer(builder:(context,viewRef,_) {
        final current=viewRef.watch(aiConversationControllerProvider);
        final sources=viewRef.watch(aiCompanionReferencesEnabledProvider)?
          viewRef.watch(aiOwnedSourcesControllerProvider):null;
        final allowed=current.sessionKey==session && current.conversationId==topic &&
          current.canSelectConversation;
        final choices=allowed?current.messages.where((message)=>
          canDisplayAiMessage(current,message,sources:sources) && topic!=null &&
          SavedFollowUpSource.fromMessage(conversationId:topic,message:message)!=null).toList():<AiMessage>[];
        return SafeArea(child:SizedBox(height:MediaQuery.sizeOf(context).height*.7,
          child:ListView(padding:const EdgeInsets.all(20),children:[
            Text(context.tr('Ask me later','稍后联系我'),style:Theme.of(context).textTheme.titleLarge),
            Text(context.tr('Choose a sent message in this topic and set when to contact you.',
              '选择本话题一条已发送的消息，设置稍后联系的时间。')),
            if(!allowed) Text(context.tr('Check the last send or return to the current topic before choosing a message.',
              '请先核对上次发送，或返回当前话题后再选择消息。'))
            else if(choices.isEmpty) Text(context.tr('Send a message in this topic first, then choose it here.',
              '先在本话题发送一条消息，再在这里选择它。')),
            for(final message in choices) ListTile(key:Key('ai-later-source-${message.messageId}'),
              title:Text(message.text!,maxLines:3,overflow:TextOverflow.ellipsis),
              subtitle:Text(localTimeLabel(context,message.persistedAt)),
              onTap:() {
                if(!context.mounted || ModalRoute.of(context)?.isCurrent!=true) return;
                final live=viewRef.read(aiConversationControllerProvider);
                if(live.sessionKey!=session || live.conversationId!=topic || !live.canSelectConversation) return;
                final liveSources=viewRef.read(aiCompanionReferencesEnabledProvider)?
                  viewRef.read(aiOwnedSourcesControllerProvider):null;
                final found=live.messages.where((item)=>item.messageId==message.messageId);
                if(found.length!=1 || !canDisplayAiMessage(live,found.single,sources:liveSources)) return;
                Navigator.of(sheet).pop(message.messageId);
              }),
            TextButton(onPressed:()=>Navigator.of(sheet).pop(),child:Text(context.tr('Back to chat','返回对话'))),
          ])));
      }));
    if(!_isCurrentEditor || id==null) return;
    final current=ref.read(aiConversationControllerProvider);
    if(current.sessionKey!=session || current.conversationId!=topic) return;
    final messages=current.messages.where((message)=>message.messageId==id);
    final currentSources=ref.read(aiCompanionReferencesEnabledProvider)?ref.read(aiOwnedSourcesControllerProvider):null;
    if(messages.length==1 && canDisplayAiMessage(current,messages.single,sources:currentSources))
      _followUpAction(current,messages.single)?.call();
  }

  Future<void> _openConversation(String id) async {
    if (!_isCurrentEditor ||
        _confirming ||
        _leaving ||
        !ref.read(aiConversationControllerProvider).canSelectConversation) {
      return;
    }
    // The current topic is already open. Do not discard its draft, reread it
    // or reset its request state merely because its History row was selected.
    if (ref.read(aiConversationControllerProvider).conversationId == id) return;
    if (_message.text.isNotEmpty) {
      _confirming = true;
      final discard = await _confirm(
        message: context.tr('Discard unsaved changes?', '放弃未保存的修改？'),
        keepLabel: context.tr('Keep editing', '继续编辑'),
        actionLabel: context.tr('Discard', '放弃修改'),
        actionKey: 'ai-confirm-discard',
      );
      if (!_ownsCurrentSession) return;
      _confirming = false;
      if (!discard) return;
    }
    _message.clear();
    _initialLocationDismissed = true;
    _messageFocus.unfocus();
    _scrollGeneration++;
    if (_historyScroll.hasClients) _historyScroll.jumpTo(0);
    await _controller.selectConversation(id);
  }

  Future<void> _openMessage(AiMessageLocator target) async {
    if (!_isCurrentEditor || _confirming || _leaving) return;
    final before = ref.read(aiConversationControllerProvider);
    if (!before.canSelectConversation) return;
    if (before.conversationId != target.conversationId &&
        _message.text.isNotEmpty) {
      _confirming = true;
      final discard = await _confirm(
        message: context.tr('Discard unsaved changes?', '放弃未保存的修改？'),
        keepLabel: context.tr('Keep editing', '继续编辑'),
        actionLabel: context.tr('Discard', '放弃修改'),
        actionKey: 'ai-confirm-discard',
      );
      if (!_ownsCurrentSession) return;
      _confirming = false;
      if (!discard) {
        setState(() => _initialLocationDismissed = true);
        return;
      }
      _message.clear();
    }
    _messageFocus.unfocus();
    _scrollGeneration++;
    await _controller.openMessage(target);
    if (!_ownsCurrentSession) return;
    final current = ref.read(aiConversationControllerProvider);
    if (current.messageLocation != null) {
      setState(() => _initialLocationDismissed = true);
    }
    if (current.messageLocation?.phase == AiMessageLocationPhase.ready) {
      _revealLocatedMessage(target.messageId);
      unawaited(
        ref.read(aiOwnedSourcesControllerProvider.notifier).checkReadState(),
      );
    }
  }

  void _revealLocatedMessage(String messageId) {
    final generation = ++_scrollGeneration;
    void reveal(int remaining) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_ownsCurrentSession ||
            generation != _scrollGeneration ||
            !_historyScroll.hasClients) {
          return;
        }
        final target = _messageKeys[messageId]?.currentContext;
        if (target != null) {
          unawaited(Scrollable.ensureVisible(target, alignment: .4));
          return;
        }
        if (remaining <= 0) return;
        // The verified anchor page ends at this exact sequence. This bounded
        // layout reveal does not fetch or navigate to a global Latest page.
        _historyScroll.jumpTo(_historyScroll.position.maxScrollExtent);
        reveal(remaining - 1);
      });
      WidgetsBinding.instance.scheduleFrame();
    }

    reveal(6);
  }

  Future<void> _openSource(AiMessage message, AiSourceCard card) async {
    if (!_ownsCurrentSession || ModalRoute.of(context)?.isCurrent != true) {
      return;
    }
    final target = await ref
        .read(aiOwnedSourcesControllerProvider.notifier)
        .resolve(message.messageId, card);
    if (!mounted ||
        !_ownsCurrentSession ||
        ModalRoute.of(context)?.isCurrent != true ||
        target == null) {
      return;
    }
    if (target case AiConversationMessageTarget(:final anchor)) {
      await _openMessage(anchor.locator);
    } else {
      final open = widget.onOpenSourceTarget;
      if (open != null) await _navigate(() => open(target));
    }
  }

  Widget _messageTile(
    AiConversationState conversation,
    AiMessage message, {
    bool bubble = false,
  }) {
    final enabled = ref.read(aiCompanionReferencesEnabledProvider);
    final sources = enabled
        ? ref.watch(aiOwnedSourcesControllerProvider)
        : null;
    final hidden =
        message.availability == AiAvailability.available &&
        message.text != null &&
        !canDisplayAiMessage(conversation, message, sources: sources);
    final located = conversation.messageLocation;
    final focused =
        located?.phase == AiMessageLocationPhase.ready &&
        located?.locator.messageId == message.messageId &&
        located?.sequence == message.sequence;
    final tile = _MessageTile(
      message: message,
      bubble: bubble,
      onFollowUp: _followUpAction(conversation, message),
      sourcePending: hidden,
      onCheckSource: hidden && conversation.canSelectConversation
          ? () => unawaited(
              _openMessage(
                AiMessageLocator(
                  conversationId: conversation.conversationId!,
                  messageId: message.messageId,
                ),
              ),
            )
          : null,
      unread: sources?.isUnread(message) == true,
      onSource: enabled && !hidden && sources?.resolvingCardRef == null
          ? (card) => unawaited(_openSource(message, card))
          : null,
      onReply:
          enabled &&
              !hidden &&
              message.isProactive &&
              message.availability == AiAvailability.available &&
              conversation.canSend
          ? () {
              if (!_isCurrentEditor) return;
              _controller.replyToFollowUp(message.messageId);
              _messageFocus.requestFocus();
            }
          : null,
      onVisible:
          enabled &&
              !hidden &&
              message.isProactive &&
              message.availability == AiAvailability.available
          ? () {
              if (_ownsCurrentSession &&
                  !_confirming &&
                  _scaffoldKey.currentState?.isDrawerOpen != true) {
                unawaited(
                  ref
                      .read(aiOwnedSourcesControllerProvider.notifier)
                      .markActuallyVisible(message.messageId),
                );
              }
            }
          : null,
    );
    return Container(
      key: _messageKeys.putIfAbsent(message.messageId, GlobalKey.new),
      decoration: focused
          ? BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.primary,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(12),
            )
          : null,
      child: Semantics(
        label: focused ? context.tr('Located message', '已定位消息') : null,
        child: tile,
      ),
    );
  }

  Widget _referenceStatus(AiConversationState conversation) {
    if (!ref.read(aiCompanionReferencesEnabledProvider)) {
      return const SizedBox.shrink();
    }
    final sources = ref.watch(aiOwnedSourcesControllerProvider);
    final location = conversation.messageLocation;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (location == null &&
            widget.initialMessage != null &&
            !_initialLocationDismissed) ...[
          Text(
            context.tr(
              'Check the current request before opening this message.',
              '请先核对当前请求，再打开这条消息。',
            ),
          ),
          OutlinedButton(
            key: const Key('ai-open-requested-message'),
            onPressed: conversation.canSelectConversation
                ? () => unawaited(_openMessage(widget.initialMessage!))
                : null,
            child: Text(context.tr('Open this exact message', '打开这条消息')),
          ),
        ],
        if (location != null &&
            location.phase != AiMessageLocationPhase.ready) ...[
          Text(
            location.phase == AiMessageLocationPhase.checking
                ? context.tr('Checking this exact message…', '正在核对这条消息…')
                : context.tr(
                    'This message could not be located. No other message was opened.',
                    '暂时无法定位这条消息，未转到其他消息。',
                  ),
            key: const Key('ai-message-location-status'),
          ),
          if (location.phase == AiMessageLocationPhase.failed)
            OutlinedButton(
              key: const Key('ai-retry-message-location'),
              onPressed: conversation.canSelectConversation
                  ? () => unawaited(_openMessage(location.locator))
                  : null,
              child: Text(context.tr('Check this message again', '重新核对这条消息')),
            ),
          TextButton(
            key: const Key('ai-return-current-topic'),
            onPressed: () {
              if (!_isCurrentEditor) return;
              setState(() => _initialLocationDismissed = true);
              _controller.dismissMessageLocation();
            },
            child: Text(context.tr('Return to the current topic', '返回当前话题')),
          ),
        ],
        if (conversation.conversationId != null &&
            (sources.sourcesNeedRead || sources.hiddenMessageIds.isNotEmpty))
          OutlinedButton(
            key: const Key('ai-reload-references'),
            onPressed: conversation.readBusy
                ? null
                : () => unawaited(_controller.loadMessages()),
            child: Text(
              context.tr('Check saved messages and sources', '核对已保存的消息与来源'),
            ),
          ),
        if (sources.failure != null)
          Text(
            context.tr(
              'The source or reading status could not be verified. Your draft is kept.',
              '暂时无法核对来源或阅读状态，草稿仍保留。',
            ),
            key: const Key('ai-reference-failure'),
          ),
        if (sources.readUnconfirmed)
          Text(
            context.tr(
              'Opened. Read status has not synced yet.',
              '已打开，阅读状态尚未同步。',
            ),
            key: const Key('ai-read-unconfirmed'),
          ),
        if (conversation.conversationId != null &&
            (sources.readState == null || sources.readUnconfirmed))
          OutlinedButton(
            key: const Key('ai-check-read-state'),
            onPressed: sources.readBusy
                ? null
                : () => unawaited(
                    ref
                        .read(aiOwnedSourcesControllerProvider.notifier)
                        .checkReadState(),
                  ),
            child: Text(context.tr('Check reading status', '核对阅读状态')),
          ),
      ],
    );
  }

  Widget _replyStatus(AiConversationState state) =>
      state.replyToMessageId == null
      ? const SizedBox.shrink()
      : Row(
          children: [
            Expanded(
              child: TextButton(
                key: const Key('ai-view-reply-follow-up'),
                onPressed: state.canSelectConversation
                    ? () => unawaited(
                        _openMessage(
                          AiMessageLocator(
                            conversationId: state.conversationId!,
                            messageId: state.replyToMessageId!,
                          ),
                        ),
                      )
                    : null,
                child: Text(
                  context.tr(
                    'Reply to this follow-up in the same topic',
                    '在原话题回复这次跟进',
                  ),
                  key: const Key('ai-reply-context'),
                ),
              ),
            ),
            IconButton(
              key: const Key('ai-clear-reply-context'),
              tooltip: context.tr('Remove reply association', '取消回复关联'),
              onPressed: () {
                if (_isCurrentEditor) _controller.clearReplyTarget();
              },
              icon: const Icon(Icons.close),
            ),
          ],
        );

  String _conversationLabel(AiConversationState state, String id) {
    // Only inspect already authorized messages in the current conversation.
    // This is a local excerpt, not a stored title or an AI-generated summary.
    if (state.conversationId == id) {
      for (final message in state.messages) {
        if (message.role == AiRole.user &&
            message.availability == AiAvailability.available &&
            message.text?.trim().isNotEmpty == true) {
          final text = message.text!.trim().replaceAll(RegExp(r'\s+'), ' ');
          return text.characters.length > 64
              ? '${text.characters.take(64)}…'
              : text;
        }
      }
    }
    return context.tr('Conversation', '对话');
  }

  Widget _historyPanel(AiConversationState state) => Builder(
    builder: (panelContext) => ExpansionTile(
      key: const Key('ai-history'),
      initiallyExpanded: widget.socialStyle,
      maintainState: true,
      expansionAnimationStyle: EnmoriMotion.surface(context),
      leading: const Icon(Icons.history),
      title: Text(context.tr('Conversation history', '历史对话')),
      onExpansionChanged: (open) {
        if (open && !state.historyLoaded && !state.readBusy) {
          unawaited(_controller.loadConversations());
        }
      },
      children: [
        if (state.readBusy) const LinearProgressIndicator(),
        if (state.historyError case final error?)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(aiStatusCopy(context, error)),
          ),
        if (state.historyLoaded &&
            state.conversations.isEmpty &&
            state.historyCursor == null)
          Padding(
            padding: EdgeInsets.all(12),
            child: Text(context.tr('No saved conversations.', '暂无已保存的对话。')),
          ),
        for (final conversation in state.conversations)
          ListTile(
            key: ValueKey('ai-history-${conversation.conversationId}'),
            selected: state.conversationId == conversation.conversationId,
            title: Text(
              _conversationLabel(state, conversation.conversationId),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(localTimeLabel(context, conversation.lastMessageAt)),
            enabled: state.canSelectConversation,
            onTap: () {
              final scaffold = Scaffold.maybeOf(panelContext);
              if (scaffold?.isDrawerOpen == true) scaffold!.closeDrawer();
              unawaited(_openConversation(conversation.conversationId));
            },
          ),
        if (!state.canSelectConversation && state.canCheckResult)
          Padding(
            padding: EdgeInsets.all(12),
            child: Text(
              context.tr(
                'Check the current request result before switching conversations.',
                '请先核对当前请求的结果，再切换对话。',
              ),
            ),
          ),
        TextButton.icon(
          key: const Key('ai-history-reload'),
          icon: const Icon(Icons.refresh),
          onPressed: state.readBusy
              ? null
              : () => unawaited(_controller.loadConversations()),
          label: Text(context.tr('Reload history', '重新加载历史')),
        ),
        if (state.historyCursor != null)
          TextButton(
            key: const Key('ai-history-more'),
            onPressed: state.readBusy
                ? null
                : () => unawaited(_controller.loadConversations(more: true)),
            child: Text(context.tr('Load more conversations', '加载更多对话')),
          ),
      ],
    ),
  );

  Future<void> _delete() async {
    if (!_ownsCurrentSession || _confirming || _leaving) return;
    if (!ref.read(aiConversationControllerProvider).canDelete) return;
    _confirming = true;
    final confirmed = await _confirm(
      message: context.tr(
        'Delete this conversation? All messages will be permanently deleted.',
        '删除此对话？所有消息都将永久删除。',
      ),
      keepLabel: context.tr('Keep', '保留'),
      actionLabel: context.tr('Delete', '删除'),
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
    if (!_isCurrentEditor ||
        _leaving ||
        _confirming ||
        _message.text.trim().isEmpty) {
      return;
    }
    final state = ref.read(aiConversationControllerProvider);
    if (retry ? !state.canRetry : !state.canSend) return;
    final text = _message.text;
    if (ref.read(aiCompanionReferencesEnabledProvider) &&
        ref.read(aiSelectedSourcesControllerProvider).active) {
      if (!_selectionReady) return;
      if (!_controller.validateSelectedInput(text)) return;
      _messageFocus.unfocus();
      unawaited(
        ref.read(aiSelectedSourcesControllerProvider.notifier).submit(text),
      );
      return;
    }
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

  void _followMessages(
    AiConversationState? previous,
    AiConversationState next,
  ) {
    if (!widget.socialStyle &&
        !{
          AiConversationPhase.idle,
          AiConversationPhase.success,
          AiConversationPhase.preparing,
          AiConversationPhase.waiting,
        }.contains(next.phase)) {
      return;
    }
    if (!_ownsCurrentSession ||
        !_historyScroll.hasClients ||
        (next.messages.isEmpty && next.localOutgoingText == null)) {
      return;
    }
    final oldLast = previous?.messages.lastOrNull;
    if (previous?.localOutgoingKey == next.localOutgoingKey &&
        previous?.phase == next.phase &&
        oldLast != null &&
        (next.messages.lastOrNull?.sequence ?? 0) <= oldLast.sequence) {
      return;
    }
    if (_historyScroll.position.extentAfter > 96) return;
    _jumpToLatest();
  }

  void _jumpToLatest() {
    final generation = ++_scrollGeneration;
    void settle(int remaining) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_ownsCurrentSession ||
            generation != _scrollGeneration ||
            !_historyScroll.hasClients) {
          return;
        }
        final position = _historyScroll.position;
        if (!position.hasContentDimensions) return;
        _historyScroll.jumpTo(position.maxScrollExtent);
        // Lazy children can refine the extent after the first jump. Continue
        // only this admitted follow; a user's scroll immediately cancels it.
        if (remaining > 0) settle(remaining - 1);
      });
      WidgetsBinding.instance.scheduleFrame();
    }

    settle(2);
  }

  void _updateLatestVisibility() {
    if (_latestUpdatePending) return;
    _latestUpdatePending = true;
    // Scroll metrics can change during layout, including keyboard resizing.
    // Rebuild only the affordance, after layout, rather than the conversation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _latestUpdatePending = false;
      if (!_ownsCurrentSession || !_historyScroll.hasClients) return;
      final position = _historyScroll.position;
      _latestVisible.value =
          position.hasContentDimensions && position.extentAfter > 96;
    });
    WidgetsBinding.instance.scheduleFrame();
  }

  Widget _withHistoryScroll(Widget child) => PrimaryScrollController(
    controller: _historyScroll,
    child: NotificationListener<ScrollMetricsNotification>(
      onNotification: (notification) {
        if (notification.depth == 0) _updateLatestVisibility();
        return false;
      },
      child: NotificationListener<UserScrollNotification>(
        onNotification: (notification) {
          if (notification.depth == 0) _scrollGeneration++;
          return false;
        },
        child: child,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    ref.listen<AiConversationState>(aiConversationControllerProvider, (
      previous,
      next,
    ) {
      _followMessages(previous, next);
      if (_isCurrentEditor &&
          previous?.draftSyncRevision != next.draftSyncRevision) {
        _syncingEditor = true;
        _message.value = _controller.draftFor(_sessionKey);
        _syncingEditor = false;
      }
      if (previous?.conversationId != next.conversationId) _messageKeys.clear();
      if (ref.read(aiCompanionReferencesEnabledProvider) &&
          previous?.conversationId != next.conversationId &&
          next.conversationId != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_ownsCurrentSession) {
            unawaited(
              ref
                  .read(aiOwnedSourcesControllerProvider.notifier)
                  .checkReadState(),
            );
          }
        });
      }
      if (_ownsCurrentSession &&
          {
            AiConversationPhase.unauthenticated,
            AiConversationPhase.limited,
            AiConversationPhase.authorityChanged,
          }.contains(next.phase)) {
        // Backend rejection can precede observed session/consent replacement.
        // Removing the input widget alone would retain its private draft.
        _message.clear();
        _messageFocus.unfocus();
        _dismissConfirmation();
      }
    });
    final state = ref.watch(aiConversationControllerProvider);
    if (ref.watch(aiCompanionReferencesEnabledProvider)) {
      ref.watch(aiSelectedSourcesControllerProvider);
    }
    final hasText = _message.text.trim().isNotEmpty;
    final status = state.statusMessage == null
        ? _statusCopy(context, state.phase)
        : aiStatusCopy(context, state.statusMessage!);
    final contentHidden =
        state.phase == AiConversationPhase.deleting ||
        state.phase == AiConversationPhase.deleteUnknown ||
        state.phase == AiConversationPhase.deleted ||
        state.phase == AiConversationPhase.limited ||
        state.phase == AiConversationPhase.authorityChanged ||
        state.phase == AiConversationPhase.unauthenticated;
    final location = state.messageLocation;
    final locationHidden =
        (location != null && location.phase != AiMessageLocationPhase.ready) ||
        (!_initialLocationDismissed &&
            widget.initialMessage != null &&
            (location?.phase != AiMessageLocationPhase.ready ||
                location?.locator.messageId !=
                    widget.initialMessage!.messageId ||
                location?.locator.conversationId !=
                    widget.initialMessage!.conversationId));

    if (widget.socialStyle) {
      return _withHistoryScroll(
        _socialScaffold(
          state,
          status,
          contentHidden || locationHidden,
          hasText,
        ),
      );
    }

    return _withHistoryScroll(
      PopScope<void>(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) unawaited(_navigate(widget.onBack));
        },
        child: Scaffold(
          appBar: AppBar(
            leading: IconButton(
              key: const Key('ai-back'),
              tooltip: context.tr('Back', '返回'),
              onPressed: () => unawaited(_navigate(widget.onBack)),
              icon: const Icon(Icons.arrow_back),
            ),
            actions: [
              if (canFindAiMessages(state))
                IconButton(
                  key: const Key('ai-find-messages'),
                  tooltip: context.tr('Find in conversation', '查找对话消息'),
                  onPressed: _findMessages,
                  icon: const Icon(Icons.search),
                ),
              if (widget.onOpenPersonas case final openPersonas?)
                IconButton(
                  key: const Key('ai-personas'),
                  tooltip: context.tr('Manage Personas', '管理人设'),
                  onPressed: () => unawaited(_navigate(openPersonas)),
                  icon: const Icon(Icons.person_outline),
                ),
              IconButton(
                key: const Key('ai-settings'),
                tooltip: context.tr('Settings', '设置'),
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
                  primary: true,
                  padding: const EdgeInsets.all(24),
                  children: [
                    Text(
                      context.tr('AI Conversation', 'AI 对话'),
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    if (state.canBrowseHistory) _historyPanel(state),
                    _referenceStatus(state),
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
                        child: Text(context.tr('New topic', '新话题')),
                      ),
                    ],
                    if (state.canCancel) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        key: const Key('ai-cancel'),
                        style: _buttonStyle,
                        onPressed: _controller.cancel,
                        child: Text(context.tr('Cancel', '取消')),
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
                        child: Text(context.tr('Check result', '核对结果')),
                      ),
                    ],
                    if (state.canLeaveWithoutRetrying) ...[
                      const SizedBox(height: 12),
                      Text(
                        context.tr(
                          'We may not be able to confirm whether this message was '
                              'saved. You can leave without retrying it. Leaving does '
                              'not delete saved messages.',
                          '目前可能无法确认这条消息是否已保存。你可以先离开，无需重试。离开不会删除已保存的消息。',
                        ),
                        key: Key('ai-recovery-explanation'),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        key: const Key('ai-leave-without-retrying'),
                        style: _buttonStyle,
                        onPressed: () => unawaited(
                          _navigate(widget.onBack, explicitUnknownExit: true),
                        ),
                        child: Text(
                          context.tr('Leave without retrying', '直接离开，不重试'),
                        ),
                      ),
                    ],
                    if (!contentHidden && !locationHidden) ...[
                      if (state.conversationId != null) ...[
                        const SizedBox(height: 12),
                        OutlinedButton(
                          key: const Key('ai-reload-messages'),
                          style: _buttonStyle,
                          onPressed: state.readBusy
                              ? null
                              : () => unawaited(_controller.loadMessages()),
                          child: Text(context.tr('Reload messages', '重新加载消息')),
                        ),
                      ],
                      for (final message in state.messages) ...[
                        const SizedBox(height: 16),
                        _messageTile(state, message),
                      ],
                      if (state.localOutgoingText case final text?)
                        _LocalOutgoing(
                          text: text,
                          identity: state.localOutgoingKey!,
                          active: state.canCancel,
                        ),
                      if (state.canCancel) const _TypingIndicator(),
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
                          child: Text(
                            context.tr('Load earlier messages', '加载更早的消息'),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      _replyStatus(state),
                      _planAction(state),
                      _referencesAction(state),
                      TextField(
                        key: const Key('ai-message-input'),
                        controller: _message,
                        focusNode: _messageFocus,
                        enabled:
                            (state.canSend || state.canRetry) &&
                            _selectionReady,
                        minLines: 2,
                        maxLines: 6,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          labelText: context.tr('Message', '消息'),
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        key: const Key('ai-send'),
                        style: _buttonStyle,
                        onPressed: state.canSend && hasText && _selectionReady
                            ? () => _submit(retry: false)
                            : null,
                        child: Text(context.tr('Send', '发送')),
                      ),
                      if (state.canRetry) ...[
                        const SizedBox(height: 8),
                        OutlinedButton(
                          key: const Key('ai-retry'),
                          style: _buttonStyle,
                          onPressed: hasText && _selectionReady
                              ? () => _submit(retry: true)
                              : null,
                          child: Text(context.tr('Retry', '重试')),
                        ),
                      ],
                    ],
                    if (state.canDelete && !contentHidden) ...[
                      const SizedBox(height: 24),
                      OutlinedButton(
                        key: const Key('ai-delete'),
                        style: _buttonStyle,
                        onPressed: () => unawaited(_delete()),
                        child: Text(context.tr('Delete conversation', '删除对话')),
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
                        child: Text(context.tr('Check again', '再次核对')),
                      ),
                    ],
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        context.tr(
                          'AI Safety · AI can make mistakes. Persona preferences do not change data permissions.',
                          'AI 使用说明 · AI 可能出错。人设偏好不会改变数据权限。',
                        ),
                      ),
                    ),
                  ],
                ),
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
      _referenceStatus(state),
      if (!contentHidden && state.readBusy && state.conversationId != null)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Semantics(
            key: const Key('ai-conversation-read-status'),
            liveRegion: true,
            child: Text(
              context.tr('Checking saved conversation…', '正在核对已保存的对话…'),
            ),
          ),
        ),
      if (state.messages.isEmpty &&
          state.localOutgoingText == null &&
          !contentHidden &&
          !state.readBusy &&
          state.canSend &&
          {
            AiConversationPhase.idle,
            AiConversationPhase.success,
          }.contains(state.phase)) ...[
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
          state.conversationId == null
              ? context.tr('Start a new topic', '开始一个新话题')
              : context.tr('Continue this topic', '继续这个话题'),
          key: const Key('ai-entry-empty'),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -.6),
        ),
        const SizedBox(height: 10),
        Text(
          state.conversationId != null
              ? context.tr(
                  'Your next message stays in this conversation.',
                  '下一条消息仍会留在这段对话中。',
                )
              : state.canBrowseHistory
              ? context.tr(
                  'Write here to begin, or open History to continue a saved conversation.',
                  '在这里开始，或打开历史继续一段已保存的对话。',
                )
              : context.tr(
                  'Write a message whenever you feel ready.',
                  '想说的时候，随时写下来。',
                ),
          textAlign: TextAlign.center,
          style: TextStyle(height: 1.6),
        ),
        const SizedBox(height: 28),
      ],
      if (!contentHidden) ...[
        for (final message in state.messages)
          MotionReveal(
            key: ValueKey('arrival-${message.messageId}'),
            enabled:
                message == state.messages.last &&
                state.phase == AiConversationPhase.success,
            distance: 8,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: _messageTile(state, message, bubble: true),
            ),
          ),
        if (state.localOutgoingText case final text?)
          MotionReveal(
            key: ValueKey(state.localOutgoingKey!),
            distance: 8,
            child: _LocalOutgoing(
              text: text,
              identity: state.localOutgoingKey!,
              active: state.canCancel,
            ),
          ),
        if (state.canCancel)
          Align(
            alignment: Alignment.centerLeft,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                child: Row(
                  children: [
                    const ExcludeSemantics(child: _TypingIndicator()),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Semantics(
                        key: const Key('ai-status'),
                        liveRegion: true,
                        child: Text(
                          status ??
                              context.tr('Waiting for a reply…', '正在等待回复…'),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ),
                    TextButton(
                      key: const Key('ai-cancel'),
                      onPressed: _controller.cancel,
                      child: Text(context.tr('Cancel', '取消')),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
      if (status != null && (!state.canCancel || contentHidden))
        Semantics(
          key: const Key('ai-status'),
          liveRegion: true,
          child: MotionReveal(
            trigger: status,
            distance: 0,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(status, style: Theme.of(context).textTheme.bodySmall),
            ),
          ),
        ),
      if (state.canCancel && contentHidden)
        _socialAction(
          'ai-cancel',
          context.tr('Cancel', '取消'),
          _controller.cancel,
        ),
      if (state.canCheckResult &&
          state.phase != AiConversationPhase.idle &&
          state.phase != AiConversationPhase.success)
        _socialAction(
          'ai-check-result',
          context.tr('Check result', '核对结果'),
          state.readBusy ? null : () => unawaited(_controller.checkResult()),
        ),
      if (state.canLeaveWithoutRetrying) ...[
        Padding(
          padding: EdgeInsets.symmetric(vertical: 12),
          child: Text(
            context.tr(
              'We may not be able to confirm whether this message was '
                  'saved. You can leave without retrying it. Leaving does '
                  'not delete saved messages.',
              '目前可能无法确认这条消息是否已保存。你可以先离开，无需重试。离开不会删除已保存的消息。',
            ),
            key: Key('ai-recovery-explanation'),
          ),
        ),
        _socialAction(
          'ai-leave-without-retrying',
          context.tr('Leave without retrying', '直接离开，不重试'),
          () => unawaited(_navigate(widget.onBack, explicitUnknownExit: true)),
        ),
      ],
      if (state.phase == AiConversationPhase.deleteUnknown)
        _socialAction(
          'ai-check-delete',
          context.tr('Check again', '再次核对'),
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
          _replyStatus(state),
          if (state.canSend) _planAction(state),
          _referencesAction(state),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  key: const Key('ai-message-input'),
                  controller: _message,
                  focusNode: _messageFocus,
                  enabled: (state.canSend || state.canRetry) && _selectionReady,
                  minLines: 1,
                  maxLines: 4,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: context.tr('Message', '消息'),
                    hintText: context.tr('Write a message…', '写点什么…'),
                    alignLabelWithHint: true,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                key: const Key('ai-send'),
                style: _buttonStyle,
                onPressed: state.canSend && hasText && _selectionReady
                    ? () => _submit(retry: false)
                    : null,
                child: Semantics(
                  label: context.tr('Send message', '发送消息'),
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
              context.tr('Retry', '重试'),
              hasText && _selectionReady ? () => _submit(retry: true) : null,
            ),
        ],
      ),
    );
    return PopScope<void>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _backFromChat();
      },
      child: Scaffold(
        key: _scaffoldKey,
        onDrawerChanged: (open) {
          if (!open || !_ownsCurrentSession) return;
          final current = ref.read(aiConversationControllerProvider);
          if (current.canBrowseHistory &&
              !current.historyLoaded &&
              !current.readBusy) {
            unawaited(_controller.loadConversations());
          }
        },
        drawer: Drawer(
          child: SafeArea(
            child: ListView(
              primary: false,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    context.tr('Your conversations', '你的对话'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Builder(
                  builder: (drawerContext) => ListTile(
                    key: const Key('ai-drawer-new'),
                    leading: const Icon(Icons.add_comment_outlined),
                    title: Text(context.tr('New topic', '新话题')),
                    enabled: state.canStartNewConversation,
                    onTap: state.canStartNewConversation
                        ? () {
                            Scaffold.of(drawerContext).closeDrawer();
                            _newConversation();
                          }
                        : null,
                  ),
                ),
                ListTile(
                  key: const Key('ai-drawer-find'),
                  leading: const Icon(Icons.search),
                  title: Text(context.tr('Find in conversation', '查找对话消息')),
                  enabled: canFindAiMessages(state),
                  onTap: canFindAiMessages(state)
                      ? () {
                          _scaffoldKey.currentState?.closeDrawer();
                          unawaited(_findMessages());
                        }
                      : null,
                ),
                if (state.canBrowseHistory) _historyPanel(state),
                const Divider(),
                ?widget.personaContext,
                if (widget.onOpenFollowUps case final openFollowUps?)
                  ListTile(
                    key: const Key('ai-follow-up-settings'),
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(context.tr('Ask me later', '稍后联系我')),
                    subtitle:Text(context.tr('Choose a sent message and set a time.','选择已发送的消息并设置时间。')),
                    onTap: () {
                      _scaffoldKey.currentState?.closeDrawer();
                      if(widget.onFollowUpRequested!=null) {unawaited(_chooseLaterContact());}
                      else {unawaited(_navigate(openFollowUps));}
                    },
                  ),
                if(widget.onOpenFollowUps case final manage?)
                  ListTile(key:const Key('ai-manage-follow-ups'),leading:const Icon(Icons.manage_history),
                    title:Text(context.tr('Manage later contacts','管理预约')),
                    onTap:() {_scaffoldKey.currentState?.closeDrawer();unawaited(_navigate(manage));}),
                if (widget.onOpenPersonas case final openPersonas?)
                  ListTile(
                    key: const Key('ai-personas'),
                    leading: const Icon(Icons.person_outline),
                    title: Text(context.tr('Current Persona', '当前人设')),
                    subtitle: Text(
                      context.tr('View and manage Personas', '查看和管理人设'),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      unawaited(_navigate(openPersonas));
                    },
                  ),
                ListTile(
                  key: const Key('ai-settings'),
                  leading: const Icon(Icons.tune),
                  title: Text(context.tr('AI settings', 'AI 设置')),
                  onTap: () {
                    Navigator.pop(context);
                    unawaited(_navigate(widget.onOpenSettings));
                  },
                ),
                const Divider(),
                Builder(
                  builder: (drawerContext) => ListTile(
                    key: const Key('ai-safety'),
                    leading: const Icon(Icons.info_outline),
                    title: Text(
                      context.tr('AI Safety & permissions', 'AI 使用说明与权限'),
                    ),
                    onTap: () {
                      Scaffold.of(drawerContext).closeDrawer();
                      showDialog<void>(
                        context: context,
                        builder: (dialogContext) => AlertDialog(
                          title: Text(
                            context.tr('AI Safety & permissions', 'AI 使用说明与权限'),
                          ),
                          content: Text(
                            context.tr(
                              'AI can make mistakes. Persona preferences do not change data permissions.',
                              'AI 可能出错。人设偏好不会改变数据权限。',
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () {
                                Navigator.pop(dialogContext);
                                unawaited(_navigate(widget.onOpenSettings));
                              },
                              child: Text(
                                context.tr('Privacy settings', '隐私设置'),
                              ),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(dialogContext),
                              child: Text(context.tr('Close', '关闭')),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
        appBar: AppBar(
          automaticallyImplyLeading: widget.navigationBarBuilder == null,
          leading: Builder(
            builder: (context) => IconButton(
              tooltip: context.tr('Open conversation menu', '打开对话菜单'),
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          title: Text(
            context.tr('AI companion', 'AI 伙伴'),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: [
            IconButton(
              key: const Key('ai-open-history'),
              tooltip: context.tr('History', '历史'),
              onPressed: state.canBrowseHistory ? _openHistoryMenu : null,
              icon: const Icon(Icons.history),
            ),
            IconButton(
              key: const Key('ai-new-conversation'),
              tooltip: context.tr('New topic', '新话题'),
              onPressed: state.canStartNewConversation
                  ? _newConversation
                  : null,
              icon: const Icon(Icons.add_comment_outlined),
            ),
            if (state.canStartNewConversation ||
                state.canCheckResult ||
                (!contentHidden && state.conversationId != null))
              PopupMenuButton<String>(
                key: const Key('ai-conversation-actions'),
                tooltip: context.tr('Conversation actions', '对话操作'),
                onSelected: _selectSocialAction,
                itemBuilder: (context) => [
                  if (canFindAiMessages(state))
                    PopupMenuItem(
                      value: 'find',
                      key: const Key('ai-find-messages'),
                      child: Text(context.tr('Find in conversation', '查找对话消息')),
                    ),
                  if (state.canCheckResult)
                    PopupMenuItem(
                      value: 'check',
                      key: const Key('ai-check-result-menu'),
                      enabled: !state.readBusy,
                      child: Text(context.tr('Check result', '核对结果')),
                    ),
                  if (!contentHidden && state.conversationId != null)
                    PopupMenuItem(
                      value: 'reload',
                      key: const Key('ai-reload-messages'),
                      enabled: !state.readBusy,
                      child: Text(context.tr('Reload messages', '重新加载消息')),
                    ),
                  if (!contentHidden && state.nextCursor != null)
                    PopupMenuItem(
                      value: 'earlier',
                      key: const Key('ai-load-earlier'),
                      enabled: !state.readBusy,
                      child: Text(
                        context.tr('Load earlier messages', '加载更早的消息'),
                      ),
                    ),
                  if (!contentHidden && state.canDelete)
                    PopupMenuItem(
                      value: 'delete',
                      key: Key('ai-delete'),
                      child: Text(context.tr('Delete conversation', '删除对话')),
                    ),
                ],
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
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            MotionReveal(
                              trigger: state.conversationId,
                              enabled: !contentHidden,
                              distance: 4,
                              child: ListView(
                                primary: true,
                                keyboardDismissBehavior:
                                    ScrollViewKeyboardDismissBehavior.onDrag,
                                padding: const EdgeInsets.fromLTRB(
                                  20,
                                  8,
                                  20,
                                  16,
                                ),
                                children: content,
                              ),
                            ),
                            if (!contentHidden &&
                                (state.messages.isNotEmpty ||
                                    state.localOutgoingText != null))
                              Positioned(
                                left: 16,
                                right: 16,
                                bottom: 8,
                                child: ValueListenableBuilder<bool>(
                                  valueListenable: _latestVisible,
                                  builder: (context, visible, _) => Align(
                                    alignment: Alignment.centerRight,
                                    child: visible
                                        ? FilledButton.tonalIcon(
                                            key: const Key(
                                              'ai-latest-messages',
                                            ),
                                            onPressed: _jumpToLatest,
                                            icon: const Icon(
                                              Icons.arrow_downward,
                                              size: 18,
                                            ),
                                            label: Text(
                                              context.tr(
                                                'Latest messages',
                                                '最新消息',
                                              ),
                                            ),
                                          )
                                        : const SizedBox.shrink(),
                                  ),
                                ),
                              ),
                          ],
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
      AiConversationPhase.limited,
      AiConversationPhase.authorityChanged,
      AiConversationPhase.unauthenticated,
    }.contains(state.phase);
    switch (action) {
      case 'find':
        unawaited(_findMessages());
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

String? _statusCopy(
  BuildContext context,
  AiConversationPhase phase,
) => switch (phase) {
  AiConversationPhase.idle || AiConversationPhase.success => null,
  AiConversationPhase.preparing => context.tr('Sending…', '正在发送…'),
  AiConversationPhase.waiting => context.tr('Waiting for a reply…', '正在等待回复…'),
  AiConversationPhase.limited => context.tr(
    'AI chat is turned off. You can allow AI data use in Settings.',
    'AI 对话已关闭。你可以在设置中允许 AI 使用数据。',
  ),
  AiConversationPhase.busy => context.tr(
    'AI is busy. Try again later.',
    'AI 正忙，请稍后再试。',
  ),
  AiConversationPhase.unavailable => context.tr(
    'AI is unavailable right now. Try again later.',
    'AI 暂时不可用，请稍后再试。',
  ),
  AiConversationPhase.rejected => context.tr(
    'A reply could not be provided.',
    '未能提供回复。',
  ),
  AiConversationPhase.timedOut => context.tr(
    'This request timed out. Check saved messages before trying again.',
    '请求已超时。请先核对已保存的消息，再决定是否重试。',
  ),
  AiConversationPhase.unknown => context.tr(
    'We couldn’t confirm the result. Check saved messages before trying again.',
    '未能确认结果。请先核对已保存的消息，再决定是否重试。',
  ),
  AiConversationPhase.authorityChanged => context.tr(
    'This reply is no longer available.',
    '此回复已不可用。',
  ),
  AiConversationPhase.deleted => context.tr('Conversation deleted.', '对话已删除。'),
  AiConversationPhase.deleting => context.tr('Deleting…', '正在删除…'),
  AiConversationPhase.deleteUnknown => context.tr(
    'Deletion has not been confirmed. Check again.',
    '尚未确认删除结果，请再次核对。',
  ),
  AiConversationPhase.unauthenticated => context.tr(
    'Your session has expired. Sign in again.',
    '登录已过期，请重新登录。',
  ),
};

final class _MessageTile extends StatelessWidget {
  const _MessageTile({
    required this.message,
    this.bubble = false,
    this.onFollowUp,
    this.sourcePending = false,
    this.unread = false,
    this.onSource,
    this.onReply,
    this.onVisible,
    this.onCheckSource,
  });

  final AiMessage message;
  final bool bubble;
  final VoidCallback? onFollowUp;
  final bool sourcePending, unread;
  final ValueChanged<AiSourceCard>? onSource;
  final VoidCallback? onReply, onVisible, onCheckSource;

  Widget _body(BuildContext context) {
    final text = Text(
      sourcePending
          ? context.tr(
              'Check this message and its sources before continuing.',
              '请先核对这条消息与来源。',
            )
          : message.availability == AiAvailability.unavailable
          ? context.tr('This reply is no longer available.', '此回复已不可用。')
          : message.text ?? '',
      style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
    );
    return onVisible == null
        ? text
        : AiVisibleMessage(onVisible: onVisible, child: text);
  }

  List<Widget> _sourceDetails(BuildContext context) =>
      sourcePending || message.availability != AiAvailability.available
      ? const []
      : [
          if (message.isProactive)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (unread)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: Icon(
                        Icons.circle,
                        size: 8,
                        color: Theme.of(context).colorScheme.primary,
                        semanticLabel: context.tr('Unread follow-up', '未读跟进'),
                      ),
                    ),
                  Flexible(
                    child: Text(
                      context.tr('You requested this follow-up', '你约好的跟进'),
                      key: ValueKey('ai-proactive-origin-${message.messageId}'),
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                  ),
                ],
              ),
            ),
          for (final card in message.sources)
            OutlinedButton(
              key: ValueKey('ai-source-${message.messageId}-${card.cardRef}'),
              onPressed: onSource == null ? null : () => onSource!(card),
              child: Text(
                '${card.kind == AiSourceKind.conversationMessage ? context.tr('Original saved message', '原始已保存消息') : context.tr('Check-in', '签到')} · ${localTimeLabel(context, DateTime.parse(card.sourceOccurredAt))}',
              ),
            ),
          if (onReply != null)
            TextButton.icon(
              key: ValueKey('ai-reply-follow-up-${message.messageId}'),
              onPressed: onReply,
              icon: const Icon(Icons.reply),
              label: Text(context.tr('Reply to this follow-up', '回复这次跟进')),
            ),
        ];

  Widget _followUpButton(BuildContext context) => TextButton.icon(
    key: ValueKey('ai-follow-up-${message.messageId}'),
    onPressed: onFollowUp,
    icon: const Icon(Icons.schedule),
    label: Text(context.tr('Ask me later about this', '就这件事稍后联系我')),
  );

  @override
  Widget build(BuildContext context) {
    if (bubble) {
      final fromUser = message.role == AiRole.user;
      final time = message.persistedAt.toLocal();
      final clock = localTimeLabel(context, time, includeDate: false);
      return Align(
        alignment: fromUser ? Alignment.centerRight : Alignment.centerLeft,
        child: _BubbleWidth(
          child: Container(
            key: ValueKey('ai-message-${message.messageId}'),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fromUser ? context.tr('You', '你') : 'AI',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 6),
                _body(context),
                if (sourcePending)
                  OutlinedButton(
                    key: ValueKey(
                      'ai-check-message-source-${message.messageId}',
                    ),
                    onPressed: onCheckSource,
                    child: Text(
                      context.tr('Check this exact message', '核对这条消息'),
                    ),
                  ),
                const SizedBox(height: 6),
                Semantics(
                  label: context.tr(
                    'Saved at ${localTimeLabel(context, time)}',
                    '保存于 ${localTimeLabel(context, time)}',
                  ),
                  child: Text(
                    clock,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                ..._sourceDetails(context),
                if (onFollowUp != null) _followUpButton(context),
              ],
            ),
          ),
        ),
      );
    }
    return Card(
      key: ValueKey('ai-message-${message.messageId}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.role == AiRole.user ? context.tr('You', '你') : 'AI',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 6),
            _body(context),
            if (sourcePending)
              OutlinedButton(
                key: ValueKey('ai-check-message-source-${message.messageId}'),
                onPressed: onCheckSource,
                child: Text(context.tr('Check this exact message', '核对这条消息')),
              ),
            const SizedBox(height: 6),
            Text(
              localTimeLabel(context, message.persistedAt),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            ..._sourceDetails(context),
            if (onFollowUp != null) _followUpButton(context),
          ],
        ),
      ),
    );
  }
}

final class _LocalOutgoing extends StatelessWidget {
  const _LocalOutgoing({
    required this.text,
    required this.identity,
    required this.active,
  });
  final String text;
  final Object identity;
  final bool active;
  @override
  Widget build(BuildContext context) => Align(
    key: ObjectKey(identity),
    alignment: Alignment.centerRight,
    child: _BubbleWidth(
      child: Card(
        color: Theme.of(context).colorScheme.primaryContainer,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('You', '你'),
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 6),
              Text(
                text,
                key: const Key('ai-local-outgoing'),
                style: Theme.of(context).textTheme.bodyLarge
                    ?.copyWith(height: 1.5),
              ),
              const SizedBox(height: 6),
              Text(
                active
                    ? context.tr('Sending…', '正在发送…')
                    : context.tr('Not confirmed as saved', '尚未确认保存'),
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

final class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();
  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );
  bool _reduceMotion = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final media = MediaQuery.of(context);
    _reduceMotion = media.disableAnimations || media.accessibleNavigation;
    if (_reduceMotion) {
      _pulse.stop();
    } else if (!_pulse.isAnimating) {
      _pulse.repeat();
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    key: const Key('ai-pending-assistant'),
    label: context.tr('AI is preparing a reply', 'AI 正在准备回复'),
    liveRegion: true,
    child: ExcludeSemantics(
      child: AnimatedBuilder(
        animation: _pulse,
        builder: (context, _) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 6),
                child: Opacity(
                  key: Key('ai-typing-dot-$i'),
                  opacity: _reduceMotion
                      ? 1
                      : .35 +
                            .65 *
                                (1 -
                                    (((_pulse.value - i / 3) % 1) * 2 - 1)
                                        .abs()),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.onSurface,
                      shape: BoxShape.circle,
                    ),
                    child: const SizedBox.square(dimension: 6),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

// Bound long replies while allowing short messages to fit their content.
final class _BubbleWidth extends StatelessWidget {
  const _BubbleWidth({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => ConstrainedBox(
      constraints: BoxConstraints(maxWidth: constraints.maxWidth * .88),
      child: child,
    ),
  );
}
