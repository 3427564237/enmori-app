import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'own_participation_controller.dart';
import 'own_participation_section.dart';
import 'authorized_event_title.dart';
import '../../../core/presentation/refresh_on_return.dart';

/// The composition root supplies navigation to the existing stable-ID detail.
final class EventPlansPage extends ConsumerWidget {
  const EventPlansPage({required this.onOpenEvent, this.onBack, super.key});
  final ValueChanged<String> onOpenEvent;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(
      title: Text(context.tr('My plans', '我的活动计划')),
      leading: onBack == null ? null : BackButton(onPressed: onBack),
    ),
    body: RefreshOnReturn(
      onRefresh: () {
        ref.invalidate(authorizedEventDetailsProvider);
      },
      child: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: RefreshIndicator(
              onRefresh: () {
                ref.invalidate(authorizedEventDetailsProvider);
                return ref
                    .read(ownParticipationControllerProvider.notifier)
                    .load();
              },
              child: ListView(
                key: const PageStorageKey('event-plans-list'),
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  OwnParticipationSection(
                    showHeading: false,
                    showInsights: true,
                    onSelect: onOpenEvent,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
