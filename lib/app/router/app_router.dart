import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/onboarding_page.dart';
import '../../features/auth/presentation/registration_page.dart';
import '../../features/check_in/presentation/check_in_page.dart';
import '../home_shell_page.dart';
import '../providers.dart';
import '../route_status_pages.dart';

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
      GoRoute(
        path: AppRoutes.startup,
        builder: (context, state) => const StartupPage(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const RegistrationPage(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) => OnboardingPage(
          onCompleted: () => context.go(AppRoutes.checkIn),
        ),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => HomeShellPage(
          onStartCheckIn: () => context.go(AppRoutes.checkIn),
        ),
      ),
      GoRoute(
        path: AppRoutes.checkIn,
        builder: (context, state) => const CheckInComposerPage(),
      ),
      GoRoute(
        path: '/check-in/:checkInId',
        builder: (context, state) => SavedCheckInPage(
          checkInId: state.pathParameters['checkInId'] ?? '',
          onReturnHome: () => context.go(AppRoutes.home),
        ),
      ),
      GoRoute(
        path: AppRoutes.unavailable,
        builder: (context, state) => const UnavailablePage(),
      ),
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
      AppRoutes.unavailable => AppRoutes.home,
      AppRoutes.onboarding => AppRoutes.checkIn,
      _ => null,
    },
  };
}

final class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen<RouterGateState>(routerGateProvider, (previous, next) {
      if (previous != next) notifyListeners();
    });
  }
}
