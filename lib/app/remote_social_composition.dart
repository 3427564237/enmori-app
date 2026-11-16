import 'package:flutter/material.dart';

import '../core/presentation/enmori_localizations.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/account/account_providers.dart';
import '../features/account/domain/account_repository.dart';
import '../core/result/result.dart';
import '../features/friends/presentation/social_profile_controller.dart';
import '../features/check_in/check_in_providers.dart';
import '../features/check_in/domain/check_in_repository.dart';
import '../features/check_in/presentation/check_in_record_view.dart';
import '../features/event_participation/presentation/user_participation_section.dart';
import '../features/friends/presentation/social_profile_page.dart';
import '../features/friends/presentation/friend_activity_panel.dart';
import '../features/friends/presentation/friend_discovery_panel.dart';
import '../features/account/account_preferences_providers.dart';
import '../features/account/domain/account_preferences_repository.dart';
import 'providers.dart';
import 'router/app_router.dart';

import 'package:flutter/services.dart';

Future<bool> openGroupAttribution(Uri uri) async {
  if (uri.scheme != 'https' ||
      uri.userInfo.isNotEmpty ||
      !const [
        'open-meteo.com',
        'creativecommons.org',
        'www.openstreetmap.org',
      ].contains(uri.host)) {
    return false;
  }
  try {
    return await const MethodChannel('com.enmori.app/external_activity')
            .invokeMethod<bool>('openAttribution', {'url': uri.toString()}) ??
        false;
  } catch (_) {
    return false;
  }
}

