import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Read-only chart primitives shared by Check-in and Event summaries. Values,
/// completeness and permission remain the responsibility of the owning feature.
final class RecordRing extends StatelessWidget {
  const RecordRing({
    required this.segments,
    required this.value,
    required this.label,
    super.key,
  });

  final List<({double fraction, Color color})> segments;
  final String value, label;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '$label: $value',
    child: ExcludeSemantics(
      child: SizedBox.square(
        dimension: 152,
        child: CustomPaint(
          painter: _RingPainter(
            segments,
            Theme.of(context).colorScheme.surfaceContainerHighest,
          ),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(30),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  value,
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontFamily: 'Roboto',
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

final class _RingPainter extends CustomPainter {
  _RingPainter(this.segments, this.track);
  final List<({double fraction, Color color})> segments;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(10);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 15
      ..strokeCap = StrokeCap.butt;
    canvas.drawArc(rect, 0, math.pi * 2, false, paint..color = track);
    var start = -math.pi / 2;
    var remaining = 1.0;
    for (final segment in segments) {
      final fraction = segment.fraction.clamp(0.0, remaining);
      if (fraction == 0) continue;
      final sweep = math.pi * 2 * fraction;
      final gap = segments.where((s) => s.fraction > 0).length > 1
          ? math.min(.045, sweep / 4)
          : 0.0;
      canvas.drawArc(
        rect,
        start + gap / 2,
        sweep - gap,
        false,
        paint..color = segment.color,
      );
      start += sweep;
      remaining -= fraction;
    }
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.track != track || oldDelegate.segments != segments;
}

final class RecordChartPanel extends StatelessWidget {
  const RecordChartPanel({
    required this.title,
    required this.icon,
    required this.children,
    super.key,
  });
  final String title;
  final IconData icon;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.symmetric(vertical: 8),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    ),
  );
}

final class RecordCountBar extends StatelessWidget {
  const RecordCountBar({
    required this.label,
    required this.count,
    required this.total,
    required this.color,
    this.onTap,
    super.key,
  });
  final String label;
  final int count, total;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('$label · $count', style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 8),
          ExcludeSemantics(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: total == 0 ? 0 : (count / total).clamp(0.0, 1.0),
                minHeight: 9,
                color: color,
                backgroundColor: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest,
              ),
            ),
          ),
        ],
      ),
    );
    return onTap == null
        ? content
        : InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: content,
          );
  }
}
