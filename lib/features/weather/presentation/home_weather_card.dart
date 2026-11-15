import 'package:enmori/core/presentation/enmori_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'home_weather_controller.dart';
import 'weather_card.dart';
import 'weather_feedback.dart';

final class HomeWeatherCard extends ConsumerStatefulWidget {
  const HomeWeatherCard({
    required this.openAttribution,
    this.onOpenSettings,
    super.key,
  });
  final Future<bool> Function(Uri) openAttribution;
  final VoidCallback? onOpenSettings;
  @override
  ConsumerState<HomeWeatherCard> createState() => _HomeWeatherCardState();
}

final class _HomeWeatherCardState extends ConsumerState<HomeWeatherCard>
    with WidgetsBindingObserver {
  HomeWeatherController get controller =>
      ref.read(homeWeatherControllerProvider.notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) controller.openHome();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (mounted &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached)) {
      controller.suspend();
    }
  }

  static const _disclosure =
      'ENMORI will obtain one foreground location, round it to 0.1°, and send the approximate coordinate through its Backend to Open-Meteo. Open-Meteo may retain request metadata. No precise point, identity or Check-in is sent. Choose automatic weather to remember this preference, refresh at most every 15 minutes while on Home, and change it anytime in Settings. No background tracking. Separate from Check-in weather.';

  Future<void> _requestWeather() async {
    final state = ref.read(homeWeatherControllerProvider);

    final epoch = controller.epoch;
    if (state.automatic) {
      await controller.load(expectedEpoch: epoch);
      return;
    }
    final allowed = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.tr('Allow current weather?', "允许获取当前天气？")),
        content: SingleChildScrollView(
          child: Text(
            context.tr(
              _disclosure,
              "ENMORI 会在前台获取一次位置，将坐标四舍五入到 0.1°，再通过后端发送大致坐标给 Open-Meteo。Open-Meteo 可能保留请求元数据，不会收到精确坐标、身份或签到内容。选择自动获取天气会保存此偏好，在首页时自动刷新间隔至少 15 分钟，可随时在设置中更改。不进行后台追踪，且独立于签到天气设置。",
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(context.tr('Not now', "暂不")),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'once'),
            child: Text(context.tr('Only this time', "仅这一次")),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'auto'),
            child: Text(context.tr('Automatically on Home', "在首页自动获取")),
          ),
        ],
      ),
    );
    if (mounted && allowed != null) {
      await controller.load(expectedEpoch: epoch, remember: allowed == 'auto');
    }
  }

  void _showInfo() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(context.tr('About Home weather', "关于首页天气")),
      content: SingleChildScrollView(
        child: Text(
          context.tr(
            _disclosure,
            "ENMORI 会在前台获取一次位置，将坐标四舍五入到 0.1°，再通过后端发送大致坐标给 Open-Meteo。Open-Meteo 可能保留请求元数据，不会收到精确坐标、身份或签到内容。选择自动获取天气会保存此偏好，在首页时自动刷新间隔至少 15 分钟，可随时在设置中更改。不进行后台追踪，且独立于签到天气设置。",
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(context.tr('Done', "完成")),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeWeatherControllerProvider);
    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (state.weather != null)
          IconButton(
            tooltip: context.tr('Refresh weather', "刷新天气"),
            onPressed: state.busy ? null : _requestWeather,
            icon: const Icon(Icons.refresh),
          ),
        PopupMenuButton<String>(
          tooltip: context.tr('Weather options', "天气选项"),
          onSelected: (action) {
            if (action == 'clear') {
              controller.clear();
            } else if (action == 'settings') {
              widget.onOpenSettings?.call();
            } else {
              _showInfo();
            }
          },
          itemBuilder: (_) => [
            PopupMenuItem(
              value: 'info',
              child: Text(context.tr('About Home weather', "关于首页天气")),
            ),
            if (widget.onOpenSettings != null)
              PopupMenuItem(
                value: 'settings',
                child: Text(context.tr('Weather settings', "天气设置")),
              ),
            if (state.weather != null)
              PopupMenuItem(
                value: 'clear',
                child: Text(context.tr('Clear weather', "清除天气")),
              ),
          ],
        ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.weather == null)
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: EdgeInsets.zero,
                  ),
                  onPressed: state.busy ? null : _requestWeather,
                  icon: const Icon(Icons.cloud_outlined),
                  label: Text(
                    state.busy
                        ? context.tr('Getting current weather…', '正在获取天气…')
                        : context.tr('Add today’s weather', "添加今日天气"),
                  ),
                ),
              ),
              actions,
            ],
          ),
        if (state.weather == null)
          Text(
            state.automatic
                ? context.tr('Approximate location · auto on', "大致位置 · 自动获取已开启")
                : context.tr('Optional · approximate location', "可选 · 大致位置"),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        if (state.weather case final weather?)
          WeatherCard(
            snapshot: weather,
            showUpdated: true,
            compact: true,
            contextLabel: state.automatic
                ? context.tr('Approximate location · auto on', '大致位置 · 自动获取已开启')
                : context.tr('Approximate location', '大致位置'),
            actions: actions,
            openAttribution: widget.openAttribution,
          ),
        if (state.failure case final failure?)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Semantics(
              liveRegion: true,
              child: Text(weatherFeedback(context, failure)),
            ),
          ),
        if (state.busy)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(
              semanticsLabel: context.tr('Getting current weather', "正在获取当前天气"),
            ),
          ),
      ],
    );
  }
}
