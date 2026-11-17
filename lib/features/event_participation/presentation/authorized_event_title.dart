import '../../../core/presentation/enmori_localizations.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../../core/presentation/local_time.dart';
import '../../auth/auth_providers.dart';
import '../../event_detail/domain/event_detail_repository.dart';
import '../../event_detail/event_detail_providers.dart';

final authorizedEventDetailsProvider = FutureProvider.autoDispose
    .family<EventDetail?, String>((ref, id) async {
      final session = ref.watch(authSessionProvider).asData?.value;
      final result = await ref.watch(eventDetailRepositoryProvider).read(id);
      if (!ref.mounted ||
          !identical(session, ref.read(authSessionProvider).asData?.value)) {
        return null;
      }
      final expiry = Timer(const Duration(minutes: 5), ref.invalidateSelf);
      ref.onDispose(expiry.cancel);
      return switch (result) {
        Success<EventDetail>(:final value) when value.eventId == id => value,
        _ => null,
      };
    });

final authorizedEventTitleProvider = Provider.autoDispose
    .family<AsyncValue<String?>, String>(
      (ref, id) => ref
          .watch(authorizedEventDetailsProvider(id))
          .whenData((event) => event?.title),
    );

/// Shares the title's authorized read and expiry; no provider content is saved.
final class AuthorizedEventSchedule extends ConsumerWidget {
  const AuthorizedEventSchedule(this.eventId, {super.key});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authorizedEventDetailsProvider(eventId));
    if (state.isLoading) return const SizedBox.shrink();
    final event = state.asData?.value;
    if (event == null) {
      return Text(context.tr('Time and location unavailable.', '暂时无法获取时间与地点。'));
    }
    Widget line(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(child: Icon(icon, size: 18)),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        line(
          Icons.schedule,
          event.endAt == null
              ? singaporeEventTimeLabel(context, event.startAt)
              : singaporeEventTimeRangeLabel(
                  context,
                  event.startAt,
                  event.endAt!,
                ),
        ),
        line(
          Icons.place_outlined,
          event.locationLabel ??
              context.tr('Location not provided by the source.', '来源未提供地点。'),
        ),
      ],
    );
  }
}

/// Only current authorized provider content; stable IDs remain internal.
final class AuthorizedEventTitle extends ConsumerWidget {
  const AuthorizedEventTitle(this.eventId, {super.key});
  final String eventId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final title = ref.watch(authorizedEventTitleProvider(eventId));
    return Text(
      title.isLoading
          ? context.tr('Loading event…', '正在加载活动…')
          : title.asData?.value ??
                context.tr('Event details currently unavailable', '暂时无法获取活动详情'),
    );
  }
}
