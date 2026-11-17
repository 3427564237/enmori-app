import 'package:flutter/material.dart';

import '../features/interests/presentation/interest_summary.dart';
import '../features/recommendation_profile/presentation/activity_area_bar.dart';

/// App composition joins existing feature-owned settings and the editor route.
final class RecommendationConditions extends StatelessWidget {
  const RecommendationConditions({
    required this.onEditInterests,
    this.showArea = true,
    super.key,
  });
  final VoidCallback onEditInterests;
  final bool showArea;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      InterestSummary(onEdit: onEditInterests),
      if (showArea) const ActivityAreaBar(),
    ],
  );
}
