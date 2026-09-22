import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_providers.dart';
import '../../features/account/presentation/onboarding_page.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/presentation/registration_page.dart';
import '../../features/auth/presentation/sign_in_page.dart';
import '../../features/check_in/presentation/check_in_page.dart';
import '../../features/event_recommendations/domain/event_recommendation_repository.dart';
import '../../features/event_recommendations/presentation/event_recommendations_controller.dart';
import '../../features/event_recommendations/presentation/event_recommendations_page.dart';
import '../../features/interests/presentation/interest_editor_page.dart';
import '../home_shell_page.dart';
import '../providers.dart';
import '../route_status_pages.dart';

abstract final class AppRoutes {
  static const startup = '/startup';
  static const register = '/register';
  static const signIn = '/sign-in';
  static const onboarding = '/onboarding';
  static const home = '/home';
  static const checkIn = '/check-in';
  static const interests = '/interests';
  static const eventRecommendations = '/events';
  static const unavailable = '/unavailable';
  static const configurationUnavailable = '/configuration-unavailable';
  static const forbidden = '/account-unavailable';

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
        builder: (context, state) =>
            RegistrationPage(onSignIn: () => context.go(AppRoutes.signIn)),
      ),
      GoRoute(
        path: AppRoutes.signIn,
        builder: (context, state) => SignInPage(
          onCreateAccount: () => context.go(AppRoutes.register),
          onSucceeded: () {
            final subject = ref.read(currentAuthSubjectProvider);
            if (subject != null) {
              ref.invalidate(onboardingStatusProvider(subject));
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) =>
            OnboardingPage(onCompleted: () => context.go(AppRoutes.checkIn)),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => HomeShellPage(
          onStartCheckIn: () => context.go(AppRoutes.checkIn),
          onEditInterests: () async {
            final saved = await context.push<bool>(AppRoutes.interests);
            if (saved == true) {
              ref
                  .read(eventRecommendationsControllerProvider.notifier)
                  .load(view: EventRecommendationView.home);
            }
          },
          onSeeAllEvents: () => context.go(AppRoutes.eventRecommendations),
        ),
      ),
      GoRoute(
        path: AppRoutes.eventRecommendations,
        builder: (context, state) => const EventRecommendationsPage(),
      ),
      GoRoute(
        path: AppRoutes.checkIn,
        builder: (context, state) =>
            CheckInComposerPage(onReturnHome: () => context.go(AppRoutes.home)),
      ),
      GoRoute(
        path: AppRoutes.interests,
        builder: (context, state) =>
            InterestEditorPage(onSaved: (_) => context.pop(true)),
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
        builder: (context, state) => UnavailablePage(
          onRetry: () {
            final subject = ref.read(currentAuthSubjectProvider);
            if (subject != null) {
              ref.invalidate(onboardingStatusProvider(subject));
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.configurationUnavailable,
        builder: (context, state) => const ConfigurationUnavailablePage(),
      ),
      GoRoute(
        path: AppRoutes.forbidden,
        builder: (context, state) => const AccountUnavailablePage(),
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
      location == AppRoutes.register || location == AppRoutes.signIn
          ? null
          : AppRoutes.register,
    RouterGateState.signInRequired =>
      location == AppRoutes.signIn ? null : AppRoutes.signIn,
    RouterGateState.onboardingRequired =>
      location == AppRoutes.onboarding ? null : AppRoutes.onboarding,
    RouterGateState.unavailable =>
      location == AppRoutes.unavailable ? null : AppRoutes.unavailable,
    RouterGateState.configurationUnavailable =>
      location == AppRoutes.configurationUnavailable
          ? null
          : AppRoutes.configurationUnavailable,
    RouterGateState.forbidden =>
      location == AppRoutes.forbidden ? null : AppRoutes.forbidden,
    RouterGateState.authenticated => switch (location) {
      AppRoutes.startup ||
      AppRoutes.register ||
      AppRoutes.signIn ||
      AppRoutes.configurationUnavailable ||
      AppRoutes.forbidden ||
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
