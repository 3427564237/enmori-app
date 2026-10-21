import 'package:flutter/material.dart';

/// Shared feedback surface. Callers retain state, copy and recovery actions.
/// Place inside the page's scroll view; this widget owns no requests or retries.
final class StatusPanel extends StatelessWidget {
  const StatusPanel({
    required this.title,
    required this.body,
    required this.icon,
    this.loading = false,
    this.isError = false,
    this.action,
    super.key,
  });

  final String title;
  final String body;
  final IconData icon;
  final bool loading;
  final bool isError;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: loading || isError,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (loading)
                SizedBox.square(
                  dimension: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    semanticsLabel: title,
                  ),
                )
              else
                ExcludeSemantics(
                  child: Icon(
                    icon,
                    size: 28,
                    color: isError
                        ? theme.colorScheme.error
                        : theme.colorScheme.primary,
                  ),
                ),
              const SizedBox(height: 12),
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                body,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              if (action != null) ...[const SizedBox(height: 12), action!],
            ],
          ),
        ),
      ),
    );
  }
}
