import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/refresh_on_return.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../domain/interest_repository.dart';
import '../interests_providers.dart';

/// Reads saved choices, never the editor draft. Session and foreground changes
/// retire previous responses through the existing content-access boundary.
final interestSummaryProvider =
    FutureProvider.autoDispose<Result<InterestSelection>?>((ref) async {
      ref.watch(authSessionProvider);
      final access = ref.watch(contentAccessProvider);
      if (!access.foreground || ref.watch(currentAuthSubjectProvider) == null) {
        return null;
      }
      return ref.watch(interestRepositoryProvider).readOwn();
    });

final class InterestSummary extends ConsumerWidget {
  const InterestSummary({required this.onEdit, super.key});
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(interestSummaryProvider);
    final text = switch (state) {
      AsyncLoading<Result<InterestSelection>?>() => context.tr(
        'Loading interests…',
        '正在加载兴趣…',
      ),
      AsyncData<Result<InterestSelection>?>(
        value: Success<InterestSelection>(value: final selection),
      ) =>
        selection.interestTags.isEmpty
            ? context.tr('No interests selected', '尚未选择兴趣')
            : selection.interestTags
                  .map(
                    (tag) =>
                        tag.lifecycleState == InterestLifecycleState.inactive
                        ? context.tr(
                            '${tag.displayName} (inactive)',
                            '${tag.displayName}（已停用）',
                          )
                        : tag.displayName,
                  )
                  .join(' · '),
      _ => context.tr('Interests unavailable', '暂时无法获取兴趣'),
    };
    return RefreshOnReturn(
      onRefresh: () => ref.invalidate(interestSummaryProvider),
      child: Column(
        key: const Key('recommendation-interest-summary'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('Selected interests', '已选兴趣'),
            style: Theme.of(context).textTheme.labelMedium,
          ),
          Text(text),
          Wrap(
            spacing: 8,
            children: [
              TextButton.icon(
                key: const Key('recommendation-conditions-edit-interests'),
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined),
                label: Text(context.tr('Edit interests', '编辑兴趣')),
              ),
              if (state.hasError ||
                  state.asData?.value is Failure<InterestSelection>)
                TextButton(
                  onPressed: () => ref.invalidate(interestSummaryProvider),
                  child: Text(context.tr('Retry interests', '重新加载兴趣')),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
