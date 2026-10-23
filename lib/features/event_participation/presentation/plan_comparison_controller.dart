import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';
import 'participation_controller.dart';

final planComparisonControllerProvider = NotifierProvider.autoDispose
    .family<PlanComparisonController, PlanComparisonView, String>(
      PlanComparisonController.new,
    );

final class PlanComparisonView {
  const PlanComparisonView({
    this.page,
    this.busy = false,
    this.checkingOwn = false,
    this.failure,
    this.selectionUnavailable = false,
  });
  final PublicParticipationPage? page;
  final bool busy, checkingOwn, selectionUnavailable;
  final AppFailure? failure;
}

/// Own facts stay in ParticipationController. Only the currently authorized
/// foreign page is held here; it is never persisted or accumulated across pages.
final class PlanComparisonController extends Notifier<PlanComparisonView> {
  PlanComparisonController(this.username);
  final String username;
  late ParticipationRepository _repository;
  late ParticipationController _mine;
  AuthSessionAuthenticated? _session;
  int _generation = 0;
  String? _cursor;
  final _visited = <String>{};

  @override
  PlanComparisonView build() {
    _session = participationSession(ref.watch(authSessionProvider));
    _repository = ref.watch(participationRepositoryProvider);
    _mine = ref.watch(participationControllerProvider.notifier);
    _cursor = null;
    _visited.clear();
    _generation++;
    ref.listen(contentAccessProvider, (_, _) => retire(resetCursor: true));
    ref.onDispose(() => _generation++);
    return const PlanComparisonView();
  }

  bool isCurrent(int generation) =>
      ref.mounted &&
      generation == _generation &&
      _session != null &&
      identical(
        participationSession(ref.read(authSessionProvider)),
        _session,
      ) &&
      ref.read(contentAccessProvider).foreground;

  bool isCurrentView(PlanComparisonView view) =>
      isCurrent(_generation) && identical(state, view) && !state.busy;

  void retire({bool resetCursor = false}) {
    _generation++;
    if (resetCursor) {
      _cursor = null;
      _visited.clear();
    }
    state = const PlanComparisonView();
  }

  Future<Result<PublicParticipationPage>> _read(int generation) async {
    try {
      return await _repository.forUsername(
        username,
        _cursor,
        () => isCurrent(generation),
      );
    } catch (_) {
      return const Failure(participationUnavailable);
    }
  }

  Future<void> load({bool next = false, bool first = false}) async {
    if (state.busy || !isCurrent(_generation)) return;
    if (next) {
      final cursor = state.page?.nextCursor;
      if (cursor == null) return;
      _cursor = cursor;
    } else if (first) {
      _cursor = null;
      _visited.clear();
    }
    final generation = ++_generation;
    state = const PlanComparisonView(busy: true);
    final result = await _read(generation);
    if (!isCurrent(generation)) return;
    if (result case Failure<PublicParticipationPage>(:final failure)) {
      state = PlanComparisonView(failure: failure);
      return;
    }
    final page = (result as Success<PublicParticipationPage>).value;
    if (page.items.length > 20 ||
        (page.nextCursor != null &&
            (page.nextCursor == _cursor ||
                _visited.contains(page.nextCursor)))) {
      state = const PlanComparisonView(
        failure: AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'The next page could not be verified. Restart from the first page.',
        ),
      );
      return;
    }
    if (_cursor != null) _visited.add(_cursor!);
    state = PlanComparisonView(page: page, busy: true, checkingOwn: true);
    // Explicit comparison reads only the current public page, with bounded I/O.
    // Shared mutations retain their own busy/revision/unknown-result handling.
    for (var offset = 0; offset < page.items.length; offset += 3) {
      if (!isCurrent(generation)) return;
      await Future.wait(
        page.items.skip(offset).take(3).map((row) => _mine.load(row.eventId)),
      );
      if (!isCurrent(generation)) return;
      for (final row in page.items.skip(offset).take(3)) {
        final failure = ref
            .read(participationControllerProvider)[row.eventId]
            ?.failure;
        if (failure?.kind == AppFailureKind.authRequired ||
            failure?.kind == AppFailureKind.authForbidden ||
            failure?.kind == AppFailureKind.onboardingRequired) {
          state = PlanComparisonView(failure: failure);
          return;
        }
      }
    }
    if (isCurrent(generation)) state = PlanComparisonView(page: page);
  }

  /// Returns a short-lived navigation receipt, never authority for a mutation.
  Future<int?> verifyForOpen(
    PlanComparisonView rendered,
    String eventId,
  ) async {
    if (!isCurrentView(rendered) ||
        rendered.page?.items.any((row) => row.eventId == eventId) != true) {
      return null;
    }
    final generation = ++_generation;
    state = const PlanComparisonView(busy: true);
    final result = await _read(generation);
    if (!isCurrent(generation)) return null;
    if (result case Failure<PublicParticipationPage>(:final failure)) {
      state = PlanComparisonView(failure: failure);
      return null;
    }
    final page = (result as Success<PublicParticipationPage>).value;
    if (page.items.where((row) => row.eventId == eventId).length != 1) {
      state = const PlanComparisonView(selectionUnavailable: true);
      return null;
    }
    // No foreign card remains visible behind the Event route.
    state = const PlanComparisonView();
    return generation;
  }
}
