import 'package:flutter/material.dart';

import 'enmori_localizations.dart';

/// Completeness is explicit snapshot metadata, separate from availability.
final class EventSourceCoverageNotice extends StatelessWidget {
  const EventSourceCoverageNotice({
    required this.sourceStatus,
    required this.sourceCoverage,
    super.key,
  });

  final Map<String, bool> sourceStatus;
  final Map<String, bool> sourceCoverage;

  @override
  Widget build(BuildContext context) {
    if (sourceStatus['onepa'] != true || sourceCoverage['onepa'] != false) {
      return const SizedBox.shrink();
    }
    return Padding(
      key: const Key('event-source-coverage-incomplete'),
      padding: const EdgeInsets.only(bottom: 12),
      child: Semantics(
        liveRegion: true,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                context.tr(
                  'Some onePA interest searches could not be loaded. The current activity range is incomplete.',
                  'onePA 部分兴趣查询暂时无法读取，当前活动范围不完整。',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
