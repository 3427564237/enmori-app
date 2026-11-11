import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../account/account_preferences_providers.dart';
import '../domain/follow_up_quiet.dart';
import '../proactive_providers.dart';
import 'proactive_status.dart';
import 'proactive_processing_notice.dart';

final class ProactiveFollowUpPage extends ConsumerStatefulWidget {
  const ProactiveFollowUpPage({
    required this.source,
    required this.onBack,
    this.onOpenSettings,
    super.key,
  });
  final SavedFollowUpSource source;
  final VoidCallback onBack;
  final VoidCallback? onOpenSettings;
  @override
  ConsumerState<ProactiveFollowUpPage> createState() => _FollowUpPageState();
}

final class _FollowUpPageState extends ConsumerState<ProactiveFollowUpPage> {
  final _date = TextEditingController(),
      _time = TextEditingController(),
      _zone = TextEditingController();
  late Object _session;
  List<FollowUpTime> _candidates = const [];
  FollowUpTime? _chosen;
  FollowUpIntent? _receipt;
  bool _confirmed = false, _resolving = false, _submitting = false;
  String? _timeError, _deviceZone, _changedDeviceZone;
  bool _retired = false;

  bool get _owns =>
      mounted &&
      !_retired &&
      ref.read(proactiveControllerProvider).sessionKey == _session &&
      ref.read(proactiveControllerProvider).authenticated &&
      ref.read(contentAccessProvider).foreground;

