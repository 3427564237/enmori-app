import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../social_providers.dart';

typedef MapRecordQuery = ({String username, String checkInId});

// Only the selected record is fetched. Session/access changes retire the old
// projection, including same-subject replacement and unknown mutation results.
final mapRecordPreviewProvider = FutureProvider.autoDispose
    .family<Result<CheckIn>, MapRecordQuery>((ref, query) {
      final session = ref.watch(authSessionProvider).asData?.value;
      final access = ref.watch(contentAccessProvider);
      final repository = ref.watch(socialRepositoryProvider);
      if (session is! AuthSessionAuthenticated || !access.foreground) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Return to reload current access.',
          ),
        );
      }
      return repository.record(query.username, query.checkInId);
    });

final class CheckInMapPreview extends ConsumerWidget {
  const CheckInMapPreview({
    required this.username,
    required this.checkInId,
    required this.onOpen,
    super.key,
  });
  final String username, checkInId;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = (username: username, checkInId: checkInId);
    final result = ref.watch(mapRecordPreviewProvider(query));
    if (result.isLoading) {
      return Padding(
        padding: EdgeInsets.all(16),
        child: Semantics(
          liveRegion: true,
          child: Text(context.tr('Loading this Check-in…', '正在加载这条签到…')),
        ),
      );
    }
    if (result.value case Success<CheckIn>(:final value)) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            value.note.isEmpty
                ? value.mood ?? context.tr('Check-in', '签到')
                : value.note,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 8),
          Text(
            [
              if (value.note.isNotEmpty && value.mood != null) value.mood!,
              if (value.activity != null) value.activity!,
              if (value.locationLabel != null) value.locationLabel!,
            ].join(' · '),
          ),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: onOpen,
            icon: const Icon(Icons.open_in_new),
            label: Text(context.tr('Open Check-in', '打开签到')),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.tr(
            'This Check-in is unavailable. Access may have changed.',
            '此签到不可用，访问权限可能已变化。',
          ),
        ),
        TextButton.icon(
          onPressed: () => ref.invalidate(mapRecordPreviewProvider(query)),
          icon: const Icon(Icons.refresh),
          label: Text(context.tr('Retry Check-in', '重新读取签到')),
        ),
      ],
    );
  }
}
