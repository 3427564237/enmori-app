import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import '../event_detail_providers.dart';

final eventDetailControllerProvider = NotifierProvider.autoDispose
    .family<EventDetailController, AsyncValue<EventDetail>, String>(
      EventDetailController.new,
    );

final class EventDetailController extends Notifier<AsyncValue<EventDetail>> {
  EventDetailController(this.eventId);
  final String eventId;
  late EventDetailRepository _repository;
  int _operation = 0;
  @override
  AsyncValue<EventDetail> build() {
    ref.watch(currentAuthSubjectProvider);
    _repository = ref.watch(eventDetailRepositoryProvider);
    _operation++;
    return const AsyncLoading();
  }

  Future<void> load() async {
    final operation = ++_operation;
    state = const AsyncLoading();
    final result = await _repository.read(eventId);
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<EventDetail>(:final value) => AsyncData(value),
      Failure<EventDetail>(:final failure) => AsyncError(
        failure,
        StackTrace.current,
      ),
    };
  }

  Future<Result<void>> copyLink(EventDetail event) =>
      _repository.copyLink(event);
}
