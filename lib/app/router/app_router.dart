import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers.dart';

abstract final class AppRoutes {
  static const startup = '/startup';
  static const register = '/register';
  static const onboarding = '/onboarding';
  static const home = '/home';
  static const checkIn = '/check-in';
  static const unavailable = '/unavailable';

  static String savedCheckIn(String checkInId) =>
      '/check-in/${Uri.encodeComponent(checkInId)}';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = RouterRefreshNotifier(ref);
  final router = GoRouter(
    initialLocation: AppRoutes.startup,
    refreshListenable: refresh,
    redirect: (context, state) => redirectFor(
      gate: ref.read(routerGateProvider),
      location: state.matchedLocation,
    ),
    routes: [
      _boundaryRoute(AppRoutes.startup, 'route-startup'),
      _boundaryRoute(AppRoutes.register, 'route-register'),
      _boundaryRoute(AppRoutes.onboarding, 'route-onboarding'),
      _boundaryRoute(AppRoutes.home, 'route-home'),
      _boundaryRoute(AppRoutes.checkIn, 'route-check-in'),
      GoRoute(
        path: '/check-in/:checkInId',
        builder: (context, state) =>
            const RouteBoundaryPage(boundaryKey: Key('route-check-in-saved')),
      ),
      _boundaryRoute(AppRoutes.unavailable, 'route-unavailable'),
    ],
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});

String? redirectFor({required RouterGateState gate, required String location}) {
  return switch (gate) {
    RouterGateState.resolving =>
      location == AppRoutes.startup ? null : AppRoutes.startup,
    RouterGateState.unauthenticated =>
      location == AppRoutes.register ? null : AppRoutes.register,
    RouterGateState.onboardingRequired =>
      location == AppRoutes.onboarding ? null : AppRoutes.onboarding,
    RouterGateState.unavailable =>
      location == AppRoutes.unavailable ? null : AppRoutes.unavailable,
    RouterGateState.authenticated => switch (location) {
      AppRoutes.startup ||
      AppRoutes.register ||
      AppRoutes.onboarding ||
      AppRoutes.unavailable => AppRoutes.home,
      _ => null,
    },
  };
}

GoRoute _boundaryRoute(String path, String keyValue) {
  return GoRoute(
    path: path,
    builder: (context, state) => RouteBoundaryPage(boundaryKey: Key(keyValue)),
  );
}

final class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen<RouterGateState>(routerGateProvider, (previous, next) {
      if (previous != next) notifyListeners();
    });
  }
}

/// A compile-safe integration seam for DU's independently owned R6 surfaces.
/// It intentionally contains no product copy, visual design, or interaction.
final class RouteBoundaryPage extends StatelessWidget {
  const RouteBoundaryPage({required this.boundaryKey, super.key});

  final Key boundaryKey;

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: SizedBox.expand(key: boundaryKey));
  }
}