Widget groupParticipationBuilder(BuildContext context, String username) =>
    Consumer(
      builder: (context, ref, _) {
        final session = ref.watch(authSessionProvider).asData?.value;
        final source = GoRouter.of(context).state.uri;
        bool current() =>
            context.mounted &&
            session is AuthSessionAuthenticated &&
            identical(ref.read(authSessionProvider).asData?.value, session) &&
            ref.read(routerGateProvider) == RouterGateState.authenticated &&
            GoRouter.of(context).state.uri == source &&
            ModalRoute.of(context)?.isCurrent == true;
        return Scaffold(
          appBar: AppBar(
            title: Text(context.tr('Event participation', '活动参与')),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                UserParticipationSection(
                  username: username,
                  onSelect: (id) {
                    if (current()) {
                      context.push(
                        '/events/${Uri.encodeComponent(id)}/participation',
                      );
                    }
                  },
                  onComparePlans: () {
                    if (current()) {
                      context.push<void>(AppRoutes.comparePlans(username));
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );

Widget groupProfileParticipationBuilder(
  BuildContext context,
  String username,
  Future<void> Function(Future<void> Function() open) navigate,
) => UserParticipationSection(
  username: username,
  onSelect: (id) => navigate(
    () =>
        context.push<void>('/events/${Uri.encodeComponent(id)}/participation'),
  ),
  onComparePlans: () =>
      navigate(() => context.push<void>(AppRoutes.comparePlans(username))),
);

Widget groupCheckInRecordBuilder(BuildContext context, CheckIn record) =>
    CheckInRecordView(record: record, openAttribution: openGroupAttribution);

final class ConnectedSocialProfile extends ConsumerStatefulWidget {
  const ConnectedSocialProfile({
    required this.username,
    this.footprint = false,
    this.own = false,
    super.key,
  });
  final String username;
  final bool footprint, own;
  @override
  ConsumerState<ConnectedSocialProfile> createState() =>
      _ConnectedSocialProfileState();
}

final class _ConnectedSocialProfileState
    extends ConsumerState<ConnectedSocialProfile> {
  late Future<({String date, String zone})> _date;
  @override
  void initState() {
    super.initState();
    _date = _capture();
  }

  Future<({String date, String zone})> _capture() async {
    final device = ref.read(historyDevicePortProvider);
    final zone = await device.captureIanaZone(),
        date = await device.todayInZone(zone);
    return (
      date:
          '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
      zone: zone,
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authSessionProvider);
    return FutureBuilder(
      future: _date,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: Text(context.tr('Profile', '资料'))),
            body: Center(
              child: FilledButton(
                onPressed: () => setState(() => _date = _capture()),
                child: Text(
                  context.tr('Retry date and time zone', '重新读取日期和时区'),
                ),
              ),
            ),
          );
        }
        final value = snapshot.data;
        if (value == null) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return SocialProfilePage(
          username: widget.username,
          initialTab: widget.footprint ? SocialTab.map : SocialTab.profile,
          onOpenFootprint: () => context.push<void>(
            '/people/${Uri.encodeComponent(widget.username)}/footprint',
          ),
          onOpenOwnRecord: widget.own
              ? (id) =>
                    context.push<void>('/check-in/${Uri.encodeComponent(id)}')
              : null,
          initialDate: value.date,
          timeZone: value.zone,
          openAttribution: openGroupAttribution,
          recordBuilder: groupCheckInRecordBuilder,
          participationBuilder: groupParticipationBuilder,
          participationSectionBuilder: groupProfileParticipationBuilder,
          onOpenRequest: (_) => context.push<void>('/friends'),
        );
      },
    );
  }
}

final class GroupHomeSocial extends ConsumerWidget {
  const GroupHomeSocial({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider).asData?.value;
    bool current(BuildContext route) =>
        route.mounted &&
        session is AuthSessionAuthenticated &&
        identical(session, ref.read(authSessionProvider).asData?.value) &&
        ref.read(routerGateProvider) == RouterGateState.authenticated &&
        ModalRoute.of(route)?.isCurrent == true;
    Future<void> profile(String username) async {
      if (current(context)) {
        await context.push<void>('/people/${Uri.encodeComponent(username)}');
      }
    }

    Future<void> event(String id) async {
      if (current(context)) {
        await context.push<void>(
          '/events/${Uri.encodeComponent(id)}/participation',
        );
      }
    }

    Future<void> all() => Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(title: Text(context.tr('Friends activity', '好友动态'))),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              FriendActivityPanel(
                home: false,
                onOpenProfile: (routeContext, name) async {
                  if (current(routeContext)) {
                    await routeContext.push<void>(
                      '/people/${Uri.encodeComponent(name)}',
                    );
                  }
                },
                onOpenEvent: (id) async {
                  if (current(context)) {
                    await context.push<void>(
                      '/events/${Uri.encodeComponent(id)}/participation',
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Divider(height: 32),
        FriendDiscoveryPanel(
          home: true,
          onOpenProfile: profile,
          onOpenRequests: () async {
            if (current(context)) await context.push<void>('/friends');
          },
          onSeeAll: () async {
            if (current(context)) {
              await context.push<void>('/friends?view=discover');
            }
          },
        ),
        const Divider(height: 32),
        FriendActivityPanel(
          home: true,
          onOpenProfile: (routeContext, name) async {
            if (current(routeContext)) {
              await routeContext.push<void>(
                '/people/${Uri.encodeComponent(name)}',
              );
            }
          },
          onOpenEvent: event,
          onSeeAll: all,
        ),
      ],
    );
  }
}

final class ConnectedHomeGreeting extends ConsumerWidget {
  const ConnectedHomeGreeting({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(currentAuthSubjectProvider);
    final profile = subject == null
        ? null
        : ref.watch(ownProfileDetailsProvider(subject));
    final String greeting;
    if (profile case AsyncData<Result<OwnProfile>>(
      value: Success<OwnProfile>(:final value),
    )) {
      final name = value.displayName ?? value.username;
      greeting = context.tr('Hello, $name', '你好，$name');
    } else {
      greeting = context.tr('Welcome back', '欢迎回来');
    }
    // The fallback and resolved identity share one line and identical metrics.
    return Tooltip(
      message: greeting,
      child: Text(
        greeting,
        key: const Key('home-greeting'),
        style: Theme.of(context).textTheme.bodyMedium,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

/// Resolve the signed-in username from the existing account projection only.
final class ConnectedOwnFootprint extends ConsumerWidget {
  const ConnectedOwnFootprint({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subject = ref.watch(currentAuthSubjectProvider);
    final account = subject == null
        ? null
        : ref.watch(onboardingStatusProvider(subject));
    if (account case AsyncData<Result<OnboardingStatus>>(
      value: Success<OnboardingStatus>(
        value: OnboardingCompleted(account: final user),
      ),
    )) {
      return ConnectedSocialProfile(
        key: ValueKey(subject),
        username: user.username,
        footprint: true,
        own: true,
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Footprint', '足迹'))),
      body: Center(
        child: account?.isLoading == true
            ? const CircularProgressIndicator()
            : FilledButton(
                onPressed: subject == null
                    ? null
                    : () => ref.invalidate(onboardingStatusProvider(subject)),
                child: Text(context.tr('Reload profile', '重新读取资料')),
              ),
      ),
    );
  }
}
