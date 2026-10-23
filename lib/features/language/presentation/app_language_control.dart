import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../domain/app_language_repository.dart';
import '../language_providers.dart';

final class AppLanguageControl extends ConsumerWidget {
  const AppLanguageControl({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appLanguageProvider);
    final controller = ref.read(appLanguageProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.tr('Language', '语言'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        InputDecorator(
          decoration: const InputDecoration(labelText: 'Language / 语言'),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<AppLanguage>(
              key: const Key('app-language-choice'),
              value: state.language,
              isExpanded: true,
              items: const [
                DropdownMenuItem(
                  value: AppLanguage.english,
                  child: Text('English'),
                ),
                DropdownMenuItem(
                  value: AppLanguage.chinese,
                  child: Text('简体中文'),
                ),
              ],
              onChanged: state.busy || state.failed
                  ? null
                  : (value) {
                      if (value != null) controller.select(value);
                    },
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          context.tr(
            'Saved on this device and applied immediately. Your account and privacy choices stay separate.',
            '保存到此设备并立即生效。账号和隐私选择分别管理。',
          ),
        ),
        if (state.busy) ...[
          const SizedBox(height: 8),
          LinearProgressIndicator(
            semanticsLabel: state.saving
                ? context.tr('Saving language', '正在保存语言')
                : context.tr('Reading saved language', '正在读取已保存的语言'),
          ),
        ],
        if (state.failed) ...[
          const SizedBox(height: 8),
          Text(
            context.tr(
              'The saved language could not be confirmed. Reload it before making another change.',
              '暂时无法确认已保存的语言。请重新读取后再修改。',
            ),
          ),
          TextButton(
            onPressed: state.busy ? null : controller.reload,
            child: Text(context.tr('Reload saved language', '重新读取语言')),
          ),
        ],
      ],
    );
  }
}
