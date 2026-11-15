import 'package:enmori/core/presentation/enmori_localizations.dart';
import 'package:flutter/material.dart';

import '../features/event_recommendations/presentation/event_recommendations_page.dart';
import 'social_demo_presentation.dart';
import 'home_introduction.dart';

final class HomeShellPage extends StatelessWidget {
  const HomeShellPage({
    required this.onStartCheckIn,
    this.socialStyle = false,
    this.socialSection,
    this.weatherSection,
    this.daySection,
    this.profileHeader,
    this.greeting,
    this.recommendationControls,
    this.onContinueDiscovery,
    this.onSelectTab,
    this.onOpenSettings,
    this.onEditInterests,
    this.onOpenProfile,
    this.onOpenFriends,
    this.onManagePersonas,
    this.onOpenHistory,
    this.onOpenFootprint,
    this.onOpenAi,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.onBrowseActivities,
    required this.onSeeAllEvents,
    super.key,
  });

  final bool socialStyle;
  final Widget? socialSection;
  final Widget? weatherSection;
  final Widget? daySection;
  final Widget? profileHeader;
  final Widget? greeting;
  final Widget? recommendationControls;
  final VoidCallback? onContinueDiscovery;
  final ValueChanged<int>? onSelectTab;
  final VoidCallback? onOpenSettings;
  final VoidCallback onStartCheckIn;
  final VoidCallback? onEditInterests;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onOpenFriends;
  final VoidCallback? onManagePersonas;
  final VoidCallback? onOpenHistory;
  final VoidCallback? onOpenFootprint;
  final VoidCallback? onOpenAi;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final VoidCallback onSeeAllEvents;
  final VoidCallback? onBrowseActivities;

