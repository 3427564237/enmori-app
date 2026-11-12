import '../../account/account_preferences_providers.dart';
import '../../account/domain/account_preferences_repository.dart';
import '../../../core/presentation/identity_avatar.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../account/content_access.dart';
import '../domain/recommendation_profile.dart';
import '../recommendation_profile_providers.dart';

Future<PlanningArea?> choosePlanningArea(
  BuildContext context,
  List<PlanningArea> areas,
) => showModalBottomSheet<PlanningArea>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (context) => _AreaPicker(areas: areas),
);

class _AreaPicker extends StatefulWidget {
  const _AreaPicker({required this.areas});
  final List<PlanningArea> areas;
  @override
  State<_AreaPicker> createState() => _AreaPickerState();
}

class _AreaPickerState extends State<_AreaPicker> {
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final availableHeight = MediaQuery.sizeOf(context).height - keyboardInset;
    final rows = widget.areas
        .where(
          (a) => '${a.name} ${a.regionName} ${a.code}'.toLowerCase().contains(
            _query.toLowerCase(),
          ),
        )
        .toList();
    return Padding(
      padding: EdgeInsets.only(bottom: keyboardInset),
      child: SizedBox(
        height: keyboardInset > 0 ? availableHeight : availableHeight * .75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                autofocus: true,
                decoration: InputDecoration(
                  labelText: context.tr('Search Singapore areas', '搜索新加坡地区'),
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            Expanded(
              child: rows.isEmpty
                  ? Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            context.tr(
                              'No matching areas. Try another search.',
                              '没有匹配的地区，请尝试其他搜索词。',
                            ),
                          ),
                        ),
                      ),
                    )
                  : ListView.builder(
                      itemCount: rows.length,
                      itemBuilder: (context, i) => ListTile(
                        title: Text(rows[i].name),
                        subtitle: Text(rows[i].regionName),
                        onTap: () => Navigator.pop(context, rows[i]),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class RecommendationProfilePage extends ConsumerStatefulWidget {
  const RecommendationProfilePage({super.key});
  @override
  ConsumerState<RecommendationProfilePage> createState() => _ProfileState();
}

class _ProfileState extends ConsumerState<RecommendationProfilePage> {
  RecommendationProfile? _base;
  String? _birth, _area;
  bool _auto = false,
      _discover = false,
      _interests = false,
      _region = false,
      _affiliation = false,
      _age = false,
      _busy = false,
      _dirty = false,
      _uncertain = false;
  String? _error;
  bool _opening = true;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _readFresh();
    });
  }

