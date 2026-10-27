import '../../../core/presentation/identity_avatar.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../../account/domain/account_repository.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../../weather/weather_providers.dart';
import '../domain/social_repository.dart';
import 'check_in_map_preview.dart';
import 'check_in_points_map.dart';
import 'social_profile_controller.dart';

typedef ParticipationBuilder = Widget Function(
  BuildContext context,
  String username,
);

/// LI supplies the existing device civil date/time-zone and approved URL opener.
/// SHI's participation builder must use its server-authorized people projection.
final class SocialProfilePage extends ConsumerStatefulWidget {
  const SocialProfilePage({
    required this.username,
    required this.initialDate,
    required this.timeZone,
    required this.openAttribution,
    this.participationBuilder,
    this.onOpenRequest,
    this.tileLayerBuilder,
    this.initialTab = SocialTab.profile,
    this.recordId,
    this.onOpenFootprint,
    this.onOpenOwnRecord,
    this.recordBuilder,
    super.key,
  });
  final String username, initialDate, timeZone;
  final Widget Function(BuildContext, CheckIn)? recordBuilder;
  final SocialTab initialTab;
  final String? recordId;
  final Future<void> Function()? onOpenFootprint;
  final Future<void> Function(String)? onOpenOwnRecord;
  final Future<bool> Function(Uri) openAttribution;
  final ParticipationBuilder? participationBuilder;
  final Future<void> Function(String)? onOpenRequest;
  final Widget Function()? tileLayerBuilder;
  @override
  ConsumerState<SocialProfilePage> createState() => _SocialProfilePageState();
}

