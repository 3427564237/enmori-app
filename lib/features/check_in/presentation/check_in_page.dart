import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import '../../../core/presentation/local_time.dart';
import '../../../core/result/result.dart';
import '../../account/account_preferences_providers.dart';
import '../../account/content_access.dart';
import '../../account/domain/account_preferences_repository.dart';
import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import '../check_in_providers.dart';
import '../domain/check_in_mutations.dart';
import '../domain/check_in_repository.dart';
import 'check_in_controller.dart';
import 'check_in_copy.dart';
import 'check_in_draft_seed.dart';
import 'check_in_edit_page.dart';
import 'check_in_label_input.dart';
import 'check_in_place_controller.dart';
import 'check_in_place_controls.dart';
import 'check_in_record_view.dart';
import 'located_check_in_actions.dart';
import 'located_check_in_controller.dart';

enum _CheckInAction { create, read }

final class CheckInComposerPage extends ConsumerStatefulWidget {
  const CheckInComposerPage({
    this.onReturnHome,
    this.onOpenSaved,
    this.onOpenHistory,
    this.socialStyle = false,
    this.located = false,
    this.openAttribution,
    this.visibility,
    this.initialDraft,
    this.onDiscard,
    super.key,
  });

  final VoidCallback? onReturnHome;
  final ValueChanged<String>? onOpenSaved;
  final VoidCallback? onOpenHistory;
  final bool socialStyle;
  final bool located;
  final Future<bool> Function(Uri)? openAttribution;
  final CheckInVisibility? visibility;
  final CheckInDraftSeed? initialDraft;
  final VoidCallback? onDiscard;

  @override
  ConsumerState<CheckInComposerPage> createState() =>
      _CheckInComposerPageState();
}

