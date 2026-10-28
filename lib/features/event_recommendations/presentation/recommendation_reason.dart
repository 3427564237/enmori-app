import 'package:flutter/widgets.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../domain/event_recommendation_repository.dart';

/// Display only Backend-authorized signals; never derive a new reason locally.
String recommendationReason(BuildContext context, EventRecommendation event) {
  final interests = event.matchedInterests.map((tag) => tag.displayName);
  final parts = <String>[
    if (interests.isNotEmpty)
      context.tr(
        'Matches: ${interests.join(', ')}',
        '匹配兴趣：${interests.join('、')}',
      ),
    for (final reason in event.reasons)
      if (reason.code == 'friends_participating')
        context.tr(
          '${reason.count} friends interested or going',
          '${reason.count} 位好友感兴趣或将参加',
        )
      else if (reason.code == 'same_region')
        context.tr('Matches your region', '与资料地区匹配'),
  ];
  return parts.join(' · ');
}
