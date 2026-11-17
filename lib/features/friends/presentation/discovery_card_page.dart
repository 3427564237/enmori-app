import '../../../core/network/backend_api_client.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/identity_avatar.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../account/content_access.dart';
import 'friend_page.dart';

final _cardProvider = FutureProvider.autoDispose
    .family<Result<JsonObject>, String>((ref, username) {
      ref.watch(authSessionProvider);
      final access = ref.watch(contentAccessProvider);
      if (!access.foreground) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Return to reload.',
          ),
        );
      }
      return ref
          .watch(backendApiClientProvider)
          .get('/v1/users/${Uri.encodeComponent(username)}/discovery-card');
    });

enum DiscoveryCardAction { viewProfile }

/// Separate minimal identity contract; private full-profile fields are never read.
class DiscoveryCardPage extends ConsumerWidget {
  const DiscoveryCardPage({required this.username, super.key});
  final String username;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider).asData?.value;
    final value = ref.watch(_cardProvider(username));
    Widget body = const Center(child: CircularProgressIndicator());
    if (!value.isLoading) {
      final result = value.asData?.value;
      final card = result is Success<JsonObject> ? result.value['card'] : null;
      if (card is Map &&
          card['username'] == username &&
          (card['displayName'] == null || card['displayName'] is String)) {
        body = ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IdentityAvatar(username: username, size: 64),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            card['displayName'] as String? ?? username,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '@$username',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.privacy_tip_outlined,
                    size: 20,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      context.tr(
                        'This discovery card does not grant access to private profile information.',
                        '发现名片不开放对方的私密资料。',
                      ),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                if (session is AuthSessionAuthenticated &&
                    identical(
                      session,
                      ref.read(authSessionProvider).asData?.value,
                    ) &&
                    ModalRoute.of(context)?.isCurrent == true) {
                  Navigator.of(context).pop(DiscoveryCardAction.viewProfile);
                }
              },
              icon: const Icon(Icons.person_outline),
              label: Text(context.tr('View profile', '查看主页')),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () async {
                await Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => FriendPage(initialUsername: username),
                  ),
                );
                if (context.mounted) ref.invalidate(_cardProvider(username));
              },
              child: Text(context.tr('Friend request', '好友申请')),
            ),
          ],
        );
      } else {
        body = Center(
          child: TextButton(
            onPressed: () => ref.invalidate(_cardProvider(username)),
            child: Text(
              context.tr('This card is unavailable. Retry', '此名片暂不可用，重试'),
            ),
          ),
        );
      }
    }
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Discovery card', '发现名片'))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: body,
          ),
        ),
      ),
    );
  }
}
