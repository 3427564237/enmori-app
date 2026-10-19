import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../check_in/check_in_providers.dart';
import '../../auth/auth_providers.dart';
import 'friend_page.dart';
import 'my_friends_page.dart';
import 'social_profile_page.dart';
import 'friend_discovery_panel.dart';
import 'friend_activity_panel.dart';

/// Single JIN module builder; LI's existing authenticated router opens this page.
/// No alternative Auth client, runtime configuration or top-level router.
final class FriendModulePage extends ConsumerWidget {
  const FriendModulePage({
    required this.openAttribution,
    this.participationBuilder,
    super.key,
  });
  final Future<bool> Function(Uri) openAttribution;
  final ParticipationBuilder? participationBuilder;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> profile(String username) async {
      final session = ref.read(authSessionProvider).asData?.value;
      final device = ref.read(historyDevicePortProvider);
      try {
        final zone = await device.captureIanaZone(),
            today = await device.todayInZone(zone);
        if (!context.mounted ||
            !identical(session, ref.read(authSessionProvider).asData?.value)) {
          return;
        }
        final date =
            '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (context) => SocialProfilePage(
              username: username,
              initialDate: date,
              timeZone: zone,
              openAttribution: openAttribution,
              participationBuilder: participationBuilder,
              onOpenRequest: (name) => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) =>
                      FriendPage(initialUsername: name, onOpenProfile: profile),
                ),
              ),
            ),
          ),
        );
      } catch (_) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Device date/time zone is unavailable. Try again.'),
            ),
          );
        }
      }
    }

    Future<void> requests() => Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => FriendPage(
          onOpenProfile: profile,
          onOpenMyFriends: () => Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (_) => MyFriendsListPage(onOpenFriend: profile),
            ),
          ),
        ),
      ),
    );
    Widget discovery(bool home) => FriendDiscoveryPanel(
      home: home,
      onOpenProfile: profile,
      onOpenRequests: requests,
      onSeeAll: () => Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: const Text('People You May Want To Know')),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  FriendDiscoveryPanel(
                    home: false,
                    onOpenProfile: profile,
                    onOpenRequests: requests,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Friends')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: requests,
                  icon: const Icon(Icons.person_add_alt),
                  label: const Text('Find people and requests'),
                ),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => MyFriendsListPage(onOpenFriend: profile),
                    ),
                  ),
                  child: const Text('My Friends'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            discovery(true),
            const SizedBox(height: 24),
            FriendActivityPanel(
              home: true,
              onOpenProfile: profile,
              onSeeAll: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('Friends Activity')),
                    body: SafeArea(
                      child: ListView(
                        padding: const EdgeInsets.all(24),
                        children: [
                          FriendActivityPanel(
                            home: false,
                            onOpenProfile: profile,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
