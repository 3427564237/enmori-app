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
      else if (reason.code == 'same_area')
        context.tr('In your activity area', '位于当前活动地区')
      else if (reason.code == 'target_age')
        context.tr('Within the source target age range', '符合来源提供的目标年龄')
      else if (reason.code == 'same_region')
        context.tr('Matches your region', '与活动地区同属一个大区'),
  ];
  return parts.join(' · ');
}
