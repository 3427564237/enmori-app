import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/account_preferences_providers.dart';
import '../proactive_providers.dart';

/// Explains new-effect authorization without hiding readback or cancellation.
class ProactiveProcessingNotice extends ConsumerWidget {
  const ProactiveProcessingNotice({this.onOpenSettings, super.key});
  final VoidCallback? onOpenSettings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(proactiveProcessingAllowedProvider)) {
      return const SizedBox.shrink();
    }
    final provider = ref.watch(aiClientProcessingProvider).cloudProvider;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          provider == null
              ? context.tr(
                  'Review optional AI data use in Settings before enabling or scheduling a follow-up.',
                  '开启或预约跟进前，请在设置中核对可选 AI 数据处理许可。',
                )
              : context.tr(
                  'New follow-ups require optional AI data use and ${provider.displayName} processing permission in Settings. You can still turn off or cancel existing requests.',
                  '新跟进需要在设置中允许可选 AI 数据处理和 ${provider.displayName} 处理。你仍可关闭或取消已有预约。',
                ),
        ),
        if (onOpenSettings != null)
          TextButton(
            onPressed: onOpenSettings,
            child: Text(context.tr('Review AI settings', '核对 AI 设置')),
          ),
      ],
    );
  }
}
