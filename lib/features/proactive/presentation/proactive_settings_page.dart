import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/content_access.dart';
import '../proactive_providers.dart';
import 'proactive_status.dart';

final class ProactiveSettingsPage extends ConsumerStatefulWidget {
  const ProactiveSettingsPage({
    required this.onBack,
    this.pushControls,
    super.key,
  });
  final VoidCallback onBack;
  final Widget? pushControls;
  @override
  ConsumerState<ProactiveSettingsPage> createState() =>
      _ProactiveSettingsPageState();
}

final class _ProactiveSettingsPageState
    extends ConsumerState<ProactiveSettingsPage> {
  final _zone = TextEditingController();
  late final Object _session;
  bool _confirmedZone = false;
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
    _zone.addListener(() {
      if (mounted) setState(() => _confirmedZone = false);
    });
    ref.listenManual(proactiveControllerProvider, (_, next) {
      if (next.sessionKey != _session || !next.authenticated) _retire();
    });
    ref.listenManual(contentAccessProvider, (_, _) => _retire());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_owns) {
        unawaited(ref.read(proactiveControllerProvider.notifier).load());
      }
    });
  }

  void _retire() {
    _retired = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _zone.clear();
      setState(() => _confirmedZone = false);
    });
  }

  @override
  void dispose() {
    _zone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(proactiveControllerProvider);
    final settings = state.settings;
    final controller = ref.read(proactiveControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: context.tr('Back', '返回'),
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(context.tr('Manage later contacts', '管理预约')),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              key: const Key('proactive-settings-page'),
              padding: const EdgeInsets.all(20),
              children: [
                if (!_owns)
                  Text(
                    context.tr(
                      'Return and sign in again to continue.',
                      '请返回并重新登录后继续。',
                    ),
                  )
                else ...[
                  Text(
                    context.tr(
                      'A later contact about a message you sent',
                      '围绕已发送的消息，约定稍后联系一次',
                    ),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  ?widget.pushControls,
                  const SizedBox(height: 12),
                  if (settings == null &&
                      !state.settingsBusy &&
                      state.failure != null)
                    Text(
                      context.tr(
                        'Scheduling is temporarily unavailable. You can retry loading; your chat and draft are kept.',
                        '预约暂时不可用，可重试加载；对话和草稿仍保留。',
                      ),
                      key: const Key('proactive-service-unavailable'),
                    ),
                  Text(
                    context.tr(
                      'Local model · at most once per rolling 24 hours · 8-hour cooldown · at most 3 active requests.',
                      '本地模型 · 每滚动 24 小时最多一次 · 冷却 8 小时 · 最多 3 个有效预约。',
                    ),
                  ),
                  if (settings == null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        context.tr(
                          'Contact settings have not been confirmed.',
                          '联系设置尚未确认。',
                        ),
                      ),
                    )
                  else ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(switch (settings.mode) {
                        ProactiveMode.off => context.tr(
                          'Later contacts are off',
                          '稍后联系已关闭',
                        ),
                        ProactiveMode.on => context.tr(
                          'Later contacts are on',
                          '稍后联系已开启',
                        ),
                        ProactiveMode.paused =>
                          settings.pausedUntil == null
                              ? context.tr(
                                  'Paused until you resume',
                                  '已暂停，直到你恢复',
                                )
                              : context.tr(
                                  'Paused until ${settings.pausedUntil!.toIso8601String()} · ${settings.timeZone}',
                                  '已暂停至 ${settings.pausedUntil!.toIso8601String()} · ${settings.timeZone}',
                                ),
                      }, key: const Key('proactive-mode')),
                    ),
                    Text(
                      context.tr(
                        'Confirmed time zone: ${settings.timeZone.isEmpty ? 'not selected' : settings.timeZone}',
                        '已确认时区：${settings.timeZone.isEmpty ? '尚未选择' : settings.timeZone}',
                      ),
                    ),
                    Text(switch (settings.quiet) {
                      ProactiveQuietDisabled() => context.tr(
                        'Quiet hours are disabled.',
                        '安静时段已关闭。',
                      ),
                      ProactiveQuietWindow(
                        :final startMinute,
                        :final endMinute,
                      ) =>
                        context.tr(
                          'Quiet hours: ${_clock(startMinute)}–${_clock(endMinute)} · ${settings.timeZone}',
                          '安静时段：${_clock(startMinute)}–${_clock(endMinute)} · ${settings.timeZone}',
                        ),
                    }),
                    Text(
                      settings.pushEnabled
                          ? context.tr(
                              'Push status has not been checked.',
                              '尚未核对系统推送状态。',
                            )
                          : context.tr(
                              'System push is off. Check follow-ups in the app.',
                              '系统推送已关闭，请在 App 内查看跟进。',
                            ),
                    ),
                    if (settings.mode != ProactiveMode.on) ...[
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('proactive-settings-zone'),
                        controller: _zone,
                        enabled: state.canChangeSettings,
                        decoration: InputDecoration(
                          labelText: context.tr(
                            'Confirm IANA time zone to turn on',
                            '开启前确认 IANA 时区',
                          ),
                        ),
                      ),
                      CheckboxListTile(
                        key: const Key('proactive-settings-confirm-zone'),
                        contentPadding: EdgeInsets.zero,
                        value: _confirmedZone,
                        onChanged:
                            state.canChangeSettings && _zone.text.isNotEmpty
                            ? (value) =>
                                  setState(() => _confirmedZone = value == true)
                            : null,
                        title: Text(
                          context.tr(
                            'Allow this one follow-up category in this time zone.',
                            '允许在这个时区内进行明确跟进。',
                          ),
                        ),
                      ),
                      FilledButton(
                        key: const Key('proactive-turn-on'),
                        onPressed: state.canChangeSettings && _confirmedZone
                            ? () => controller.changeMode(
                                ProactiveMode.on,
                                confirmedZone: _zone.text,
                              )
                            : null,
                        child: Text(context.tr('Turn on', '开启')),
                      ),
                    ],
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton(
                          key: const Key('proactive-turn-off'),
                          onPressed:
                              state.canChangeSettings &&
                                  settings.mode != ProactiveMode.off
                              ? () => controller.changeMode(ProactiveMode.off)
                              : null,
                          child: Text(context.tr('Turn off', '关闭')),
                        ),
                        OutlinedButton(
                          key: const Key('proactive-pause'),
                          onPressed:
                              state.canChangeSettings &&
                                  settings.mode == ProactiveMode.on
                              ? () =>
                                    controller.changeMode(ProactiveMode.paused)
                              : null,
                          child: Text(
                            context.tr('Pause until I resume', '暂停，直到我恢复'),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      context.tr(
                        'Turning off cancels work that has not begun. Turning on again does not restore it. Already submitted notifications may not be recalled.',
                        '关闭会取消尚未开始的工作，再次开启不会恢复它。已提交的通知可能无法撤回。',
                      ),
                    ),
                  ],
                  if (state.failure != null)
                    ProactiveFailureNotice(failure: state.failure!),
                  OutlinedButton(
                    key: const Key('proactive-reload-settings'),
                    onPressed: state.settingsBusy
                        ? null
                        : controller.readSettings,
                    child: Text(context.tr('Check contact settings', '核对联系设置')),
                  ),
                  if (state.settingsUnconfirmed)
                    Text(
                      context.tr(
                        'Settings are not confirmed. Check them before scheduling.',
                        '设置结果尚未确认，请先核对再预约。',
                      ),
                    ),
                  const SizedBox(height: 24),
                  Text(
                    context.tr('Active follow-ups', '有效预约'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (state.pendingIntent != null) ...[
                    Text(
                      context.tr(
                        'This request is not confirmed. Check the original follow-up before making another.',
                        '这次请求尚未确认，请先核对原预约。',
                      ),
                    ),
                    OutlinedButton(
                      key: const Key('proactive-settings-check-intent'),
                      onPressed: state.intentsBusy
                          ? null
                          : () => controller.checkPendingIntent(),
                      child: Text(context.tr('Check this follow-up', '核对这次预约')),
                    ),
                  ],
                  if (state.lastIntent != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        followUpIntentCopy(context, state.lastIntent!),
                      ),
                    ),
                  if (state.intents == null)
                    Text(
                      context.tr(
                        'Active requests have not been confirmed.',
                        '有效预约尚未核对。',
                      ),
                    )
                  else if (state.intents!.isEmpty)
                    Text(
                      context.tr('No active follow-up requests.', '当前没有有效预约。'),
                    )
                  else
                    for (final intent in state.intents!)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(followUpIntentCopy(context, intent)),
                              Text('${intent.dueAt.toIso8601String()} · UTC'),
                              TextButton(
                                key: ValueKey(
                                  'proactive-cancel-${intent.intentId}',
                                ),
                                onPressed:
                                    state.intentsBusy ||
                                        state.pendingIntent != null
                                    ? null
                                    : () => controller.cancel(intent),
                                child: Text(
                                  context.tr('Cancel this follow-up', '取消这次跟进'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  OutlinedButton(
                    key: const Key('proactive-reload-intents'),
                    onPressed: state.intentsBusy ? null : controller.readActive,
                    child: Text(
                      context.tr('Check active follow-ups', '核对有效预约'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _clock(int minute) =>
    '${(minute ~/ 60).toString().padLeft(2, '0')}:${(minute % 60).toString().padLeft(2, '0')}';
