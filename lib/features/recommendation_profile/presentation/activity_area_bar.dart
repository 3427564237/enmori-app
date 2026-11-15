import '../../../core/result/result.dart';
import '../domain/recommendation_profile.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../recommendation_profile_providers.dart';
import 'recommendation_profile_page.dart';

class ActivityAreaBar extends ConsumerStatefulWidget {
  const ActivityAreaBar({super.key});
  @override
  ConsumerState<ActivityAreaBar> createState() => _AreaBarState();
}

class _AreaBarState extends ConsumerState<ActivityAreaBar>
    with WidgetsBindingObserver {
  bool _choosingArea = false;
  bool _loadingAreas = false;
  bool _areasFailed = false;

  Future<void> _chooseArea({bool retry = false}) async {
    if (_choosingArea) return;
    final refresh =
        retry || _areasFailed || ref.read(planningAreasProvider).hasError;
    setState(() {
      _choosingArea = true;
      _loadingAreas = true;
      _areasFailed = false;
    });
    try {
      if (refresh) ref.invalidate(planningAreasProvider);
      final rows = await ref.read(planningAreasProvider.future);
      if (!mounted) return;
      setState(() => _loadingAreas = false);
      if (rows.isEmpty) {
        setState(() => _areasFailed = true);
        return;
      }
      final selected = await choosePlanningArea(context, rows);
      if (selected != null && mounted) {
        ref.read(activityAreaProvider.notifier).manual(selected);
      }
    } catch (_) {
      if (mounted) setState(() => _areasFailed = true);
    } finally {
      if (mounted) {
        setState(() {
          _choosingArea = false;
          _loadingAreas = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(activityAreaProvider.notifier).refresh();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.resumed) {
      ref.read(activityAreaProvider.notifier).refresh();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = ref.watch(activityAreaProvider);
    final p = ref.watch(recommendationProfileProvider).asData?.value;
    return Column(
      key: const Key('home-recommendation-area'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('Activity recommendation area', '活动推荐地区'),
          style: Theme.of(context).textTheme.labelMedium,
        ),
        if (p case Success<RecommendationProfile>(:final value)
            when !value.onboardingPromptSeen)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.person_outline),
            title: Text(
              context.tr('Complete your recommendation profile', '补全推荐资料'),
            ),
            subtitle: Text(
              context.tr(
                'Optional area, birthday and discovery preferences',
                '可选填地区、生日与好友发现偏好',
              ),
            ),
            onTap: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => const RecommendationProfilePage(),
              ),
            ),
          ),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            TextButton.icon(
              key: const Key('home-choose-recommendation-area'),
              icon: const Icon(Icons.place_outlined),
              label: Text(a.name ?? context.tr('All Singapore', '全新加坡')),
              onPressed: _choosingArea ? null : _chooseArea,
            ),
            Text(
              context.tr(a.source, switch (a.source) {
                'Selected area' => '手动选择',
                'Current area' => '当前地区',
                'Home area' => '常用地区',
                'Profile unavailable' => '资料读取失败',
                _ => '全新加坡',
              }),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (a.source == 'Selected area')
              TextButton(
                onPressed: () =>
                    ref.read(activityAreaProvider.notifier).manual(null),
                child: Text(context.tr('Restore automatic', '恢复自动')),
              ),
          ],
        ),
        if (_loadingAreas)
          LinearProgressIndicator(
            semanticsLabel: context.tr('Loading areas', '正在加载地区'),
          ),
        if (_areasFailed) ...[
          Semantics(
            liveRegion: true,
            child: Text(
              context.tr('Areas couldn’t be loaded.', '无法加载地区。'),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
          TextButton(
            onPressed: _choosingArea ? null : () => _chooseArea(retry: true),
            child: Text(context.tr('Retry areas', '重新加载地区')),
          ),
        ],
        if (a.failed)
          Text(
            context.tr(
              a.source == 'Profile unavailable'
                  ? 'Could not read recommendation settings. Refresh to retry.'
                  : 'Location unavailable; using your home area or all Singapore.',
              a.source == 'Profile unavailable'
                  ? '无法读取推荐设置，请刷新重试。'
                  : '定位不可用，已使用常用地区或全新加坡。',
            ),
          ),
      ],
    );
  }
}