final class _CheckInComposerPageState extends ConsumerState<CheckInComposerPage>
    with WidgetsBindingObserver {
  late final CheckInController _controller;
  final _noteController = TextEditingController();
  final _scroll = ScrollController();
  CheckIn? _committedCheckIn;
  final _locationDraft = Object();
  bool _settingsReady = false;
  bool _settingsFailed = false;
  String? _mood, _activity, _locationLabel;
  OwnSettings? _defaults;
  bool _defaultsApplied = false;
  bool _foreground = true;
  CheckInVisibility? _visibility;
  _CheckInAction? _lastAction;
  String? _noteErrorText;
  int? _activeOperation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground =
        lifecycle != AppLifecycleState.paused &&
        lifecycle != AppLifecycleState.hidden &&
        lifecycle != AppLifecycleState.detached;
    _controller = ref.read(checkInControllerProvider.notifier);
    if (widget.initialDraft case final draft?) {
      _noteController.text = draft.note;
      _mood = draft.mood;
      _activity = draft.activity;
    }
    if (widget.located) Future.microtask(_loadVisibility);
  }

  Future<void> _loadVisibility() async {
    final session = ref.read(authSessionProvider).asData?.value;
    final result = await ref
        .read(accountPreferencesRepositoryProvider)
        .readSettings();
    if (!mounted ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    setState(() {
      if (result case Success<OwnSettings>(:final value)) {
        _defaults = value;
        _visibility ??= value.checkInVisibility;
        _settingsReady = true;
        _settingsFailed = false;
      } else {
        _settingsFailed = true;
      }
    });
    if (!_defaultsApplied && _defaults != null && _foreground) {
      _defaultsApplied = true;
      final place = ref.read(
        checkInPlaceControllerProvider(_locationDraft).notifier,
      );
      await place.captureDefaults(_defaults!);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _foreground = true;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _foreground = false;
    }
    if (widget.located &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached)) {
      final saving = ref.read(locatedCheckInControllerProvider(_locationDraft));
      if (!saving.busy && !saving.uncertain) {
        ref
            .read(checkInPlaceControllerProvider(_locationDraft).notifier)
            .clear();
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _noteController.dispose();
    _scroll.dispose();
    if (_activeOperation case final operation?) _controller.abandon(operation);
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
      if (next is CommandSucceeded<CheckIn> || next is CommandFailed<CheckIn>) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _scroll.hasClients) {
            _scroll.jumpTo(_scroll.position.maxScrollExtent);
          }
        });
      }
    });

    final state = ref.watch(checkInControllerProvider);
    final located = widget.located
        ? ref.watch(locatedCheckInControllerProvider(_locationDraft))
        : null;
    final saved = located?.savedId != null;
    final pending =
        state is CommandPending<CheckIn> ||
        located?.busy == true ||
        located?.uncertain == true ||
        saved;
    if (widget.located) {
      ref.listen(locatedCheckInControllerProvider(_locationDraft), (
        previous,
        next,
      ) {
        if (next.savedId != null && previous?.savedId == null) {
          FocusScope.of(context).unfocus();
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _scroll.hasClients) _scroll.jumpTo(0);
          });
        }
      });
    }
    final placeState = widget.located
        ? ref.watch(checkInPlaceControllerProvider(_locationDraft))
        : null;
    final noteLength = _noteController.text.trim().characters.length;
    return PopScope<void>(
      canPop:
          (!widget.located && widget.initialDraft == null) ||
          saved ||
          (!pending &&
              _noteController.text.isEmpty &&
              _mood == null &&
              _activity == null &&
              _locationLabel == null &&
              placeState?.place == null),
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || (!widget.located && widget.initialDraft == null)) return;
        final leave = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(
              pending
                  ? context.tr('Leave this Check-in?', '离开这条签到？')
                  : context.tr('Discard this draft?', '放弃草稿？'),
            ),
            content: Text(
              pending
                  ? context.tr(
                      'The save may still complete. Stay to recover the same request, or check History before making another Check-in.',
                      '保存可能仍会完成。请留在此处核对原请求，或先查看历史记录，再创建另一条签到。',
                    )
                  : context.tr(
                      'Your unsaved Note, Mood and location choice will be discarded.',
                      '未保存的笔记、心情和位置选择将被丢弃。',
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(context.tr('Keep editing', '继续编辑')),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(context.tr('Leave', '离开')),
              ),
            ],
          ),
        );
        if (mounted && leave == true) {
          (widget.onDiscard ?? widget.onReturnHome)?.call();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: widget.located || widget.initialDraft != null
              ? BackButton(onPressed: () => Navigator.of(context).maybePop())
              : null,
          title: Text(
            widget.initialDraft != null
                ? context.tr('New draft from Check-in', '从签到开始新草稿')
                : widget.socialStyle
                ? context.tr('Check-in', '签到')
                : context.tr('New Check-in', '新建签到'),
          ),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                controller: _scroll,
                key: const Key('route-check-in'),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!saved) ...[
                      if (widget.initialDraft != null) ...[
                        Text(
                          context.tr(
                            'Review and edit the copied Note, Mood and Activity, then save a new Check-in. The original stays unchanged.',
                            '复核并修改复制的笔记、心情和活动标签，再保存为新签到。原记录保持不变。',
                          ),
                          key: const Key('check-in-draft-review'),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          context.tr(
                            'Place, GPS, weather and sharing settings are not copied. Your current new Check-in settings apply.',
                            '不会复制地点、GPS、天气或分享设置。本次使用当前的新签到设置。',
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 16),
                      ],
                      TextField(
                        key: const Key('r6-check-in-note'),
                        controller: _noteController,
                        enabled: !pending,
                        minLines: MediaQuery.sizeOf(context).height < 500
                            ? 3
                            : 6,
                        maxLines: 12,
                        maxLength: 500,
                        onChanged: (_) => setState(() => _noteErrorText = null),
                        decoration: InputDecoration(
                          alignLabelWithHint: true,
                          errorText: _noteErrorText,
                          helperText: widget.socialStyle
                              ? context.tr(
                                  'A note of up to 500 characters.',
                                  '笔记最多 500 个字符。',
                                )
                              : context.tr(
                                  '$noteLength / 500 characters',
                                  '$noteLength / 500 个字符',
                                ),
                          counterText: widget.socialStyle
                              ? '$noteLength / 500'
                              : null,
                          hintText: widget.socialStyle
                              ? context.tr(
                                  'What would you like to keep from today?',
                                  '今天有什么想留下的？',
                                )
                              : null,
                          labelText: context.tr('Note', '笔记'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          CheckInLabelChip(
                            selected: _mood != null,
                            avatar: const Icon(Icons.mood_outlined, size: 18),
                            label: _mood ?? context.tr('Mood', '心情'),
                            onPressed: pending
                                ? null
                                : () => _chooseLabel(
                                    'Mood',
                                    _mood,
                                    checkInMoodChoices,
                                    (v) => _mood = v,
                                  ),
                          ),
                          CheckInLabelChip(
                            selected: _locationLabel != null,
                            avatar: const Icon(Icons.place_outlined, size: 18),
                            label:
                                _locationLabel ?? context.tr('Location', '地点'),
                            onPressed: pending
                                ? null
                                : () => _chooseLabel(
                                    'Place name',
                                    _locationLabel,
                                    [],
                                    (v) => _locationLabel = v,
                                  ),
                          ),
                          CheckInLabelChip(
                            selected: _activity != null,
                            avatar: const Icon(
                              Icons.local_activity_outlined,
                              size: 18,
                            ),
                            label: _activity ?? context.tr('Activity', '活动标签'),
                            onPressed: pending
                                ? null
                                : () => _chooseLabel(
                                    'Activity',
                                    _activity,
                                    checkInActivityChoices,
                                    (v) => _activity = v,
                                  ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Card(
                        child: ListTile(
                          key: const Key('check-in-permissions'),
                          leading: const Icon(Icons.tune),
                          title: Text(context.tr('Permissions', '权限设置')),
                          subtitle: MotionReveal(
                            trigger: (
                              _visibility,
                              placeState?.busy,
                              placeState?.place?.includeWeather,
                              placeState?.place?.location,
                            ),
                            distance: 0,
                            child: Text(
                              '$_visibilityLabel · ${placeState?.busy == true
                                  ? context.tr('Getting GPS…', '正在获取位置…')
                                  : placeState?.place == null
                                  ? context.tr('No GPS', '未附加 GPS')
                                  : context.tr('GPS attached', '已附加 GPS')} · ${placeState?.place?.includeWeather == true ? context.tr('Weather on', '天气已开启') : context.tr('Weather off', '天气已关闭')}',
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: pending || (widget.located && !_settingsReady)
                              ? null
                              : _permissions,
                        ),
                      ),
                      if (placeState?.failure case final failure?)
                        Text(checkInFailureText(context, failure)),
                      if (_defaults?.defaultCheckInWeather == true &&
                          placeState?.place == null &&
                          placeState?.busy != true)
                        Text(
                          context.tr(
                            'Weather needs a GPS point. You can still save this Check-in.',
                            '天气需要 GPS 位置。你仍可保存这条签到。',
                          ),
                        ),
                      const SizedBox(height: 12),
                    ],
                    if (widget.located && !_settingsReady)
                      _settingsFailed
                          ? TextButton(
                              onPressed: _loadVisibility,
                              child: Text(
                                context.tr(
                                  'Retry privacy settings',
                                  '重新加载隐私设置',
                                ),
                              ),
                            )
                          : LinearProgressIndicator()
                    else if (widget.located)
                      LocatedCheckInActions(
                        draftKey: _locationDraft,
                        onOpenSaved: widget.onOpenSaved,
                        onOpenHistory: widget.onOpenHistory,
                        onReturnHome: widget.onReturnHome,
                        note: _noteController.text,
                        mood: _mood,
                        activity: _activity,
                        locationLabel: _locationLabel,
                        showPlaceControls: false,
                        visibility: _visibility ?? CheckInVisibility.private,
                        openAttribution:
                            widget.openAttribution ?? (uri) async => false,
                      )
                    else
                      FilledButton.icon(
                        key: const Key('r6-check-in-create'),
                        onPressed: pending ? null : _create,
                        icon: pending && _lastAction == _CheckInAction.create
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: Text(context.tr('Save Check-in', '保存签到')),
                      ),
                    const SizedBox(height: 20),
                    if (!widget.located) _statusBlock(state),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String get _visibilityLabel =>
      switch (_visibility ?? widget.visibility ?? CheckInVisibility.private) {
        CheckInVisibility.private => context.tr('Private', '仅自己'),
        CheckInVisibility.friendsOnly => context.tr('Friends only', '仅好友'),
        CheckInVisibility.public => context.tr('Public', '公开'),
      };

  Future<void> _chooseLabel(
    String title,
    String? current,
    List<String> choices,
    void Function(String?) update,
  ) async {
    final value = await chooseCheckInLabel(
      context,
      title: title,
      current: current,
      choices: choices,
    );
    if (mounted && value != null) {
      setState(() {
        update(value.isEmpty ? null : value);
        _noteErrorText = null;
      });
    }
  }

  Future<void> _permissions() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      sheetAnimationStyle: EnmoriMotion.surface(context),
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr('This Check-in', '本次签到'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<CheckInVisibility>(
                initialValue:
                    _visibility ??
                    widget.visibility ??
                    CheckInVisibility.private,
                decoration: InputDecoration(
                  labelText: context.tr('Who can see it', '谁可以看到'),
                ),
                items: [
                  DropdownMenuItem(
                    value: CheckInVisibility.private,
                    child: Text(context.tr('Private', '仅自己')),
                  ),
                  DropdownMenuItem(
                    value: CheckInVisibility.friendsOnly,
                    child: Text(context.tr('Friends only', '仅好友')),
                  ),
                  DropdownMenuItem(
                    value: CheckInVisibility.public,
                    child: Text(context.tr('Public', '公开')),
                  ),
                ],
                onChanged: (v) {
                  if (mounted) setState(() => _visibility = v);
                },
              ),
              if (widget.located)
                CheckInPlaceControls(
                  draftKey: _locationDraft,
                  defaultLocationAuthorized:
                      _defaults?.defaultCheckInLocation ?? false,
                  defaultWeatherAuthorized:
                      _defaults?.defaultCheckInWeather ?? false,
                ),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: Text(context.tr('Done', '完成')),
              ),
            ],
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
            ? context.tr('Confirming your saved Check-in…', '正在确认已保存的签到…')
            : context.tr('Saving Check-in', '正在保存签到'),
        body: _lastAction == _CheckInAction.read
            ? (widget.socialStyle
                  ? context.tr('Checking your saved note…', '正在核对已保存的笔记…')
                  : context.tr(
                      'Reading the saved Check-in from backend-only product data.',
                      '正在重新读取已保存的签到。',
                    ))
            : (widget.socialStyle
                  ? context.tr('Saving your moment…', '正在保存这一刻…')
                  : context.tr(
                      'Saving your Check-in with the approved backend operation.',
                      '正在保存签到，请稍候。',
                    )),
      );
    }
    if (state case CommandFailed<CheckIn>(:final failure)) {
      final confirming = _lastAction == _CheckInAction.read;
      return _ResultPanel(
        key: Key(
          confirming ? 'r6-check-in-unavailable' : 'r6-check-in-failure',
        ),
        icon: confirming ? Icons.sync_problem : Icons.error_outline,
        title: confirming
            ? context.tr('Confirmation unavailable', '暂时无法确认')
            : context.tr('Check-in not saved', '签到未保存'),
        body: confirming
            ? _confirmationFailureCopy(failure.kind)
            : _createFailureCopy(failure.kind),
        action: confirming && _committedCheckIn != null
            ? FilledButton.icon(
                key: const Key('r6-check-in-retry-confirmation'),
                onPressed: () => _confirm(_committedCheckIn!),
                icon: const Icon(Icons.sync),
                label: Text(context.tr('Reload Check-in', '重新加载签到')),
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
      title: confirmed
          ? context.tr('Saved Check-in confirmed.', '已确认签到保存成功。')
          : context.tr('Check-in saved.', '签到已保存。'),
      body: [
        checkIn.note,
        if (checkIn.mood != null)
          '${context.tr('Mood', '心情')}: ${checkIn.mood}',
        if (checkIn.activity != null)
          '${context.tr('Activity', '活动标签')}: ${checkIn.activity}',
        context.tr(
          'Saved at ${localTimeLabel(context, checkIn.createdAt)}',
          '保存于 ${localTimeLabel(context, checkIn.createdAt)}',
        ),
        if (checkIn.checkInVisibility != null)
          '${context.tr('Visibility', '可见范围')}: ${switch (checkIn.checkInVisibility!) {
            CheckInVisibility.private => context.tr('Private', '仅自己'),
            CheckInVisibility.friendsOnly => context.tr('Friends-only', '仅好友'),
            CheckInVisibility.public => context.tr('Public', '公开'),
          }}',
      ].where((part) => part.isNotEmpty).join('\n'),
      action: confirmed
          ? OutlinedButton.icon(
              key: const Key('r6-return-home-inline'),
              onPressed: widget.onReturnHome ?? () {},
              icon: const Icon(Icons.home_outlined),
              label: Text(context.tr('Return Home', '返回首页')),
            )
          : FilledButton.icon(
              key: const Key('r6-check-in-confirm'),
              onPressed: () => _confirm(checkIn),
              icon: const Icon(Icons.sync),
              label: Text(context.tr('Confirm saved Check-in', '确认已保存的签到')),
            ),
    );
  }

  void _create() {
    final normalized = _noteController.text.trim();
    final noteLength = normalized.characters.length;
    if (noteLength == 0 && _mood == null) {
      setState(
        () => _noteErrorText = context.tr(
          'Enter a Note or select a Mood before saving.',
          '保存前请填写笔记或选择心情。',
        ),
      );
      return;
    }
    if (noteLength > 500) {
      setState(
        () => _noteErrorText = context.tr(
          'Keep the Note within 500 characters.',
          '笔记请勿超过 500 个字符。',
        ),
      );
      return;
    }
    _lastAction = _CheckInAction.create;
    _controller.create(
      note: normalized,
      mood: _mood,
      activity: _activity,
      locationLabel: _locationLabel,
      visibility: _visibility,
    );
    _activeOperation = _controller.operationToken;
  }

  void _confirm(CheckIn checkIn) {
    _lastAction = _CheckInAction.read;
    _controller.readPersisted(checkInId: checkIn.checkInId);
    _activeOperation = _controller.operationToken;
  }

  String _createFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInInvalid => context.tr(
        'Enter a Note or select a Mood before saving.',
        '保存前请填写笔记或选择心情。',
      ),
      AppFailureKind.idempotencyConflict => context.tr(
        'This Check-in attempt changed after it was submitted. Start a new attempt.',
        '提交后签到内容发生变化，请重新开始。',
      ),
      AppFailureKind.authRequired => context.tr(
        'Your session has expired. Sign in again.',
        '登录已失效，请重新登录。',
      ),
      AppFailureKind.authForbidden => context.tr(
        'This account cannot continue.',
        '此账号无法继续。',
      ),
      AppFailureKind.serviceUnavailable ||
      AppFailureKind.configurationUnavailable => context.tr(
        'This service is temporarily unavailable. Try again.',
        '服务暂时不可用，请重试。',
      ),
      _ => context.tr(
        'This service is temporarily unavailable. Try again.',
        '服务暂时不可用，请重试。',
      ),
    };
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => context.tr(
        'This Check-in is unavailable.',
        '此签到不可用。',
      ),
      AppFailureKind.authRequired => context.tr(
        'Your session has expired. Sign in again.',
        '登录已失效，请重新登录。',
      ),
      AppFailureKind.authForbidden => context.tr(
        'This account cannot continue.',
        '此账号无法继续。',
      ),
      _ => context.tr(
        'This service is temporarily unavailable. Try again.',
        '服务暂时不可用，请重试。',
      ),
    };
  }
}

