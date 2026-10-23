import 'package:flutter/material.dart';

/// A content heading whose secondary actions wrap at large text sizes.
final class SectionHeading extends StatelessWidget {
  const SectionHeading({
    required this.title,
    this.actions = const [],
    super.key,
  });
  final String title;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 0,
      children: [
        Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        if (actions.isNotEmpty)
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: actions,
          ),
      ],
    ),
  );
}
