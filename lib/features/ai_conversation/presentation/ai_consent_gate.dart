import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/domain/account_repository.dart';
import '../../account/presentation/account_preferences_controller.dart';

/// Presentation gate for the connected app; Backend remains the authority.
final class AiConsentGate extends ConsumerWidget {
  const AiConsentGate({
    required this.child,
    required this.onOpenSettings,
    required this.navigationBar,
    super.key,
  });

  final Widget child;
  final VoidCallback onOpenSettings;
  final Widget navigationBar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = accountPreferencesControllerProvider(
      PreferencesView.settings,
    );
    final state = ref.watch(provider);
    if (state.phase == PreferencesPhase.ready &&
        state.settings?.consent == OptionalProcessingConsent.accepted) {
      return child;
    }
    final loading =
        state.phase == PreferencesPhase.loading ||
        state.phase == PreferencesPhase.saving;
    final rejected =
        state.settings?.consent == OptionalProcessingConsent.rejected;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('AI companion', 'AI 伙伴'))),
      bottomNavigationBar: navigationBar,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: loading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      rejected
                          ? context.tr('AI Limited', 'AI 功能受限')
                          : context.tr('AI settings unavailable', 'AI 设置暂不可用'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      rejected
                          ? context.tr(
                              'AI requires optional data use. You can still browse activities, use Friends and keep Check-ins.',
                              '使用 AI 需要允许可选数据处理。你仍可浏览活动、使用好友功能和记录签到。',
                            )
                          : context.tr(
                              'Your settings could not be loaded. Try again.',
                              '未能加载设置，请重试。',
                            ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: rejected
                          ? onOpenSettings
                          : () => ref.read(provider.notifier).load(),
                      child: Text(
                        rejected
                            ? context.tr('Open settings', '打开设置')
                            : context.tr('Try again', '重试'),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
