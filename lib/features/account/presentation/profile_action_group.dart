import 'package:flutter/material.dart';

/// Profile-only shortcuts. The caller supplies every available action.
final class ProfileAction {
  const ProfileAction({
    required this.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.emphasized = false,
  });

  final Key key;
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool emphasized;
}

final class ProfileActionGroup extends StatelessWidget {
  const ProfileActionGroup({required this.actions, super.key});

  final List<ProfileAction> actions;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      const spacing = 12.0;
      final textScale = (MediaQuery.textScalerOf(context).scale(14) / 14).clamp(
        1.0,
        1.75,
      );
      final availableColumns =
          ((constraints.maxWidth + spacing) / (92 * textScale + spacing))
              .floor()
              .clamp(1, 4);
      final columns = actions.isNotEmpty && actions.length < availableColumns
          ? actions.length
          : availableColumns;
      return Column(
        children: [
          for (var start = 0; start < actions.length; start += columns) ...[
            if (start > 0) const SizedBox(height: 8),
            // A wrapped label grows both shortcuts in its row equally.
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var column = 0; column < columns; column++) ...[
                    if (column > 0) const SizedBox(width: spacing),
                    Expanded(
                      child: start + column < actions.length
                          ? _ProfileActionButton(
                              action: actions[start + column],
                            )
                          : const SizedBox.shrink(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      );
    },
  );
}

final class _ProfileActionButton extends StatelessWidget {
  const _ProfileActionButton({required this.action});

  final ProfileAction action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return OutlinedButton(
      key: action.key,
      onPressed: action.onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.onSurface,
        textStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: action.emphasized ? FontWeight.w700 : FontWeight.w500,
        ),
        backgroundColor: action.emphasized
            ? colors.primaryContainer
            : colors.surfaceContainerLowest,
        minimumSize: const Size(48, 56),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        side: BorderSide(color: colors.outlineVariant),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      child: Row(
        children: [
          ExcludeSemantics(child: Icon(action.icon, size: 24)),
          const SizedBox(width: 8),
          Expanded(child: Text(action.label)),
        ],
      ),
    );
  }
}

/// Lower-frequency Profile destinations keep their existing callbacks and labels.
final class ProfileSettingsList extends StatelessWidget {
  const ProfileSettingsList({required this.actions, super.key});

  final List<ProfileAction> actions;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    clipBehavior: Clip.antiAlias,
    child: Column(
      children: [
        for (var index = 0; index < actions.length; index++) ...[
          if (index > 0) const Divider(height: 1, indent: 16, endIndent: 16),
          TextButton(
            key: actions[index].key,
            onPressed: actions[index].onPressed,
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onSurface,
              textStyle: Theme.of(context).textTheme.bodyMedium,
              minimumSize: const Size(48, 56),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              shape: const RoundedRectangleBorder(),
            ),
            child: Row(
              children: [
                ExcludeSemantics(child: Icon(actions[index].icon, size: 24)),
                const SizedBox(width: 12),
                Expanded(child: Text(actions[index].label)),
                const SizedBox(width: 8),
                const ExcludeSemantics(
                  child: Icon(Icons.chevron_right, size: 20),
                ),
              ],
            ),
          ),
        ],
      ],
    ),
  );
}
