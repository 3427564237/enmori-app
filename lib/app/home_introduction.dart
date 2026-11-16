import 'package:flutter/material.dart';

import '../core/presentation/enmori_localizations.dart';

/// Keep the primary action before asynchronous weather content. Its position
/// must not change when a weather lookup completes, fails or is cleared.
final class HomeIntroduction extends StatelessWidget {
  const HomeIntroduction({
    required this.onStartCheckIn,
    this.greeting,
    this.weather,
    super.key,
  });

  final VoidCallback onStartCheckIn;
  final Widget? greeting;
  final Widget? weather;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      key: const Key('home-introduction'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          greeting ??
              Text(
                context.tr('Welcome back', '欢迎回来'),
                style: theme.textTheme.bodyMedium,
              ),
          const SizedBox(height: 4),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 4,
            children: [
              Semantics(
                header: true,
                child: Text(
                  context.tr('Today', '今天'),
                  style: theme.textTheme.titleLarge,
                ),
              ),
              Text(
                MaterialLocalizations.of(context)
                    .formatFullDate(DateTime.now()),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            key: const Key('r6-new-check-in-button'),
            onPressed: onStartCheckIn,
            icon: const Icon(Icons.edit_note),
            label: Text(context.tr('New Check-in', '新建签到')),
          ),
          if (weather != null) ...[const Divider(height: 16), weather!],
        ],
      ),
    );
  }
}
