import 'package:flutter/widgets.dart';

import '../social_demo_presentation.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_providers.dart';
import '../../features/account/presentation/onboarding_page.dart';
import '../../features/account/presentation/own_profile_page.dart';
import '../../features/account/presentation/account_preferences_page.dart';
import '../../features/account/presentation/account_preferences_controller.dart';
import '../../core/result/result.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/auth/presentation/registration_page.dart';
import '../../features/auth/presentation/sign_in_page.dart';
import '../../features/check_in/presentation/check_in_page.dart';
import '../../features/check_in/presentation/check_in_history_controller.dart';
import '../../features/event_recommendations/domain/event_recommendation_repository.dart';
import '../../features/event_recommendations/presentation/event_recommendations_controller.dart';
import '../../features/event_recommendations/presentation/event_recommendations_page.dart';
import '../../features/interests/presentation/interest_editor_page.dart';
import '../home_shell_page.dart';
import '../../features/event_detail/presentation/event_detail_page.dart';
import '../../features/friends/presentation/friend_page.dart';
import '../../features/friends/presentation/my_friends_page.dart';
import '../providers.dart';
import '../route_status_pages.dart';
import 'isolated_persona_pages.dart';
import 'isolated_history_ai_pages.dart';
import 'activity_routes.dart';

abstract final class AppRoutes {
  static const startup = '/startup';
  static const register = '/register';
  static const signIn = '/sign-in';
  static const onboarding = '/onboarding';
  static const setupInterests = '/setup-interests';
  static const home = '/home';
  static const profile = '/profile';
  static const personas = '/personas';
  static const managePersonas = '/personas/manage';
  static const newPersona = '/personas/new';

  static String editPersona(String personaId) =>
      '/personas/${Uri.encodeComponent(personaId)}/edit';
  static const profileEdit = '/profile/edit';
  static const settings = '/settings';
  static const checkIn = '/check-in';
  static const checkInHistory = '/check-ins/history';
  static const aiAssistant = '/ai-assistant';
  static const interests = '/interests';
  static const eventRecommendations = '/events';
  static const activities = '/activities';
  static const unavailable = '/unavailable';
  static const configurationUnavailable = '/configuration-unavailable';
  static const forbidden = '/account-unavailable';

  static String savedCheckIn(String checkInId) =>
      '/check-in/${Uri.encodeComponent(checkInId)}';
}

/// Only a currently observed controlled session may switch a visible root tab.
/// AI calls this only after its existing draft/pending-operation leave guard.
void selectConnectedSocialTab(
  BuildContext context,
  int index, {
  required AuthSession? session,
  required String sourcePath,
}) {
  if (!context.mounted || session is! AuthSessionAuthenticated) return;
  final scope = ProviderScope.containerOf(context, listen: false);
  if (!scope.read(socialDemoPresentationProvider) ||
      scope.read(routerGateProvider) != RouterGateState.authenticated ||
      !identical(scope.read(authSessionProvider).value, session) ||
      GoRouter.of(context).state.uri.path != sourcePath) {
    return;
  }
  const paths = [
    AppRoutes.home,
    '/friends',
    AppRoutes.activities,
    AppRoutes.aiAssistant,
    AppRoutes.profile,
  ];
  if (index < 0 || index >= paths.length || paths[index] == sourcePath) return;
  context.go(paths[index]);
}

