import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import 'check_in_copy.dart';
import 'check_in_place_controller.dart';

/// Feature slot for the existing Check-in editor. A fresh draftKey is allocated
/// per composer. The host passes state.place to the located save command.
final class CheckInPlaceControls extends ConsumerStatefulWidget {
  const CheckInPlaceControls({
    required this.draftKey,
    this.saving = false,
    this.defaultLocationAuthorized = false,
    this.defaultWeatherAuthorized = false,
    super.key,
  });
  final Object draftKey;
  final bool saving;
  final bool defaultLocationAuthorized, defaultWeatherAuthorized;
  @override
  ConsumerState<CheckInPlaceControls> createState() =>
      _CheckInPlaceControlsState();
}

final class _CheckInPlaceControlsState
    extends ConsumerState<CheckInPlaceControls>
    with WidgetsBindingObserver {
  CheckInPlaceController get controller =>
      ref.read(checkInPlaceControllerProvider(widget.draftKey).notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Native permission sheets may be inactive while remaining foreground.
    // Real background transitions invalidate the pending single observation.
    if (mounted &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached) &&
        !widget.saving) {
      controller.clear();
    }
  }

  Future<bool> _confirm(String title, String text, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(child: Text(text)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('Not now', '暂不使用')),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ==
      true;
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInPlaceControllerProvider(widget.draftKey)),
        disabled = state.busy || widget.saving;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: MotionSize(
          alignment: Alignment.topCenter,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr('Location for this Check-in', '本次签到的位置'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                context.tr(
                  'Optional. One foreground location only; no background tracking. Map sharing starts off and is controlled separately in Settings.',
                  '可选。仅在前台获取一次位置，不在后台跟踪。地图分享默认关闭，可在设置中单独管理。',
                ),
              ),
              if (state.place case final place?) ...[
                Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    context.tr(
                      'One Check-in point is ready to save.',
                      '已获取本次签到位置，可以保存。',
                    ),
                  ),
                ),
                OutlinedButton(
                  onPressed: disabled ? null : controller.clear,
                  child: Text(context.tr('Remove location', '移除位置')),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    context.tr('Add weather to this Check-in', '为本次签到附加天气'),
                  ),
                  value: place.includeWeather,
                  onChanged: disabled
                      ? null
                      : (enabled) async {
                          final epoch = controller.epoch;
                          if (enabled &&
                              !widget.defaultWeatherAuthorized &&
                              !await _confirm(
                                context.tr('Allow weather lookup?', '允许查询天气？'),
                                context.tr(
                                  'ENMORI will send a coordinate rounded to 0.1° through its Backend to Open-Meteo for current conditions. Open-Meteo can retain request metadata under its terms. No precise Check-in point or Note is sent. Weather failure still allows saving.',
                                  'ENMORI 将通过后端向 Open-Meteo 发送粗化至 0.1° 的坐标以查询当前天气。Open-Meteo 可按其条款保留请求元数据，不会收到精确签到位置或笔记。天气查询失败仍可保存签到。',
                                ),
                                context.tr('Allow once', '允许一次'),
                              )) {
                            return;
                          }
                          if (mounted) {
                            await controller.allowWeather(
                              enabled,
                              expectedEpoch: epoch,
                            );
                          }
                        },
                ),
              ] else
                OutlinedButton.icon(
                  icon: const Icon(Icons.my_location),
                  label: Text(context.tr('Use location once', '使用一次位置')),
                  onPressed: disabled
                      ? null
                      : () async {
                          final epoch = controller.epoch;
                          if ((widget.defaultLocationAuthorized ||
                                  await _confirm(
                                    context.tr(
                                      'Save a precise Check-in point?',
                                      '保存精确签到位置？',
                                    ),
                                    context.tr(
                                      'Use your current precise location once while this app is open. The point is saved with this Check-in. Friends can see it on your map only when Check-in visibility, location privacy and map sharing all allow it.',
                                      '仅在应用打开时获取一次当前位置，随这条签到保存。只有签到可见范围、位置隐私和地图分享均允许时，好友才能在地图中看到该位置。',
                                    ),
                                    context.tr('Use once', '使用一次'),
                                  )) &&
                              mounted) {
                            await controller.capture(expectedEpoch: epoch);
                          }
                        },
                ),
              if (state.busy)
                Semantics(
                  liveRegion: true,
                  child: Text(context.tr('Checking permission…', '正在检查权限…')),
                ),
              if (state.failure case final failure?)
                Semantics(
                  liveRegion: true,
                  child: Text(checkInFailureText(context, failure)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
