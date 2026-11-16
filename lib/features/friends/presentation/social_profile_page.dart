import '../../auth/auth_providers.dart';

import '../../../core/presentation/identity_avatar.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../../account/domain/account_repository.dart';
import '../../account/domain/profile_details.dart';
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

typedef ProfileParticipationBuilder = Widget Function(
  BuildContext context,
  String username,
  Future<void> Function(Future<void> Function() open) navigate,
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
    this.participationSectionBuilder,
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
  final ProfileParticipationBuilder? participationSectionBuilder;
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

  Future<void> _openParticipation(Future<void> Function() open) async {
    final source = controller;
    final state = ref.read(socialProfileControllerProvider(widget.username));
    if (state.profile?.participationAvailable != true ||
        state.busy ||
        ModalRoute.of(context)?.isCurrent != true) {
      return;
    }
    final session = ref.read(authSessionProvider).asData?.value;
    source.clear();
    await open();
    if (mounted &&
        identical(session, ref.read(authSessionProvider).asData?.value) &&
        ModalRoute.of(context)?.isCurrent == true) {
      controller.clear();
      _loadInitial();
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
                if (state.profile case final profile?) ...[
                  _ProfileIdentity(profile: profile),
                  const SizedBox(height: 24),
                ],
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
    _ProfileSection(
      title: context.tr('Interests', '兴趣'),
      icon: Icons.interests_outlined,
      child: profile.interests.isEmpty
          ? Text(context.tr('No shared interests to show.', '暂无可查看的兴趣。'))
          : Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final interest in profile.interests)
                  Chip(label: Text(interest.name)),
              ],
            ),
    ),
    const SizedBox(height: 24),
    if (profile.participationAvailable &&
        widget.participationSectionBuilder != null)
      widget.participationSectionBuilder!(
        context,
        profile.username,
        _openParticipation,
      )
    else if (!profile.participationAvailable)
      _ProfileSection(
        title: context.tr('Events', '活动'),
        icon: Icons.event_outlined,
        child: Text(
          context.tr(
            'No event participation is available to view.',
            '暂无可查看的活动参与信息。',
          ),
        ),
      ),
    if (profile.participationAvailable && widget.participationBuilder != null)
      Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          icon: const Icon(Icons.open_in_new, size: 18),
          label: Text(context.tr('Event participation', '活动参与')),
          onPressed: () => _openParticipation(
            () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (context) =>
                    widget.participationBuilder!(context, profile.username),
              ),
            ),
          ),
        ),
      ),
    const SizedBox(height: 24),
    if (profile.relationship == SocialRelationship.friend) ...[
      const Divider(),
      const SizedBox(height: 8),
      SwitchListTile.adaptive(
        contentPadding: EdgeInsets.zero,
        secondary: Icon(
          profile.specialCare ? Icons.star_rounded : Icons.star_outline_rounded,
        ),
        title: Text(context.tr('Starred friend', '星标好友')),
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

class _ProfileIdentity extends StatelessWidget {
  const _ProfileIdentity({required this.profile});
  final SocialProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: theme.colorScheme.surface,
                  child: IdentityAvatar(username: profile.username, size: 72),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    switch (profile.relationship) {
                      SocialRelationship.friend => context.tr('Friend', '好友'),
                      SocialRelationship.self => context.tr(
                        'Your profile',
                        '你的资料',
                      ),
                      SocialRelationship.other => context.tr('Profile', '个人资料'),
                    },
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Semantics(
              header: true,
              child: Text(
                profile.displayName ?? profile.username,
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '@${profile.username}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
            if (profile.details.bio case final bio?) ...[
              const SizedBox(height: 16),
              Text(
                bio,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ],
            if (profile.details.affiliationName != null ||
                profile.details.region != null) ...[
              const SizedBox(height: 16),
              if (profile.details.affiliationName case final affiliation?)
                _ProfileFact(
                  icon:
                      profile.details.affiliationType == AffiliationType.company
                      ? Icons.business_outlined
                      : Icons.school_outlined,
                  text: affiliation,
                ),
              if (profile.details.region case final region?)
                _ProfileFact(icon: Icons.place_outlined, text: region),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProfileFact extends StatelessWidget {
  const _ProfileFact({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ExcludeSemantics(
          child: Icon(
            icon,
            size: 20,
            color: Theme.of(context).colorScheme.onPrimaryContainer,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
        ),
      ],
    ),
  );
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.title,
    required this.icon,
    required this.child,
  });
  final String title;
  final IconData icon;
  final Widget child;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          ExcludeSemantics(
            child: Icon(icon, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Semantics(
              header: true,
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
          ),
        ],
      ),
      const SizedBox(height: 12),
      child,
    ],
  );
}
