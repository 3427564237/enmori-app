import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/presentation/enmori_localizations.dart';
import '../features/auth/auth_providers.dart';
import '../features/admin/presentation/admin_pages.dart';
import '../features/interests/admin_interest_providers.dart';

final class AdminEventCategoryEntry extends ConsumerWidget {
  const AdminEventCategoryEntry({
    required this.eventId,
    required this.title,
    this.onReturn,
    super.key,
  });
  final String eventId, title;
  final VoidCallback? onReturn;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(adminInterestCapabilityProvider).asData?.value != true) {
      return const SizedBox.shrink();
    }
    final session = ref.watch(authSessionProvider).asData?.value;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: OutlinedButton.icon(
        icon: const Icon(Icons.category_outlined),
        label: Text(context.tr('Manage ENMORI category', '管理 ENMORI 分类')),
        onPressed: () async {
          await ref.read(adminInterestCapabilityProvider.notifier).refresh();
          if (!context.mounted ||
              !identical(
                session,
                ref.read(authSessionProvider).asData?.value,
              ) ||
              ref.read(adminInterestCapabilityProvider).asData?.value != true) {
            return;
          }
          await Navigator.of(context).push<void>(
            MaterialPageRoute(
              builder: (_) => AdminPanelPage(
                page: 'classification',
                eventId: eventId,
                eventTitle: title,
              ),
            ),
          );
          if (context.mounted &&
              identical(session, ref.read(authSessionProvider).asData?.value)) {
            onReturn?.call();
          }
        },
      ),
    );
  }
}