  @override
  void initState() {
    super.initState();
    _session = ref.read(proactiveControllerProvider).sessionKey;
    final restored = ref
        .read(proactiveControllerProvider.notifier)
        .reviewForSource(widget.source);
    if (restored != null) {
      _date.text = restored.displayTime.split(' ').first;
      _time.text = restored.displayTime.split(' ').last;
      _zone.text = restored.timeZone;
      _candidates = [restored];
      _chosen = restored;
    }
    for (final field in [_date, _time, _zone]) {
      field.addListener(_edited);
    }
    ref.listenManual(proactiveControllerProvider, (_, next) {
      if (next.sessionKey != _session ||
          !next.authenticated ||
          next.sourceUnavailable) {
        _retired = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          for (final field in [_date, _time, _zone]) {
            field.clear();
          }
          setState(() {
            _candidates = const [];
            _chosen = null;
            _confirmed = false;
            _receipt = null;
            _deviceZone = null;
            _changedDeviceZone = null;
          });
        });
      }
    });
    ref.listenManual(contentAccessProvider, (_, _) {
      _retired = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        for (final field in [_date, _time, _zone]) {
          field.clear();
        }
        setState(() {
          _candidates = const [];
          _chosen = null;
          _confirmed = false;
          _receipt = null;
          _deviceZone = null;
          _changedDeviceZone = null;
        });
      });
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_owns) return;
      ref.read(proactiveControllerProvider.notifier).beginSourceReview();
      unawaited(ref.read(proactiveControllerProvider.notifier).load());
      unawaited(_captureZone());
    });
  }

  void _edited() {
    if (!mounted) return;
    setState(() {
      _candidates = const [];
      _chosen = null;
      _confirmed = false;
      _timeError = null;
    });
  }

  @override
  void dispose() {
    for (final field in [_date, _time, _zone]) {
      field.dispose();
    }
    super.dispose();
  }

  Future<void> _captureZone() async {
    final result = await ref.read(followUpTimePortProvider).currentIanaZone();
    if (!_owns) return;
    if (result case Success<String>(:final value)) {
      _deviceZone = value;
      if (_zone.text.isEmpty) _zone.text = value;
    } else {
      setState(
        () => _timeError = context.tr(
          'The device time zone could not be checked.',
          '暂时无法核对设备时区。',
        ),
      );
    }
  }

  FollowUpCivilTime? _civil() {
    final date = RegExp(r'^(\d{4})-(\d\d)-(\d\d)$').firstMatch(_date.text);
    final time = RegExp(r'^(\d\d):(\d\d)$').firstMatch(_time.text);
    if (date == null || time == null) return null;
    final c = FollowUpCivilTime(
      year: int.parse(date[1]!),
      month: int.parse(date[2]!),
      day: int.parse(date[3]!),
      hour: int.parse(time[1]!),
      minute: int.parse(time[2]!),
    );
    final at = DateTime.utc(c.year, c.month, c.day, c.hour, c.minute);
    return at.year == c.year &&
            at.month == c.month &&
            at.day == c.day &&
            at.hour == c.hour &&
            at.minute == c.minute
        ? c
        : null;
  }

  Future<void> _resolve() async {
    if (!_owns || _resolving) return;
    final civil = _civil();
    if (civil == null) {
      setState(
        () => _timeError = context.tr(
          'Enter a valid date and local time.',
          '请输入有效日期与当地时间。',
        ),
      );
      return;
    }
    final signature = (_date.text, _time.text, _zone.text);
    setState(() {
      _resolving = true;
      _timeError = null;
      _chosen = null;
      _confirmed = false;
      _candidates = const [];
    });
    final result = await ref
        .read(followUpTimePortProvider)
        .resolveCivil(civil: civil, timeZone: _zone.text);
    if (!_owns) return;
    setState(() => _resolving = false);
    if (signature != (_date.text, _time.text, _zone.text)) return;
    if (result case Failure<List<FollowUpTime>>(:final failure)) {
      setState(() => _timeError = proactiveFailureCopy(context, failure));
      return;
    }
    final values = (result as Success<List<FollowUpTime>>).value;
    if (values.isEmpty) {
      setState(
        () => _timeError = context.tr(
          'This local time does not exist. Choose another time.',
          '这个当地时间不存在，请另选时间。',
        ),
      );
      return;
    }
    final now = ref.read(proactiveNowProvider)();
    if (values.length > 2 ||
        values.any((v) => v.timeZone != _zone.text || !v.dueAt.isUtc) ||
        values.every((v) => !v.dueAt.isAfter(now))) {
      setState(
        () => _timeError = context.tr(
          'Choose and verify a future time.',
          '请选择并核对一个未来时间。',
        ),
      );
      return;
    }
    setState(() {
      _candidates = values;
      _chosen = values.length == 1 ? values.single : null;
    });
  }

  Future<bool> _checkDeviceZone() async {
    final result = await ref.read(followUpTimePortProvider).currentIanaZone();
    if (!_owns) return false;
    if (result case Failure<String>()) {
      setState(() {
        _confirmed = false;
        _timeError = context.tr(
          'The device time zone could not be checked.',
          '暂时无法核对设备时区。',
        );
      });
      return false;
    }
    final value = (result as Success<String>).value;
    if (_deviceZone == null || value != _deviceZone) {
      setState(() {
        _changedDeviceZone = value;
        _confirmed = false;
      });
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    final selected = _chosen;
    if (!_owns ||
        _submitting ||
        !_confirmed ||
        selected == null ||
        _receipt != null) {
      return;
    }
    setState(() => _submitting = true);
    try {
      if (!await _checkDeviceZone() ||
          !_owns ||
          !identical(selected, _chosen) ||
          !_confirmed) {
        return;
      }
      if (!selected.dueAt.isAfter(ref.read(proactiveNowProvider)())) {
        setState(() {
          _confirmed = false;
          _timeError = context.tr(
            'Choose and verify a future time.',
            '请选择并核对一个未来时间。',
          );
        });
        return;
      }
      final controller = ref.read(proactiveControllerProvider.notifier);
      controller.keepSourceReview(widget.source, selected);
      final before = ref.read(proactiveControllerProvider);
      if (before.settings?.allowsExplicitFollowUp != true ||
          before.settings!.timeZone != selected.timeZone) {
        await controller.changeMode(
          ProactiveMode.on,
          confirmedZone: selected.timeZone,
        );
        return; // A confirmed settings ACK is a separate step, never an auto-create.
      }
      final receipt = await controller.schedule(widget.source, selected);
      if (_owns && receipt != null) {
        setState(() {
          _receipt = receipt;
          _confirmed = false;
        });
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _checkIntent() async {
    final pending = ref.read(proactiveControllerProvider).pendingIntent;
    if (!_owns || pending == null) return;
    final matching =
        pending.command?.sourceMessageId == widget.source.messageId &&
        pending.command?.conversationId == widget.source.conversationId;
    final value = await ref
        .read(proactiveControllerProvider.notifier)
        .checkPendingIntent();
    if (_owns && value != null && matching) {
      setState(() {
        _receipt = value;
        _confirmed = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(proactiveControllerProvider);
    final processor =
        ref.watch(aiClientProcessingProvider).cloudProvider?.displayName ??
        context.tr('Local model', '本地模型');
    final processingAllowed = ref.watch(proactiveProcessingAllowedProvider);
    final valid = _owns && !state.sourceUnavailable;
    final pending = state.pendingIntent;
    final blocked =
        !processingAllowed ||
        _submitting ||
        state.settingsBusy ||
        state.intentsBusy ||
        state.settingsUnconfirmed ||
        pending != null;
    final enableNeeded =
        state.settings?.allowsExplicitFollowUp != true ||
        state.settings?.timeZone != _chosen?.timeZone;
    final civil = _civil();
    final quietSuggestion = civil == null || state.settings == null
        ? null
        : nextAllowedFollowUpTime(civil, state.settings!.quiet);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: context.tr('Back', '返回'),
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(context.tr('Ask me later', '稍后联系我')),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              key: const Key('proactive-follow-up-page'),
              padding: const EdgeInsets.all(20),
              children: [
                if (_owns)
                  ProactiveProcessingNotice(
                    onOpenSettings: widget.onOpenSettings,
                  ),
                if (!valid)
                  Text(
                    context.tr(
                      'This source or session is no longer available. Your chat draft is kept.',
                      '来源或当前登录已不可用，聊天草稿仍保留。',
                    ),
                  )
                else ...[
                  Text(
                    context.tr(
                      'One follow-up about your saved message',
                      '就这条已保存的消息跟进一次',
                    ),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            localTimeLabel(context, widget.source.occurredAt),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.source.text,
                            key: const Key('proactive-source-text'),
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(height: 1.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Text(
                    context.tr(
                      '$processor · once · at most 1 contact per rolling 24 hours, 8 hours apart. No system push is enabled by scheduling.',
                      '$processor · 仅一次 · 每滚动 24 小时最多联系一次，至少间隔 8 小时。预约不会开启系统推送。',
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    key: const Key('proactive-date'),
                    controller: _date,
                    enabled: !blocked,
                    keyboardType: TextInputType.datetime,
                    decoration: InputDecoration(
                      labelText: context.tr(
                        'Date (YYYY-MM-DD)',
                        '日期（YYYY-MM-DD）',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('proactive-time'),
                    controller: _time,
                    enabled: !blocked,
                    keyboardType: TextInputType.datetime,
                    decoration: InputDecoration(
                      labelText: context.tr(
                        'Local time (HH:mm)',
                        '当地时间（HH:mm）',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('proactive-zone'),
                    controller: _zone,
                    enabled: !blocked,
                    decoration: InputDecoration(
                      labelText: context.tr('IANA time zone', 'IANA 时区'),
                    ),
                  ),
                  if (_timeError != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        _timeError!,
                        key: const Key('proactive-time-error'),
                      ),
                    ),
                  OutlinedButton(
                    key: const Key('proactive-resolve-time'),
                    onPressed: blocked || _resolving ? null : _resolve,
                    child: Text(context.tr('Verify this time', '核对这个时间')),
                  ),
                  if (quietSuggestion != null) ...[
                    Text(
                      context.tr(
                        'This time is within your quiet hours. Choose an allowed time and confirm it again.',
                        '这个时间位于安静时段内，请选择允许的时间并重新确认。',
                      ),
                    ),
                    OutlinedButton(
                      key: const Key('proactive-use-allowed-time'),
                      onPressed: blocked
                          ? null
                          : () {
                              final q = quietSuggestion;
                              _date.text =
                                  '${q.year.toString().padLeft(4, '0')}-${q.month.toString().padLeft(2, '0')}-${q.day.toString().padLeft(2, '0')}';
                              _time.text =
                                  '${q.hour.toString().padLeft(2, '0')}:${q.minute.toString().padLeft(2, '0')}';
                              unawaited(_resolve());
                            },
                      child: Text(
                        context.tr(
                          'Use ${quietSuggestion.year}-${quietSuggestion.month.toString().padLeft(2, '0')}-${quietSuggestion.day.toString().padLeft(2, '0')} ${quietSuggestion.hour.toString().padLeft(2, '0')}:${quietSuggestion.minute.toString().padLeft(2, '0')} and verify',
                          '改选 ${quietSuggestion.year}-${quietSuggestion.month.toString().padLeft(2, '0')}-${quietSuggestion.day.toString().padLeft(2, '0')} ${quietSuggestion.hour.toString().padLeft(2, '0')}:${quietSuggestion.minute.toString().padLeft(2, '0')} 并核对',
                        ),
                      ),
                    ),
                  ],
                  if (_candidates.length == 2)
                    Text(
                      context.tr(
                        'This time occurs twice. Choose the exact offset and instant.',
                        '这个当地时间出现两次，请明确选择时差与绝对时刻。',
                      ),
                    ),
                  RadioGroup<FollowUpTime>(
                    groupValue: _chosen,
                    onChanged: (value) {
                      if (!blocked) {
                        setState(() {
                          _chosen = value;
                          _confirmed = false;
                        });
                      }
                    },
                    child: Column(
                      children: [
                        for (final candidate in _candidates)
                          RadioListTile<FollowUpTime>(
                            key: ValueKey(
                              'proactive-time-${candidate.dueAt.toIso8601String()}',
                            ),
                            value: candidate,
                            enabled:
                                !blocked &&
                                candidate.dueAt.isAfter(
                                  ref.read(proactiveNowProvider)(),
                                ),
                            title: Text(
                              '${candidate.displayTime} · ${candidate.timeZone}',
                            ),
                            subtitle: Text(
                              '${candidate.offsetLabel}\n${candidate.dueAt.toIso8601String()}${candidate.dueAt.isAfter(ref.read(proactiveNowProvider)()) ? '' : context.tr('\nThis time has passed.', '\n这个时刻已过去。')}',
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (_changedDeviceZone != null) ...[
                    Text(
                      context.tr(
                        'The device time zone changed. Confirm which zone to use.',
                        '设备时区已变化，请明确选择使用哪个时区。',
                      ),
                    ),
                    TextButton(
                      key: const Key('proactive-keep-zone'),
                      onPressed: () => setState(() {
                        _deviceZone = _changedDeviceZone;
                        _changedDeviceZone = null;
                        _confirmed = false;
                      }),
                      child: Text(
                        context.tr('Keep the selected time zone', '保留已选时区'),
                      ),
                    ),
                    TextButton(
                      key: const Key('proactive-use-device-zone'),
                      onPressed: () {
                        final zone = _changedDeviceZone!;
                        _deviceZone = zone;
                        _changedDeviceZone = null;
                        _zone.text = zone;
                      },
                      child: Text(
                        context.tr(
                          'Use the current time zone and verify again',
                          '使用当前时区并重新核对',
                        ),
                      ),
                    ),
                  ],
                  CheckboxListTile(
                    key: const Key('proactive-confirm-time'),
                    contentPadding: EdgeInsets.zero,
                    value: _confirmed,
                    onChanged:
                        blocked || _chosen == null || quietSuggestion != null
                        ? null
                        : (value) => setState(() => _confirmed = value == true),
                    title: Text(
                      context.tr(
                        'I confirm this date, time, offset and time zone.',
                        '我确认这个日期、时间、时差与时区。',
                      ),
                    ),
                  ),
                  if (state.settings == null)
                    Text(
                      context.tr(
                        'Contact settings have not been confirmed.',
                        '联系设置尚未确认。',
                      ),
                    ),
                  if (state.settings == null ||
                      state.settingsUnconfirmed ||
                      state.settingsStale) ...[
                    Text(
                      context.tr(
                        'Settings are not confirmed. Check them before scheduling.',
                        '设置结果尚未确认，请先核对再预约。',
                      ),
                    ),
                    OutlinedButton(
                      key: const Key('proactive-check-settings'),
                      onPressed: state.settingsBusy
                          ? null
                          : () => ref
                                .read(proactiveControllerProvider.notifier)
                                .readSettings(),
                      child: Text(
                        context.tr('Check contact settings', '核对联系设置'),
                      ),
                    ),
                  ],
                  if (state.intents == null) ...[
                    Text(
                      context.tr(
                        'Active requests have not been confirmed. Check them before scheduling.',
                        '有效预约尚未核对，请先核对再预约。',
                      ),
                    ),
                    OutlinedButton(
                      key: const Key('proactive-check-active-intents'),
                      onPressed: state.intentsBusy
                          ? null
                          : () => ref
                                .read(proactiveControllerProvider.notifier)
                                .readActive(),
                      child: Text(
                        context.tr('Check active follow-ups', '核对有效预约'),
                      ),
                    ),
                  ],
                  if (pending != null) ...[
                    Text(
                      context.tr(
                        'Your follow-up may have been saved. Its status is not confirmed.',
                        '预约可能已保存，但结果尚未确认。',
                      ),
                    ),
                    OutlinedButton(
                      key: const Key('proactive-check-intent'),
                      onPressed: state.intentsBusy ? null : _checkIntent,
                      child: Text(context.tr('Check this follow-up', '核对这次预约')),
                    ),
                  ],
                  if (state.intents?.length == 3)
                    Text(
                      context.tr(
                        'You have 3 active follow-ups. Review or cancel one first.',
                        '你已有 3 个有效预约，请先查看或取消一个。',
                      ),
                    ),
                  if (_receipt != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        '${followUpIntentCopy(context, _receipt!)}\n${_receipt!.dueAt.toIso8601String()}',
                        key: const Key('proactive-receipt'),
                      ),
                    ),
                  FilledButton(
                    key: const Key('proactive-schedule'),
                    onPressed:
                        blocked ||
                            quietSuggestion != null ||
                            _receipt != null ||
                            !_confirmed ||
                            _chosen == null ||
                            !(enableNeeded
                                ? state.canChangeSettings
                                : state.canSchedule)
                        ? null
                        : _submit,
                    child: Text(
                      enableNeeded
                          ? context.tr('Turn on and continue', '开启并继续')
                          : context.tr('Confirm one follow-up', '确认一次跟进'),
                    ),
                  ),
                  if (_receipt != null)
                    TextButton(
                      key: const Key('proactive-done'),
                      onPressed: widget.onBack,
                      child: Text(context.tr('Return to chat', '返回聊天')),
                    ),
                ],
                if (state.failure != null)
                  ProactiveFailureNotice(failure: state.failure!),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
