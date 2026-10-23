import '../../../core/presentation/enmori_localizations.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../event_detail/domain/event_detail_repository.dart';
import '../../event_detail/event_detail_providers.dart';

final _title = FutureProvider.autoDispose.family<String?, String>((
  ref,
  id,
) async {
  final session = ref.watch(authSessionProvider).asData?.value;
  final result = await ref.watch(eventDetailRepositoryProvider).read(id);
  if (!ref.mounted ||
      !identical(session, ref.read(authSessionProvider).asData?.value)) {
    return null;
  }
  final expiry = Timer(const Duration(minutes: 5), ref.invalidateSelf);
  ref.onDispose(expiry.cancel);
  return switch (result) {
    Success<EventDetail>(:final value) when value.eventId == id => value.title,
    _ => null,
  };
});

/// Only current authorized provider content; stable IDs remain internal.
final class AuthorizedEventTitle extends ConsumerWidget {
  const AuthorizedEventTitle(this.eventId, {super.key});
  final String eventId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final title = ref.watch(_title(eventId));
    return Text(
      title.isLoading
          ? context.tr('Loading event…', '正在加载活动…')
          : title.asData?.value ??
                context.tr('Event details currently unavailable', '暂时无法获取活动详情'),
    );
  }
}