final class SavedCheckInPage extends ConsumerStatefulWidget {
  const SavedCheckInPage({
    required this.checkInId,
    required this.onReturnHome,
    this.openAttribution,
    this.placeActions = false,
    this.onStartNewDraft,
    this.onReferenceInAi,
    super.key,
  });

  final String checkInId;
  final bool placeActions;
  final ValueChanged<String>? onStartNewDraft;
  final ValueChanged<String>? onReferenceInAi;
  final VoidCallback onReturnHome;
  final Future<bool> Function(Uri)? openAttribution;

  @override
  ConsumerState<SavedCheckInPage> createState() => _SavedCheckInPageState();
}

final class _SavedCheckInPageState extends ConsumerState<SavedCheckInPage> {
  late final CheckInController _controller;
  int? _activeOperation;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(checkInControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _readPersisted());
  }

  @override
  void dispose() {
    if (_activeOperation case final operation?) _controller.abandon(operation);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(contentAccessProvider, (before, after) {
      if (after.foreground && ModalRoute.of(context)?.isCurrent == true) {
        Future.microtask(() {
          if (mounted) _readPersisted();
        });
      }
    });
    final state = ref.watch(checkInControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Saved Check-in', '已保存的签到')),
        actions: [
          if (state case CommandSucceeded<CheckIn>(:final value))
            if (ref.watch(checkInRepositoryProvider) is CheckInMutations)
              IconButton(
                key: const Key('saved-check-in-edit'),
                tooltip: context.tr('Edit Check-in', '编辑签到'),
                icon: const Icon(Icons.edit_outlined),
                onPressed: () async {
                  final result = await Navigator.of(context)
                      .push<CheckInEditResult>(
                        MaterialPageRoute(
                          builder: (_) => CheckInEditPage(checkIn: value),
                        ),
                      );
                  if (!context.mounted) return;
                  if (result == CheckInEditResult.deleted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          context.tr('Check-in deleted.', '签到已删除。'),
                        ),
                      ),
                    );
                    if (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop();
                    } else {
                      widget.onReturnHome();
                    }
                  } else if (result == CheckInEditResult.saved) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          context.tr('Check-in updated.', '签到已更新。'),
                        ),
                      ),
                    );
                    _readPersisted();
                  }
                },
              ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          key: const Key('route-check-in-saved'),
          padding: const EdgeInsets.all(20),
          children: [
            if (state is CommandPending<CheckIn>)
              _ResultPanel(
                key: Key('r6-saved-check-in-confirming'),
                icon: Icons.sync,
                title: context.tr('Loading Check-in…', '正在加载签到…'),
                body: context.tr('Getting your saved details.', '正在读取已保存的内容。'),
              )
            else if (state case CommandSucceeded<CheckIn>(:final value))
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CheckInRecordView(
                    key: const Key('r6-saved-check-in-confirmed'),
                    record: value,
                    openAttribution:
                        widget.openAttribution ?? (_) async => false,
                  ),
                  if (widget.onReferenceInAi != null &&
                      value.checkInId == widget.checkInId) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      key: const Key('saved-check-in-reference-ai'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                      onPressed: _referenceInAi,
                      icon: const Icon(Icons.forum_outlined),
                      label: Text(context.tr('Reference in AI', '在 AI 中参考')),
                    ),
                  ],
                  if (widget.onStartNewDraft != null &&
                      value.checkInId == widget.checkInId) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      key: const Key('saved-check-in-start-draft'),
                      onPressed: () =>
                          widget.onStartNewDraft!(widget.checkInId),
                      icon: const Icon(Icons.post_add_outlined),
                      label: Text(context.tr('Start a new draft', '以此开始新草稿')),
                    ),
                  ],
                  if (widget.placeActions)
                    SavedCheckInPlaceActions(
                      key: ValueKey('${value.checkInId}:${value.revision}'),
                      record: value,
                      onChanged: _readPersisted,
                      openAttribution:
                          widget.openAttribution ?? (_) async => false,
                    ),
                ],
              )
            else if (state case CommandFailed<CheckIn>(:final failure))
              _ResultPanel(
                key: const Key('r6-saved-check-in-unavailable'),
                icon: Icons.sync_problem,
                title: context.tr('Check-in unavailable', '签到不可用'),
                body: _confirmationFailureCopy(failure.kind),
                action: FilledButton.icon(
                  key: const Key('r6-saved-check-in-retry-confirmation'),
                  onPressed: _readPersisted,
                  icon: const Icon(Icons.sync),
                  label: Text(context.tr('Reload Check-in', '重新加载签到')),
                ),
              ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              key: const Key('r6-return-home'),
              onPressed: widget.onReturnHome,
              icon: const Icon(Icons.home_outlined),
              label: Text(context.tr('Return Home', '返回首页')),
            ),
          ],
        ),
      ),
    );
  }

  void _readPersisted() {
    if (!mounted) return;
    _controller.readPersisted(checkInId: widget.checkInId);
    _activeOperation = _controller.operationToken;
  }

  void _referenceInAi() {
    if (!mounted ||
        ModalRoute.of(context)?.isCurrent != true ||
        !ref.read(contentAccessProvider).foreground) {
      return;
    }
    final current = ref.read(checkInControllerProvider);
    if (current case CommandSucceeded<CheckIn>(:final value)
        when value.checkInId == widget.checkInId) {
      widget.onReferenceInAi?.call(value.checkInId);
    }
  }

  String _confirmationFailureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.checkInUnavailable => context.tr(
        'This Check-in is unavailable.',
        '此签到不可用。',
      ),
      AppFailureKind.authRequired => context.tr(
        'Your session has expired. Sign in again.',
        '登录已失效，请重新登录。',
      ),
      AppFailureKind.authForbidden => context.tr(
        'This account cannot continue.',
        '此账号无法继续。',
      ),
      _ => context.tr(
        'This service is temporarily unavailable. Try again.',
        '服务暂时不可用，请重试。',
      ),
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