final appRouterProvider = Provider<GoRouter>((ref) {
  // An account-owned route stack must not survive an identity replacement.
  final routeSubject = ref.watch(currentAuthSubjectProvider);
  final isolatedSlices = ref.watch(isolatedSlicesEnabledProvider);
  final socialPresentation = ref.watch(socialDemoPresentationProvider);
  final activitiesEnabled = ref.watch(activityBrowseEnabledProvider);
  final personaPages = isolatedSlices
      ? ref.watch(isolatedPersonaPagesProvider)
      : null;
  final historyPage = isolatedSlices
      ? ref.watch(isolatedHistoryPageProvider)
      : null;
  final aiPage = isolatedSlices
      ? ref.watch(isolatedAiConversationPageProvider)
      : null;

  // Observe same-UID replacement only for an available shared feature. Existing
  // compositions retain their auth dependency path when no page is supplied.
  final routeSession =
      historyPage != null || aiPage != null || activitiesEnabled
      ? ref.watch(
          authSessionProvider.select(
            (value) => switch (value) {
              AsyncData<AuthSession>(
                value: final AuthSessionAuthenticated session,
              ) =>
                session,
              _ => null,
            },
          ),
        )
      : null;

  bool canNavigateActivity() =>
      ref.mounted &&
      activitiesEnabled &&
      routeSession != null &&
      identical(ref.read(authSessionProvider).asData?.value, routeSession) &&
      ref.read(activityBrowseEnabledProvider) &&
      ref.read(routerGateProvider) == RouterGateState.authenticated;

  bool canNavigateShared(BuildContext context, String sourcePath) =>
      context.mounted &&
      ref.mounted &&
      routeSubject != null &&
      routeSession != null &&
      identical(ref.read(authSessionProvider).asData?.value, routeSession) &&
      ref.read(currentAuthSubjectProvider) == routeSubject &&
      ref.read(routerGateProvider) == RouterGateState.authenticated &&
      ref.read(isolatedSlicesEnabledProvider) &&
      GoRouter.of(context).state.uri.path == sourcePath;

  void openShared(BuildContext context, String sourcePath, String destination) {
    if (canNavigateShared(context, sourcePath)) {
      context.push<void>(destination);
    }
  }

  void backFromShared(BuildContext context, String sourcePath) {
    if (!canNavigateShared(context, sourcePath)) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.home);
    }
  }

  bool canNavigatePersona(BuildContext context) =>
      context.mounted &&
      ref.mounted &&
      routeSubject != null &&
      ref.read(currentAuthSubjectProvider) == routeSubject &&
      ref.read(routerGateProvider) == RouterGateState.authenticated;

  void openPersona(BuildContext context, String path) {
    if (canNavigatePersona(context)) context.push<void>(path);
  }

  void backFromPersona(
    BuildContext context, {
    String fallback = AppRoutes.personas,
  }) {
    if (!canNavigatePersona(context)) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(fallback);
    }
  }

  Widget rootTab(BuildContext context, String path, int index, Widget child) =>
      socialPresentation
      ? SocialDemoTab(
          selectedIndex: index,
          onSelected: (index) => selectConnectedSocialTab(
            context,
            index,
            session: routeSession,
            sourcePath: path,
          ),
          child: child,
        )
      : child;

  final refresh = RouterRefreshNotifier(ref);
  final router = GoRouter(
    initialLocation: AppRoutes.startup,
    refreshListenable: refresh,
    redirect: (context, state) => redirectFor(
      gate: ref.read(routerGateProvider),
      location: state.matchedLocation,
      signedOutEntry: ref.read(signOutEntryProvider),
    ),
    routes: [
      if (activitiesEnabled)
        ...activityRoutes(
          current: canNavigateActivity,
          wrapList: (context, child) =>
              rootTab(context, AppRoutes.activities, 2, child),
        ),
      if (historyPage != null)
        GoRoute(
          path: AppRoutes.checkInHistory,
          builder: (context, state) => historyPage.build(
            context,
            onBack: () => backFromShared(context, AppRoutes.checkInHistory),
            onOpenSavedCheckIn: (id) async {
              if (!canNavigateShared(context, AppRoutes.checkInHistory)) return;
              await context.push<void>(AppRoutes.savedCheckIn(id));
              if (!context.mounted || !ref.mounted) return;
              if (canNavigateShared(context, AppRoutes.checkInHistory) &&
                  ref.exists(checkInHistoryControllerProvider)) {
                await ref
                    .read(checkInHistoryControllerProvider.notifier)
                    .reload();
              }
            },
          ),
        ),
      if (aiPage != null)
        GoRoute(
          path: AppRoutes.aiAssistant,
          builder: (context, state) => aiPage.build(
            context,
            onBack: () => backFromShared(context, AppRoutes.aiAssistant),
            onOpenSettings: () =>
                openShared(context, AppRoutes.aiAssistant, AppRoutes.settings),
          ),
        ),
      if (personaPages != null) ...[
        GoRoute(
          path: AppRoutes.personas,
          builder: (context, state) => personaPages.overview(
            context,
            onManage: () => openPersona(context, AppRoutes.managePersonas),
            onBack: () => backFromPersona(context, fallback: AppRoutes.home),
          ),
        ),
        GoRoute(
          path: AppRoutes.managePersonas,
          builder: (context, state) => personaPages.management(
            context,
            onCreate: () => openPersona(context, AppRoutes.newPersona),
            onEdit: (id) => openPersona(context, AppRoutes.editPersona(id)),
            onBack: () => backFromPersona(context),
          ),
        ),
        GoRoute(
          path: AppRoutes.newPersona,
          builder: (context, state) => personaPages.create(
            context,
            onBack: () => backFromPersona(context),
          ),
        ),
        GoRoute(
          path: '/personas/:personaId/edit',
          builder: (context, state) => personaPages.edit(
            context,
            personaId: state.pathParameters['personaId'] ?? '',
            onBack: () => backFromPersona(context),
          ),
        ),
      ],
      if (isolatedSlices)
        GoRoute(
          path: '/friends',
          builder: (context, state) => rootTab(
            context,
            '/friends',
            1,
            FriendPage(
              onOpenMyFriends: () => context.push<void>('/friends/list'),
            ),
          ),
        ),
      if (isolatedSlices)
        GoRoute(
          path: '/friends/list',
          builder: (context, state) => const MyFriendsListPage(),
        ),
      if (isolatedSlices)
        GoRoute(
          path: '/events/:eventId',
          builder: (context, state) =>
              EventDetailPage(eventId: state.pathParameters['eventId'] ?? ''),
        ),
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
        builder: (context, state) => OnboardingPage(
          onCompleted: () => context.go(AppRoutes.setupInterests),
        ),
      ),
      GoRoute(
        path: AppRoutes.setupInterests,
        builder: (context, state) => InterestEditorPage(
          onSaved: (_) => context.go(AppRoutes.home),
          onSkip: () => context.go(AppRoutes.home),
        ),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => HomeShellPage(
          socialStyle: socialPresentation,
          onSelectTab: socialPresentation
              ? (index) => selectConnectedSocialTab(
                  context,
                  index,
                  session: routeSession,
                  sourcePath: AppRoutes.home,
                )
              : null,
          onOpenSettings: socialPresentation
              ? () => openShared(context, AppRoutes.home, AppRoutes.settings)
              : null,
          onStartCheckIn: () => context.go(AppRoutes.checkIn),
          onBrowseActivities: activitiesEnabled
              ? () {
                  if (context.mounted && canNavigateActivity()) {
                    context.push<void>(AppRoutes.activities);
                  }
                }
              : null,
          onOpenHistory: historyPage != null
              ? () => openShared(
                  context,
                  AppRoutes.home,
                  AppRoutes.checkInHistory,
                )
              : null,
          onOpenAi: aiPage != null
              ? () => openShared(context, AppRoutes.home, AppRoutes.aiAssistant)
              : null,
          onManagePersonas: personaPages != null
              ? () => openPersona(context, AppRoutes.personas)
              : null,
          onOpenFriends: isolatedSlices
              ? () => context.push<void>('/friends')
              : null,
          onOpenEvent: isolatedSlices
              ? (id) => context.push<void>('/events/${Uri.encodeComponent(id)}')
              : null,
          onOpenProfile: () async {
            final subject = ref.read(currentAuthSubjectProvider);
            await context.push<void>(AppRoutes.profile);
            if (!context.mounted ||
                ref.read(routerGateProvider) != RouterGateState.authenticated ||
                ref.read(currentAuthSubjectProvider) != subject) {
              return;
            }
            ref
                .read(eventRecommendationsControllerProvider.notifier)
                .load(view: EventRecommendationView.home);
          },
          onEditInterests: () async {
            final saved = await context.push<bool>(AppRoutes.interests);
            if (saved == true) {
              ref
                  .read(eventRecommendationsControllerProvider.notifier)
                  .load(view: EventRecommendationView.home);
            }
          },
          onSeeAllEvents: () async {
            await context.push<void>(AppRoutes.eventRecommendations);
            if (!context.mounted ||
                ref.read(routerGateProvider) != RouterGateState.authenticated) {
              return;
            }
            ref
                .read(eventRecommendationsControllerProvider.notifier)
                .load(view: EventRecommendationView.home);
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => rootTab(
          context,
          AppRoutes.profile,
          4,
          OwnProfilePage(
            onEditProfile: () async {
              await context.push<void>(AppRoutes.profileEdit);
            },
            onOpenSettings: () async {
              await context.push<void>(AppRoutes.settings);
            },
            onEditInterests: () async {
              await context.push<bool>(AppRoutes.interests);
            },
          ),
        ),
      ),
      GoRoute(
        path: AppRoutes.profileEdit,
        builder: (context, state) =>
            const AccountPreferencesPage(view: PreferencesView.profile),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => AccountPreferencesPage(
          view: PreferencesView.settings,
          onEditProfile: () async {
            await context.push<void>(AppRoutes.profileEdit);
          },
          onSignOut: () async {
            final entry = ref.read(signOutEntryProvider.notifier);
            final auth = ref.read(authRepositoryProvider);
            entry.requested(true);
            final result = await auth.signOut();
            if (result is Failure<void>) entry.requested(false);
            return result;
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.eventRecommendations,
        builder: (context, state) => EventRecommendationsPage(
          onOpenEvent: isolatedSlices
              ? (id) => context.push<void>('/events/${Uri.encodeComponent(id)}')
              : null,
        ),
      ),
      GoRoute(
        path: AppRoutes.checkIn,
        builder: (context, state) => CheckInComposerPage(
          socialStyle: socialPresentation,
          onReturnHome: () => context.go(AppRoutes.home),
        ),
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

String? redirectFor({
  required RouterGateState gate,
  required String location,
  bool signedOutEntry = false,
}) {
  return switch (gate) {
    RouterGateState.resolving =>
      location == AppRoutes.startup ? null : AppRoutes.startup,
    RouterGateState.unauthenticated =>
      location == AppRoutes.register || location == AppRoutes.signIn
          ? null
          : signedOutEntry
          ? AppRoutes.signIn
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
      AppRoutes.onboarding => AppRoutes.setupInterests,
      _ => null,
    },
  };
}

final class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(Ref ref) {
    ref.listen<bool>(signOutEntryProvider, (previous, next) {
      if (previous != next) notifyListeners();
    });
    ref.listen<RouterGateState>(routerGateProvider, (previous, next) {
      if (previous != next) notifyListeners();
    });
  }
}
