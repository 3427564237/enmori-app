import 'dart:async';

import 'package:flutter/material.dart';

import '../core/presentation/enmori_localizations.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/interests/admin_interest_providers.dart';

/// Profile composition seam. The server rechecks authority for every create.
final class InterestAdminEntry extends ConsumerStatefulWidget {
  const InterestAdminEntry({required this.onOpen, super.key});

  final Future<void> Function() onOpen;

  @override
  ConsumerState<InterestAdminEntry> createState() => _InterestAdminEntryState();
}

final class _InterestAdminEntryState extends ConsumerState<InterestAdminEntry>
    with WidgetsBindingObserver {
  bool _opening = false;

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
    if (state == AppLifecycleState.resumed) {
      unawaited(ref.read(adminInterestCapabilityProvider.notifier).refresh());
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider).value;
    final allowed =
        ref.watch(adminInterestCapabilityProvider).asData?.value == true;
    if (session is! AuthSessionAuthenticated || !allowed) {
      return const SizedBox.shrink();
    }
    return ListTile(
      key: const Key('profile-admin-interests'),
      leading: const Icon(Icons.playlist_add),
      title: Text(context.tr('Administration', '管理中心')),
      trailing: const Icon(Icons.chevron_right),
      onTap: _opening
          ? null
          : () async {
              setState(() => _opening = true);
              try {
                await ref
                    .read(adminInterestCapabilityProvider.notifier)
                    .refresh();
                if (!mounted ||
                    !identical(ref.read(authSessionProvider).value, session) ||
                    ref.read(adminInterestCapabilityProvider).asData?.value !=
                        true) {
                  return;
                }
                await widget.onOpen();
                if (!mounted ||
                    !identical(ref.read(authSessionProvider).value, session)) {
                  return;
                }
                await ref
                    .read(adminInterestCapabilityProvider.notifier)
                    .refresh();
              } finally {
                if (mounted) setState(() => _opening = false);
              }
            },
    );
  }
}
