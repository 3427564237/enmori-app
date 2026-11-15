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
      final width = (constraints.maxWidth - spacing * (columns - 1)) / columns;
      return Wrap(
        spacing: spacing,
        runSpacing: 8,
        children: [
          for (final action in actions)
            SizedBox(
              width: width,
              child: _ProfileActionButton(action: action),
            ),
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
    final enabled = action.onPressed != null;
    return TextButton(
      key: action.key,
      onPressed: action.onPressed,
      style: TextButton.styleFrom(
        foregroundColor: colors.onSurface,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ExcludeSemantics(
            child: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: !enabled
                    ? colors.surfaceContainerHighest
                    : action.emphasized
                    ? colors.primary
                    : colors.primaryContainer,
              ),
              child: Icon(
                action.icon,
                size: 26,
                color: !enabled
                    ? colors.onSurfaceVariant
                    : action.emphasized
                    ? colors.onPrimary
                    : colors.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            action.label,
            textAlign: TextAlign.center,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: action.emphasized ? FontWeight.w700 : FontWeight.w500,
              color: enabled ? colors.onSurface : colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