  Future<void> _readFresh() async {
    final session = ref.read(authSessionProvider).asData?.value;
    setState(() => _opening = true);
    final result = await ref
        .read(recommendationProfileRepositoryProvider)
        .read();
    if (!mounted ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    setState(() {
      _opening = false;
      if (result case Success<RecommendationProfile>(:final value)) {
        _load(value);
      }
    });
  }

  Object? _session;
  bool _sessionInitialized = false;
  bool _allowExit = false;
  bool _exitDialogOpen = false;
  bool get _current =>
      mounted &&
      identical(_session, ref.read(authSessionProvider).asData?.value);
  void _load(RecommendationProfile p) {
    _base = p;
    _birth = p.birthDate;
    _area = p.homeAreaCode;
    _auto = p.autoActivityLocation;
    _discover = p.discoverable;
    _interests = p.matchInterests;
    _region = p.matchRegion;
    _affiliation = p.matchAffiliation;
    _age = p.matchAge;
  }

  RecommendationProfile _draft() => RecommendationProfile(
    birthDate: _birth,
    homeAreaCode: _area,
    autoActivityLocation: _auto,
    discoverable: _discover,
    matchInterests: _interests,
    matchRegion: _region,
    matchAffiliation: _affiliation,
    matchAge: _age,
    onboardingPromptSeen: true,
    revision: _base!.revision,
  );
  Future<void> _save() async {
    if (!_current || _busy || _uncertain) return;
    final repo = ref.read(recommendationProfileRepositoryProvider),
        session = ref.read(authSessionProvider).asData?.value;
    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await repo.save(_draft());
    if (!mounted ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    if (result case Success<RecommendationProfile>(:final value)) {
      setState(() {
        _load(value);
        _dirty = false;
        _busy = false;
        _uncertain = false;
      });
      ref.invalidate(recommendationProfileProvider);
      ref.read(contentAccessProvider.notifier).mutationSettled(session);
      await ref.read(activityAreaProvider.notifier).refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.tr('Recommendation profile saved', '推荐资料已保存'),
            ),
          ),
        );
      }
    } else {
      setState(() {
        _busy = false;
        _uncertain = true;
        _error = context.tr(
          'Save was not confirmed. Your draft is kept. Read the saved version before trying again.',
          '保存未确认，草稿已保留。请先读取已保存版本再重试。',
        );
      });
    }
  }

  Future<void> _recover() async {
    if (!_current || _busy) return;
    setState(() => _busy = true);
    final r = await ref.read(recommendationProfileRepositoryProvider).read();
    if (!mounted ||
        !identical(_session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    if (r case Success<RecommendationProfile>(:final value)) {
      final areas =
          ref.read(planningAreasProvider).asData?.value ?? <PlanningArea>[];
      final replace = await showDialog<bool>(
        context: context,
        builder: (c) => Consumer(
          builder: (context, ref, _) {
            if (!identical(
              _session,
              ref.watch(authSessionProvider).asData?.value,
            )) {
              return AlertDialog(
                title: Text(
                  context.tr(
                    'Session changed. Reopen this page.',
                    '登录状态已变化，请重新打开此页。',
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(c),
                    child: Text(context.tr('Done', '完成')),
                  ),
                ],
              );
            }
            return AlertDialog(
              title: Text(context.tr('Review saved version', '核对已保存版本')),
              content: _savedComparison(value, areas),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(c, false),
                  child: Text(context.tr('Keep draft', '保留草稿')),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(c, true),
                  child: Text(context.tr('Load saved', '加载已保存')),
                ),
              ],
            );
          },
        ),
      );
      if (!_current) return;
      setState(() {
        _busy = false;
        if (replace == null) return;
        if (replace == true) {
          _load(value);
          _dirty = false;
        } else {
          _base = value;
        }
        _uncertain = false;
        _error = null;
      });
    } else {
      setState(() {
        _busy = false;
        _error = context.tr(
          'Unable to read the saved version. Your draft is kept. Try reading again.',
          '无法读取已保存版本，草稿已保留，请重试读取。',
        );
      });
    }
  }

  Widget _savedComparison(
    RecommendationProfile saved,
    List<PlanningArea> areas,
  ) {
    String areaName(String? code) => code == null
        ? context.tr('Not set', '未填写')
        : areas.where((area) => area.code == code).firstOrNull?.name ?? code;
    String enabled(bool value) =>
        value ? context.tr('On', '开启') : context.tr('Off', '关闭');
    final rows = [
      (
        context.tr('Home area', '常用地区'),
        areaName(saved.homeAreaCode),
        areaName(_area),
      ),
      (
        context.tr('Birthday', '生日'),
        saved.birthDate ?? context.tr('Not set', '未填写'),
        _birth ?? context.tr('Not set', '未填写'),
      ),
      (
        context.tr('Discoverable', '允许被推荐'),
        enabled(saved.discoverable),
        enabled(_discover),
      ),
      (
        context.tr('Automatic area', '自动活动地区'),
        enabled(saved.autoActivityLocation),
        enabled(_auto),
      ),
      (
        context.tr('Match interests', '匹配兴趣'),
        enabled(saved.matchInterests),
        enabled(_interests),
      ),
      (
        context.tr('Match home area', '匹配地区'),
        enabled(saved.matchRegion),
        enabled(_region),
      ),
      (
        context.tr('Match school / organisation', '匹配学校／组织'),
        enabled(saved.matchAffiliation),
        enabled(_affiliation),
      ),
      (context.tr('Match age', '匹配年龄'), enabled(saved.matchAge), enabled(_age)),
    ];
    TableRow row(List<String> values, {bool heading = false}) => TableRow(
      children: [
        for (final value in values)
          Padding(
            padding: const EdgeInsets.fromLTRB(0, 6, 8, 6),
            child: Text(
              value,
              style: heading
                  ? const TextStyle(fontWeight: FontWeight.w600)
                  : null,
            ),
          ),
      ],
    );
    return SizedBox(
      width: 360,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Table(
              columnWidths: const {0: FlexColumnWidth(1.4)},
              children: [
                row([
                  context.tr('Setting', '设置'),
                  context.tr('Saved', '已保存'),
                  context.tr('Your draft', '你的草稿'),
                ], heading: true),
                for (final values in rows)
                  row([values.$1, values.$2, values.$3]),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Load all saved settings, or keep your draft and save it explicitly.',
                '可加载所有已保存设置，或保留草稿后明确重新保存。',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider).asData?.value;
    if (!_sessionInitialized) {
      _session = session;
      _sessionInitialized = true;
    }
    if (!identical(_session, session)) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Text(
            context.tr(
              'Session changed. Reopen this page.',
              '登录状态已变化，请重新打开此页。',
            ),
          ),
        ),
      );
    }
    final subject = ref.watch(currentAuthSubjectProvider);
    final own = subject == null
        ? null
        : ref.watch(ownProfileDetailsProvider(subject)).asData?.value;
    final areaState = ref.watch(planningAreasProvider);
    final areas = areaState.asData?.value ?? <PlanningArea>[];
    final areasReady = areaState.hasValue && areas.isNotEmpty;
    if (_opening || _base == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(context.tr('Recommendation profile', '推荐资料')),
        ),
        body: Center(
          child: _opening
              ? const CircularProgressIndicator()
              : TextButton(
                  onPressed: _readFresh,
                  child: Text(context.tr('Unable to load. Retry', '读取失败，重试')),
                ),
        ),
      );
    }
    final legacy = own is Success<OwnProfile> ? own.value.details.region : null;
    final migration = legacy == null
        ? null
        : areas
              .where(
                (a) =>
                    a.name.toLowerCase() == legacy.trim().toLowerCase() ||
                    a.code == legacy.trim(),
              )
              .singleOrNull;
    void change(VoidCallback f) {
      if (!_current) return;
      setState(() {
        f();
        _dirty = true;
      });
    }

    return PopScope(
      canPop: _allowExit || (!_dirty && !_busy && !_uncertain),
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || !_current || _exitDialogOpen) return;
        if (_busy) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(
                content: Text(
                  _uncertain
                      ? context.tr(
                          'Reading saved settings. Please wait.',
                          '正在读取已保存设置，请稍候。',
                        )
                      : context.tr(
                          'Your save has been sent. Wait for the result before leaving.',
                          '保存请求已发出，请等待结果后再离开。',
                        ),
                ),
              ),
            );
          return;
        }
        _exitDialogOpen = true;
        final leave = await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: Text(
              _uncertain
                  ? context.tr('Save result not confirmed', '保存结果尚未确认')
                  : context.tr('Discard unsaved changes?', '放弃未保存的修改？'),
            ),
            content: _uncertain
                ? Text(
                    context.tr(
                      'Your save may already have completed. Leaving will not cancel it. You can reopen this page to check the saved version; your local draft will be lost.',
                      '保存可能已经完成，离开不会取消这次保存。之后可以重新打开此页核对已保存版本，但当前本地草稿将丢失。',
                    ),
                  )
                : null,
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(c, false),
                child: Text(
                  _uncertain
                      ? context.tr('Stay and check', '留下核对')
                      : context.tr('Keep editing', '继续编辑'),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(c, true),
                child: Text(
                  _uncertain
                      ? context.tr('Leave page', '离开此页')
                      : context.tr('Discard', '放弃'),
                ),
              ),
            ],
          ),
        );
        _exitDialogOpen = false;
        if (leave == true && _current) {
          setState(() => _allowExit = true);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_current) Navigator.pop(context);
          });
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('Recommendation profile', '推荐资料')),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              context.tr(
                'Optional information helps find relevant activities and people. Birthday and device coordinates are never shown on your discovery card.',
                '这些选填信息用于推荐活动和认识朋友。生日和设备坐标不会显示在发现名片上。',
              ),
            ),
            if (_area == null && migration != null)
              TextButton(
                onPressed: _busy
                    ? null
                    : () => change(() => _area = migration.code),
                child: Text(
                  context.tr(
                    'Use saved area: ${migration.name}',
                    '使用原地区：${migration.name}',
                  ),
                ),
              ),
            ListTile(
              key: const Key('recommendation-home-area'),
              contentPadding: EdgeInsets.zero,
              title: Text(context.tr('Home area', '常用地区')),
              subtitle: Text(
                areas.where((a) => a.code == _area).firstOrNull?.name ??
                    _area ??
                    context.tr('Not set', '未选择'),
              ),
              trailing: Wrap(
                children: [
                  if (_area != null)
                    IconButton(
                      tooltip: context.tr('Clear', '清除'),
                      onPressed: _busy
                          ? null
                          : () => change(() => _area = null),
                      icon: const Icon(Icons.clear),
                    ),
                  const Icon(Icons.chevron_right),
                ],
              ),
              onTap: _busy || !areasReady
                  ? null
                  : () async {
                      final a = await choosePlanningArea(context, areas);
                      if (a != null && mounted) change(() => _area = a.code);
                    },
            ),
            if (areaState.isLoading)
              LinearProgressIndicator(
                semanticsLabel: context.tr('Loading areas', '正在加载地区'),
              )
            else if (!areasReady) ...[
              Semantics(
                liveRegion: true,
                child: Text(
                  context.tr('Areas couldn’t be loaded.', '无法加载地区。'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
              TextButton(
                onPressed: () => ref.invalidate(planningAreasProvider),
                child: Text(context.tr('Retry areas', '重新加载地区')),
              ),
            ],
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(context.tr('Automatic activity area', '自动更新活动地区')),
              subtitle: Text(
                context.tr(
                  'Only while using the app. Does not change your home area.',
                  '仅使用应用时定位，不修改常用地区。',
                ),
              ),
              value: _auto,
              onChanged: _busy ? null : (v) => change(() => _auto = v),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(context.tr('Birthday · private', '生日 · 私密')),
              subtitle: Text(_birth ?? context.tr('Optional', '选填')),
              trailing: _birth == null
                  ? const Icon(Icons.calendar_month)
                  : IconButton(
                      tooltip: context.tr('Delete birthday', '删除生日'),
                      onPressed: _busy
                          ? null
                          : () => change(() => _birth = null),
                      icon: const Icon(Icons.clear),
                    ),
              onTap: _busy
                  ? null
                  : () async {
                      final now = DateTime.now();
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _birth == null
                            ? DateTime(now.year - 20, 1, 1)
                            : DateTime.parse(_birth!),
                        firstDate: DateTime(1900),
                        lastDate: now,
                      );
                      if (d != null && mounted) {
                        change(
                          () => _birth = d.toIso8601String().substring(0, 10),
                        );
                      }
                    },
            ),
            const Divider(),
            if (own case Success<OwnProfile>(:final value))
              Card(
                child: ListTile(
                  leading: IdentityAvatar(username: value.username),
                  title: Text(value.displayName ?? value.username),
                  subtitle: Text('@${value.username}'),
                ),
              ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(context.tr('Allow people to discover me', '允许被推荐')),
              subtitle: Text(
                context.tr(
                  'Shares only your username, display name and already shared avatar. Your full profile keeps its current privacy.',
                  '仅展示用户名、显示名和已授权头像，完整资料仍保持原隐私设置。',
                ),
              ),
              value: _discover,
              onChanged: _busy ? null : (v) => change(() => _discover = v),
            ),
            Text(
              context.tr(
                'Choose what may be used for matching. This does not publish the underlying fields. Personalised processing must also be enabled in Settings.',
                '选择可用于匹配的信息，不会因此公开原始字段。设置中的个性化处理也需开启。',
              ),
            ),
            for (final row in [
              ('Interests', '兴趣', _interests, 0),
              ('Home area', '常用地区', _region, 1),
              ('School / organisation', '学校／组织', _affiliation, 2),
              ('Age proximity', '年龄接近程度', _age, 3),
            ])
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(context.tr(row.$1, row.$2)),
                value: row.$3,
                onChanged: _busy
                    ? null
                    : (v) => change(() {
                        switch (row.$4) {
                          case 0:
                            _interests = v;
                          case 1:
                            _region = v;
                          case 2:
                            _affiliation = v;
                          case 3:
                            _age = v;
                        }
                      }),
              ),
            if (!_dirty && !_base!.onboardingPromptSeen)
              TextButton(
                onPressed: _busy
                    ? null
                    : () async {
                        await _save();
                        if (context.mounted &&
                            !_uncertain &&
                            _base!.onboardingPromptSeen) {
                          Navigator.pop(context);
                        }
                      },
                child: Text(context.tr('Skip for now', '暂时跳过')),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            if (_uncertain)
              OutlinedButton(
                onPressed: _busy ? null : _recover,
                child: Text(context.tr('Read saved version', '读取已保存版本')),
              ),
            FilledButton(
              onPressed: _busy || _uncertain ? null : _save,
              child: Text(
                _busy
                    ? (_uncertain
                          ? context.tr('Reading…', '读取中…')
                          : context.tr('Saving…', '保存中…'))
                    : context.tr('Save', '保存'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