  @override
  Widget build(BuildContext context) {
    if (socialStyle) return _socialHome(context);
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-home'),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              context.tr('Home', "首页"),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Your Check-in and upcoming event recommendations.',
                "记录当下，发现即将开始的活动。",
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              key: const Key('r6-new-check-in-button'),
              onPressed: onStartCheckIn,
              icon: const Icon(Icons.edit_note),
              label: Text(context.tr('New Check-in', "新建签到")),
            ),
            if (daySection != null) _HomeSection(child: daySection!),
            if (profileHeader != null) _HomeSection(child: profileHeader!),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('edit-interests-button'),
              onPressed: onEditInterests,
              icon: const Icon(Icons.interests_outlined),
              label: Text(context.tr('Edit interests', "编辑兴趣")),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('my-profile-button'),
              onPressed: onOpenProfile,
              icon: const Icon(Icons.person_outline),
              label: Text(context.tr('My profile', "我的资料")),
            ),
            if (onOpenFriends != null)
              OutlinedButton.icon(
                key: const Key('home-friends'),
                onPressed: onOpenFriends,
                icon: const Icon(Icons.people_outline),
                label: Text(context.tr('Friends', "好友")),
              ),
            if (onManagePersonas != null)
              OutlinedButton.icon(
                key: const Key('home-manage-personas'),
                onPressed: onManagePersonas,
                icon: const Icon(Icons.manage_accounts_outlined),
                label: Text(context.tr('Manage Personas', "管理 AI 角色")),
              ),
            if (onOpenHistory != null)
              OutlinedButton.icon(
                key: const Key('home-check-in-history'),
                onPressed: onOpenHistory,
                icon: const Icon(Icons.history),
                label: Text(context.tr('Check-in History', "签到记录")),
              ),
            if (onOpenAi != null)
              OutlinedButton.icon(
                key: const Key('home-ai-conversation'),
                onPressed: onOpenAi,
                icon: const Icon(Icons.chat_outlined),
                label: Text(context.tr('AI conversation', "AI 对话")),
              ),
            if (onBrowseActivities != null)
              OutlinedButton.icon(
                key: const Key('home-browse-activities'),
                onPressed: onBrowseActivities,
                icon: const Icon(Icons.explore_outlined),
                label: Text(context.tr('Browse all activities', '浏览所有活动')),
              ),
            const SizedBox(height: 32),
            Text(
              context.tr('Events for you', "为你推荐的活动"),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            _HomeSection(
              child: EventRecommendationsSection(
                onSeeAll: onSeeAllEvents,
                onContinueDiscovery: onContinueDiscovery,
                onOpenEvent: onOpenEvent,
                recommendationCardBuilder: recommendationCardBuilder,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _socialHome(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.fiber_manual_record,
            size: 11,
            color: Theme.of(context).colorScheme.primary,
          ),
          SizedBox(width: 8),
          Text(
            'enmori',
            style: TextStyle(
              fontSize: 26,
              fontFamily: 'Playfair Display',
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          key: const Key('social-settings'),
          tooltip: onOpenSettings == null
              ? context.tr(
                  'Settings & privacy unavailable in this version',
                  "此版本暂不支持设置与隐私",
                )
              : context.tr('Settings & privacy', "设置与隐私"),
          onPressed: onOpenSettings,
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
    ),
    bottomNavigationBar: onSelectTab == null
        ? null
        : SocialDemoNavigation(selectedIndex: 0, onSelected: onSelectTab!),
    body: SafeArea(
      top: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 660),
          child: ListView(
            key: const Key('route-home'),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              _HomeSection(
                child: HomeIntroduction(
                  greeting: greeting,
                  weather: weatherSection,
                  onStartCheckIn: onStartCheckIn,
                ),
              ),
              if (daySection != null) _HomeSection(child: daySection!),
              if (profileHeader != null) _HomeSection(child: profileHeader!),
              const SizedBox(height: 24),
              if (onOpenEvent != null)
                _HomeSection(
                  child: EventRecommendationsSection(
                    heading: context.tr('Events for you', "为你推荐的活动"),
                    contextControls: recommendationControls,
                    onBrowseAll: onBrowseActivities,
                    onSeeAll: onSeeAllEvents,
                    onContinueDiscovery: onContinueDiscovery,
                    onOpenEvent: onOpenEvent,
                    recommendationCardBuilder: recommendationCardBuilder,
                  ),
                ),
              if (socialSection != null) _HomeSection(child: socialSection!),
              if (onSelectTab == null || onOpenProfile == null) ...[
                const Divider(height: 32),
                Semantics(
                  header: true,
                  child: Text(
                    context.tr('Your space', "我的空间"),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                const SizedBox(height: 4),
                _HomeShortcut(
                  key: const Key('social-ai-card'),
                  icon: Icons.auto_awesome_outlined,
                  title: context.tr('AI conversation', "AI 对话"),
                  description: context.tr(
                    'Talk with your active Persona.',
                    "与当前 AI 角色聊一聊。",
                  ),
                  onTap: onOpenAi,
                ),
                const SizedBox(height: 4),
                _HomeShortcut(
                  key: const Key('home-check-in-history'),
                  icon: Icons.history,
                  title: context.tr('Check-in History', "签到记录"),
                  description: context.tr(
                    'Open your saved Check-ins.',
                    "回看已保存的签到。",
                  ),
                  onTap: onOpenHistory,
                ),
                if (onOpenFootprint != null) ...[
                  const SizedBox(height: 4),
                  _HomeShortcut(
                    key: const Key('home-footprint'),
                    icon: Icons.map_outlined,
                    title: context.tr('Footprint', "足迹"),
                    description: context.tr(
                      'See your Check-in points on the map.',
                      "在地图上查看签到地点。",
                    ),
                    onTap: onOpenFootprint,
                  ),
                ],
                const Divider(height: 24),
                Wrap(
                  spacing: 12,
                  children: [
                    _HomeSecondaryAction(
                      actionKey: const Key('home-manage-personas'),
                      onPressed: onManagePersonas,
                      icon: Icons.manage_accounts_outlined,
                      label: context.tr('Manage Personas', "管理 AI 角色"),
                    ),
                    _HomeSecondaryAction(
                      actionKey: const Key('edit-interests-button'),
                      onPressed: onEditInterests,
                      icon: Icons.interests_outlined,
                      label: context.tr('Edit interests', "编辑兴趣"),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}

/// Home has a bounded set of sections whose own controllers govern freshness.
/// Scrolling out of view must not remount them and restart their reads.
final class _HomeSection extends StatefulWidget {
  const _HomeSection({required this.child});

  final Widget child;

  @override
  State<_HomeSection> createState() => _HomeSectionState();
}

final class _HomeSectionState extends State<_HomeSection>
    with AutomaticKeepAliveClientMixin<_HomeSection> {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}

/// Availability follows the existing route callback, never a simulated result.
final class _HomeShortcut extends StatelessWidget {
  const _HomeShortcut({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
    super.key,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 4),
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(title),
    subtitle: Text(
      onTap == null
          ? context.tr('Unavailable in this version.', "此版本暂不支持。")
          : description,
      style: Theme.of(context).textTheme.bodyMedium
          ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
    ),
    trailing: onTap == null ? null : const Icon(Icons.chevron_right),
    enabled: onTap != null,
    onTap: onTap,
  );
}

final class _HomeSecondaryAction extends StatelessWidget {
  const _HomeSecondaryAction({
    required this.actionKey,
    required this.onPressed,
    required this.icon,
    required this.label,
  });

  final Key actionKey;
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      TextButton.icon(
        key: actionKey,
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
      ),
      if (onPressed == null) ...[
        const SizedBox(height: 8),
        Text(
          context.tr(
            '$label is unavailable in this version.',
            '此版本暂不支持$label。',
          ),
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      ],
    ],
  );
}
