import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../account/content_access.dart';
import 'domain/recommendation_profile.dart';

final recommendationProfileRepositoryProvider =
    Provider<RecommendationProfileRepository>((ref) => const _Unavailable());
final regionRepositoryProvider = Provider<RegionRepository>(
  (ref) => throw StateError('Region repository unavailable'),
);
final planningAreasProvider = FutureProvider<List<PlanningArea>>(
  (ref) => ref.watch(regionRepositoryProvider).catalogue(),
);
final recommendationProfileProvider =
    FutureProvider<Result<RecommendationProfile>>((ref) {
      ref.watch(authSessionProvider);
      if (ref.watch(currentAuthSubjectProvider) == null) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Sign in again.',
          ),
        );
      }
      return ref.watch(recommendationProfileRepositoryProvider).read();
    });

final class _Unavailable implements RecommendationProfileRepository {
  const _Unavailable();
  @override
  Future<Result<RecommendationProfile>> read() async => const Failure(
    AppFailure(
      kind: AppFailureKind.configurationUnavailable,
      message: 'Recommendation profile unavailable.',
    ),
  );
  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile p) => read();
}

final class ActivityArea {
  const ActivityArea({
    this.code,
    this.name,
    this.source = 'Singapore',
    this.failed = false,
  });
  final String? code, name;
  final String source;
  final bool failed;
}

final activityAreaProvider =
    NotifierProvider<ActivityAreaController, ActivityArea>(
      ActivityAreaController.new,
    );

class ActivityAreaController extends Notifier<ActivityArea> {
  DateTime? _locatedAt;
  PlanningArea? _located;
  PlanningArea? _manual;
  int _generation = 0;
  @override
  ActivityArea build() {
    ref.watch(authSessionProvider);
    _generation++;
    _manual = null;
    _located = null;
    _locatedAt = null;
    return const ActivityArea();
  }

  void manual(PlanningArea? a) {
    _generation++;
    _manual = a;
    if (a != null) {
      state = ActivityArea(code: a.code, name: a.name, source: 'Selected area');
    } else {
      refresh();
    }
  }

  Future<void> refresh() async {
    final generation = ++_generation;
    if (!ref.read(contentAccessProvider).foreground) return;
    if (_manual case final a?) {
      state = ActivityArea(code: a.code, name: a.name, source: 'Selected area');
      return;
    }
    try {
      final profile = await ref.refresh(recommendationProfileProvider.future);
      if (!ref.mounted || generation != _generation) return;
      if (profile is! Success<RecommendationProfile>) {
        state = const ActivityArea(failed: true, source: 'Profile unavailable');
        return;
      }
      final p = profile.value;
      final areas = await ref.read(planningAreasProvider.future);
      if (!ref.mounted || generation != _generation) return;
      final home = areas.where((a) => a.code == p.homeAreaCode).firstOrNull;
      var failed = false;
      if (p.autoActivityLocation &&
          ref.read(contentAccessProvider).foreground) {
        if (_locatedAt == null ||
            DateTime.now().difference(_locatedAt!) >
                const Duration(minutes: 5)) {
          final result = await ref.read(regionRepositoryProvider).locate();
          if (!ref.mounted ||
              generation != _generation ||
              !ref.read(contentAccessProvider).foreground) {
            return;
          }
          if (result case Success<PlanningArea>(:final value)) {
            _located = value;
            _locatedAt = DateTime.now();
          } else {
            _located = null;
            failed = true;
          }
        }
        if (_located case final a?) {
          state = ActivityArea(
            code: a.code,
            name: a.name,
            source: 'Current area',
          );
          return;
        }
      }
      state = ActivityArea(
        code: home?.code,
        name: home?.name,
        source: home == null ? 'All Singapore' : 'Home area',
        failed: failed,
      );
    } catch (_) {
      if (ref.mounted && generation == _generation) {
        state = const ActivityArea(failed: true, source: 'Profile unavailable');
      }
    }
  }
}