final class _SocialProfilePageState extends ConsumerState<SocialProfilePage>
    with WidgetsBindingObserver {
  late String _date;
  String? _selectedRecord;
  SocialProfileController get controller =>
      ref.read(socialProfileControllerProvider(widget.username).notifier);
  @override
  void initState() {
    super.initState();
    _date = widget.initialDate;
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadInitial();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant SocialProfilePage old) {
    super.didUpdateWidget(old);
    if (old.username != widget.username || old.timeZone != widget.timeZone) {
      _date = widget.initialDate;
      _selectedRecord = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadInitial();
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    if (state == AppLifecycleState.resumed &&
        ModalRoute.of(context)?.isCurrent == true) {
      if (widget.recordId != null) {
        _loadInitial();
      } else {
        _load(ref.read(socialProfileControllerProvider(widget.username)).tab);
      }
    } else {
      controller.clear();
      _selectedRecord = null;
    }
  }

  void _loadInitial() {
    if (widget.recordId case final id?) {
      controller.record(id);
    } else {
      _load(widget.initialTab);
    }
  }

  Future<void> _openFootprint() async {
    controller.clear();
    await widget.onOpenFootprint!();
    if (mounted) {
      controller.clear();
      _load(SocialTab.profile);
    }
  }

  Future<void> _openRecord(String id) async {
    final returnTab = ref
        .read(socialProfileControllerProvider(widget.username))
        .tab;
    controller.clear();
    if (widget.onOpenOwnRecord case final open?) {
      await open(id);
    } else {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => SocialProfilePage(
            username: widget.username,
            initialDate: _date,
            timeZone: widget.timeZone,
            openAttribution: widget.openAttribution,
            recordId: id,
            recordBuilder: widget.recordBuilder,
          ),
        ),
      );
    }
    if (mounted) {
      controller.clear();
      _load(returnTab);
    }
  }

  Future<void> _load(SocialTab tab, {bool next = false}) =>
      controller.load(tab, date: _date, timeZone: widget.timeZone, next: next);
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(socialProfileControllerProvider(widget.username));
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.recordId != null
              ? context.tr('Saved Check-in', '已保存的签到')
              : widget.initialTab == SocialTab.map
              ? context.tr('Footprint', '足迹')
              : '@${widget.username}',
        ),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: IdentityAvatar(username: widget.username, size: 52),
                ),
                const SizedBox(height: 12),
                if (widget.recordId == null &&
                    widget.initialTab != SocialTab.map)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final tab in SocialTab.values)
                        ChoiceChip(
                          label: Text(switch (tab) {
                            SocialTab.profile => context.tr('Profile', '个人资料'),
                            SocialTab.records => context.tr(
                              'Check-in History',
                              '签到历史',
                            ),
                            SocialTab.calendar => context.tr('Calendar', '日历'),
                            SocialTab.map => context.tr('Footprint', '足迹'),
                          }),
                          selected: state.tab == tab,
                          onSelected: state.busy
                              ? null
                              : (_) {
                                  _selectedRecord = null;
                                  if (tab == SocialTab.map &&
                                      widget.onOpenFootprint != null) {
                                    _openFootprint();
                                  } else {
                                    _load(tab);
                                  }
                                },
                        ),
                    ],
                  ),
                const SizedBox(height: 16),
                if (state.tab != SocialTab.profile && widget.recordId == null)
                  TextButton.icon(
                    icon: const Icon(Icons.calendar_month),
                    label: Text(_date),
                    onPressed: state.busy
                        ? null
                        : () async {
                            final epoch = controller.epoch,
                                selected = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime.parse(_date),
                                  firstDate: DateTime(1),
                                  lastDate: DateTime.parse(widget.initialDate),
                                );
                            if (!mounted ||
                                epoch != controller.epoch ||
                                selected == null) {
                              return;
                            }
                            setState(
                              () => _date =
                                  '${selected.year.toString().padLeft(4, '0')}-${selected.month.toString().padLeft(2, '0')}-${selected.day.toString().padLeft(2, '0')}',
                            );
                            _load(state.tab);
                          },
                  ),
                if (state.busy)
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      context.tr('Loading current access…', '正在加载当前可查看的内容…'),
                    ),
                  ),
                if (state.failure case final failure?)
                  Semantics(
                    liveRegion: true,
                    child: Text(localizedFailure(context, failure)),
                  ),
                if (state.removed)
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      context.tr(
                        'Friend removed. Shared access has been updated.',
                        '已删除好友，共享访问权限已更新。',
                      ),
                    ),
                  ),
                if (state.profile case final profile?)
                  ..._profile(profile, state),
                if (state.records case final records?) ...[
                  if (records.checkIns.isEmpty)
                    Text(
                      context.tr(
                        'No visible records on this page.',
                        '此页没有可查看的记录。',
                      ),
                    ),
                  for (final record in records.checkIns)
                    if (widget.recordId != null)
                      widget.recordBuilder?.call(context, record) ??
                          _record(record)
                    else
                      Card(
                        child: ListTile(
                          title: Text(
                            record.note.isEmpty
                                ? record.mood ?? context.tr('Check-in', '签到')
                                : record.note,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            localTimeLabel(context, record.createdAt),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _openRecord(record.checkInId),
                        ),
                      ),
                  if (_selectedRecord != null &&
                      !records.checkIns.any(
                        (r) => r.checkInId == _selectedRecord,
                      ))
                    Text(
                      context.tr(
                        'The selected record is not on this page. Continue or reload to check current access.',
                        '当前页没有选中的记录，请继续翻页或重新加载以核对当前权限。',
                      ),
                    ),
                  if (records.nextCursor != null)
                    OutlinedButton(
                      onPressed: () => _load(SocialTab.records, next: true),
                      child: Text(context.tr('Next page', '下一页')),
                    ),
                ],
                if (state.month case final month?)
                  state.tab == SocialTab.map
                      ? CheckInPointsMap(
                          points: month.points,
                          recordPreviewBuilder: (context, point) =>
                              CheckInMapPreview(
                                key: ValueKey(point.checkInId),
                                username: widget.username,
                                checkInId: point.checkInId,
                                onOpen: () => _openRecord(point.checkInId),
                              ),
                          openAttribution: widget.openAttribution,
                          tileLayerBuilder: widget.tileLayerBuilder,
                          onSelect: (point) {
                            _openRecord(point.checkInId);
                          },
                        )
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final entry in month.counts.entries)
                              OutlinedButton(
                                onPressed: () {
                                  setState(() {
                                    _date = entry.key;
                                    _selectedRecord = null;
                                  });
                                  _load(SocialTab.records);
                                },
                                child: Text(
                                  '${entry.key.substring(8)} · ${entry.value}',
                                ),
                              ),
                          ],
                        ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: state.busy
                      ? null
                      : () => widget.recordId != null
                            ? controller.record(widget.recordId!)
                            : _load(state.tab),
                  icon: const Icon(Icons.refresh),
                  label: Text(context.tr('Reload', '重新加载')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _profile(SocialProfile profile, SocialState state) => [
    Text(
      profile.displayName ?? profile.username,
      style: Theme.of(context).textTheme.headlineSmall,
    ),
    if (profile.relationship == SocialRelationship.other &&
        widget.onOpenRequest != null)
      OutlinedButton(
        onPressed: () async {
          controller.clear();
          await widget.onOpenRequest!(profile.username);
          if (mounted) _loadInitial();
        },
        child: Text(context.tr('Friend request', '好友请求')),
      ),
    if (profile.details.bio case final bio?)
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(bio),
      ),
    if (profile.details.affiliationName case final affiliation?)
      Text(affiliation),
    if (profile.details.region case final region?) Text(region),
    if (profile.interests.isNotEmpty)
      Wrap(
        spacing: 8,
        children: [
          for (final interest in profile.interests)
            Chip(label: Text(interest.name)),
        ],
      ),
    if (profile.relationship == SocialRelationship.friend) ...[
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(context.tr('Special Care', '特别关心')),
        subtitle: Text(
          context.tr('Only you can see this choice.', '只有你能看到这个选择。'),
        ),
        value: profile.specialCare,
        onChanged: state.busy
            ? null
            : (value) =>
                  controller.care(value, expectedEpoch: controller.epoch),
      ),
      OutlinedButton.icon(
        icon: const Icon(Icons.person_remove_outlined),
        label: Text(context.tr('Remove friend', '删除好友')),
        onPressed: () async {
          final epoch = controller.epoch;
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: Text(context.tr('Remove friend?', '删除这位好友？')),
              content: Text(
                context.tr(
                  'This removes the friendship for both people and ends access to friends-only content.',
                  '这会解除双方的好友关系，并停止访问仅好友可见的内容。',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text(context.tr('Keep friend', '保留好友')),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text(context.tr('Remove friend', '删除好友')),
                ),
              ],
            ),
          );
          if (mounted && confirmed == true) {
            await controller.remove(expectedEpoch: epoch);
          }
        },
      ),
    ],
    if (profile.participationAvailable && widget.participationBuilder != null)
      OutlinedButton(
        child: Text(context.tr('Event participation', '活动参与')),
        onPressed: () async {
          controller.clear();
          await Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (context) =>
                  widget.participationBuilder!(context, widget.username),
            ),
          );
          if (mounted) _loadInitial();
        },
      ),
  ];
  Widget _record(CheckIn record) => Card(
    color: record.checkInId == _selectedRecord
        ? Theme.of(context).colorScheme.secondaryContainer
        : null,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(localTimeLabel(context, record.createdAt)),
          if (record.note.isNotEmpty) Text(record.note),
          if (record.checkInVisibility case final visibility?)
            Text(
              "${context.tr('Visibility', '可见范围')}: ${switch (visibility) {
                CheckInVisibility.private => context.tr('Private', '仅自己'),
                CheckInVisibility.friendsOnly => context.tr('Friends-only', '仅好友'),
                CheckInVisibility.public => context.tr('Public', '公开'),
              }}",
            ),
          if (record.location != null && record.locationLabel == null)
            Text(
              context.tr(
                'Location saved; view it on the map.',
                '地点已保存，可在地图中查看。',
              ),
            ),
          if (record.mood case final mood?) Text(mood),
          if (record.activity case final activity?) Text(activity),
          if (record.locationLabel case final label?)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.place_outlined),
              title: Text(label),
              subtitle: Text(context.tr('Place name', '地点名称')),
            ),
          if (record.weather case final weather?)
            ref.watch(weatherCardBuilderProvider)(
              weather,
              widget.openAttribution,
            ),
        ],
      ),
    ),
  );
}
