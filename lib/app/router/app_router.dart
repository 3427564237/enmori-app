import '../../features/admin/presentation/admin_pages.dart';
import '../admin_event_category_entry.dart';

import 'package:flutter/material.dart';

import '../../core/presentation/enmori_localizations.dart';
import "../../features/recommendation_profile/presentation/recommendation_profile_page.dart";
import "../../features/recommendation_profile/presentation/activity_area_bar.dart";
import '../../features/weather/presentation/home_weather_card.dart';
import '../remote_social_composition.dart';
import '../../features/friends/presentation/friend_module_page.dart';
import '../../features/event_browse/event_browse_providers.dart';
import '../../features/event_participation/presentation/own_participation_section.dart';
import '../../features/event_participation/presentation/plan_comparison_page.dart';
import '../event_recommendation_card.dart';
import 'event_participation_routes.dart';

import '../social_demo_presentation.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_providers.dart';
import '../../features/account/presentation/onboarding_page.dart';
import '../../features/account/presentation/registration_profile_page.dart';
import '../../features/account/presentation/own_profile_page.dart';
import '../../features/account/presentation/account_preferences_page.dart';
import '../../features/account/presentation/account_preferences_controller.dart';
import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../core/result/result.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/auth/presentation/registration_page.dart';
import '../../features/auth/presentation/sign_in_page.dart';
import '../../features/check_in/presentation/check_in_page.dart';
import '../../features/check_in/presentation/check_in_from_record_page.dart';
import '../../features/check_in/presentation/check_in_history_controller.dart';
import '../../features/event_recommendations/presentation/event_recommendations_page.dart';
import '../../features/interests/presentation/interest_editor_page.dart';
import '../../features/interests/presentation/admin_interest_catalogue_page.dart';
import '../../features/language/presentation/app_language_control.dart';
import '../interest_admin_entry.dart';
import '../home_shell_page.dart';
import '../home_today_section.dart';
import '../../features/event_detail/presentation/event_detail_page.dart';
import '../../features/friends/presentation/friend_page.dart';
import '../../features/friends/presentation/my_friends_page.dart';
import '../providers.dart';
import '../route_status_pages.dart';
import 'isolated_persona_pages.dart';
import 'isolated_history_ai_pages.dart';
import 'activity_routes.dart';
import 'companion_navigation.dart';
import '../../features/proactive/presentation/proactive_follow_up_page.dart';
import '../../features/proactive/presentation/proactive_settings_page.dart';
import '../../features/proactive/presentation/proactive_push_controls.dart';
import '../../features/proactive/proactive_notification_controller.dart';

abstract final class AppRoutes {
  static const startup = '/startup';
  static const register = '/register';
  static const signIn = '/sign-in';
  static const onboarding = '/onboarding';
  static const setupInterests = '/setup-interests';
  static const setupProfile = '/setup-profile';
  static const home = '/home';
  static const profile = '/profile';
  static const personas = '/personas';
  static const managePersonas = '/personas/manage';
  static const newPersona = '/personas/new';

  static String editPersona(String personaId) =>
      '/personas/${Uri.encodeComponent(personaId)}/edit';
  static const profileEdit = '/profile/edit';
  static const settings = '/settings';
  static const aiSettings = '/ai/settings';
  static const checkIn = '/check-in';
  static const checkInHistory = '/check-ins/history';
  static const footprint = '/check-ins/footprint';
  static const aiAssistant = '/ai-assistant';
  static const aiMessage = '/ai/message';
  static const aiCheckIn = '/ai/reference';
  static const aiFollowUps = '/ai/follow-ups';
  static const newAiFollowUp = '/ai/follow-ups/new';
  static const interests = '/interests';
  static const adminInterests = '/admin/interests';
  static const eventRecommendations = '/events';
  static const activities = '/activities';
  static const eventPlans = '/event-plans';
  static String comparePlans(String username) =>
      '/people/${Uri.encodeComponent(username)}/plans/compare';
  static const unavailable = '/unavailable';
  static const configurationUnavailable = '/configuration-unavailable';
  static const forbidden = '/account-unavailable';

  static String savedCheckIn(String checkInId) =>
      '/check-in/${Uri.encodeComponent(checkInId)}';

  static String checkInFrom(String checkInId) =>
      Uri(path: checkIn, queryParameters: {'from': checkInId}).toString();
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

/// Explicit isolated composition only; ordinary/real-account root stays disabled.
final eventParticipationEnabledProvider = Provider<bool>((ref) => false);

final appRouterProvider = Provider<GoRouter>((ref) {
  // An account-owned route stack must not survive an identity replacement.
  final routeSubject = ref.watch(currentAuthSubjectProvider);
  final remoteGroup = ref.watch(remoteGroupFeaturesEnabledProvider);
  final isolatedSlices =
      ref.watch(isolatedSlicesEnabledProvider) || remoteGroup;
  final socialPresentation = ref.watch(socialDemoPresentationProvider);
  final activitiesEnabled = ref.watch(activityBrowseEnabledProvider);
  final participationEnabled =
      isolatedSlices &&
      activitiesEnabled &&
      ref.watch(eventParticipationEnabledProvider);
  final eventOpener = participationEnabled
      ? ref.watch(externalActivityOpenerProvider)
      : null;
  String eventPath(String id) =>
      '/events/${Uri.encodeComponent(id)}${participationEnabled ? "/participation" : ""}';
  final personaPages = isolatedSlices
      ? ref.watch(isolatedPersonaPagesProvider)
      : null;
  final historyPage = isolatedSlices
      ? ref.watch(isolatedHistoryPageProvider)
      : null;
  final aiPage = isolatedSlices
      ? ref.watch(isolatedAiConversationPageProvider)
      : null;
  final companionEnabled =
      aiPage != null && ref.watch(companionFirstFlowEnabledProvider);
  final referencesEnabled =
      aiPage != null &&
      (companionEnabled || ref.watch(aiCompanionReferencesEnabledProvider));
  final companionMessagePage = referencesEnabled
      ? ref.watch(companionMessagePageProvider)
      : null;
  final companionCheckInPage = referencesEnabled
      ? ref.watch(companionCheckInPageProvider)
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
      (ref.read(isolatedSlicesEnabledProvider) ||
          ref.read(remoteGroupFeaturesEnabledProvider)) &&
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
      if (remoteGroup) ...[
        GoRoute(
          path: AppRoutes.footprint,
          builder: (_, _) => const ConnectedOwnFootprint(),
        ),
        GoRoute(
          path: '/people/:username/footprint',
          builder: (_, state) => ConnectedSocialProfile(
            username: state.pathParameters['username']!,
            footprint: true,
          ),
        ),
      ],
      if (remoteGroup)
        GoRoute(
          path: '/people/:username',
          builder: (context, state) => ConnectedSocialProfile(
            username: state.pathParameters['username']!,
          ),
        ),

      if (participationEnabled && eventOpener != null) ...[
        ...eventParticipationRoutes(
          opener: eventOpener,
          current: canNavigateActivity,
          listPath: AppRoutes.activities,
          plansPath: AppRoutes.eventPlans,
          recommendationsBuilder: (context, browse) => EventRecommendationsPage(
            embedded: true,
            onBrowseAll: browse,
            recommendationCardBuilder: (context, event, onOpen) =>
                ConnectedRecommendationCard(event: event, onOpen: onOpen),
            onOpenEvent: (id) {
              if (context.mounted && canNavigateActivity()) {
                context.push<void>(eventPath(id));
              }
            },
          ),
          wrapList: (context, child) =>
              rootTab(context, AppRoutes.activities, 2, child),
          onProfile: (context, username) =>
              context.push('/event-people/${Uri.encodeComponent(username)}'),
        ),
        GoRoute(
          path: '/event-people/:username',
          builder: (context, state) => remoteGroup
              ? ConnectedSocialProfile(
                  username: state.pathParameters['username']!,
                )
              : FriendPage(
                  key: ValueKey(state.pathParameters['username']),
                  initialUsername: state.pathParameters['username'],
                ),
        ),
        GoRoute(
          path: '/people/:username/plans/compare',
          builder: (context, state) => EventPlanComparisonPage(
            username: state.pathParameters['username'] ?? '',
            onBack: () {
              if (!context.mounted ||
                  !canNavigateActivity() ||
                  GoRouter.of(context).state.uri != state.uri ||
                  ModalRoute.of(context)?.isCurrent != true) {
                return;
              }
              if (context.canPop()) {
                context.pop();
              } else {
                context.go(
                  '${remoteGroup ? '/people' : '/event-people'}/${Uri.encodeComponent(state.pathParameters['username'] ?? '')}',
                );
              }
            },
            onOpenEvent: (id) async {
              if (!context.mounted ||
                  !canNavigateActivity() ||
                  GoRouter.of(context).state.uri != state.uri ||
                  ModalRoute.of(context)?.isCurrent != true) {
                return;
              }
              await context.push<void>(eventPath(id));
            },
          ),
        ),
      ],
      if (activitiesEnabled && !participationEnabled)
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
          name: 'root-ai',
          builder: (context, state) => aiPage.build(
            context,
            onBack: () => backFromShared(context, AppRoutes.aiAssistant),
            onOpenSettings: () => openShared(
              context,
              AppRoutes.aiAssistant,
              AppRoutes.aiSettings,
            ),
          ),
        ),
      if (referencesEnabled) ...[
        if (companionCheckInPage != null)
          GoRoute(
            path: AppRoutes.aiCheckIn,
            builder: (context, state) {
              final extra = state.extra;
              if (extra is! AiCheckInNavigation ||
                  extra.checkInId.trim().isEmpty ||
                  routeSession == null ||
                  !identical(extra.session, routeSession)) {
                return const ConfigurationUnavailablePage();
              }
              return companionCheckInPage.build(
                context,
                checkInId: extra.checkInId,
                onBack: () => backFromShared(context, AppRoutes.aiCheckIn),
                onOpenSettings: () => openShared(
                  context,
                  AppRoutes.aiCheckIn,
                  AppRoutes.aiSettings,
                ),
              );
            },
          ),
        if (companionMessagePage != null)
          GoRoute(
            path: AppRoutes.aiMessage,
            builder: (context, state) {
              final extra = state.extra;
              if (extra is! AiMessageNavigation ||
                  routeSession == null ||
                  !identical(extra.session, routeSession)) {
                return const ConfigurationUnavailablePage();
              }
              return companionMessagePage.build(
                context,
                locator: extra.locator,
                onBack: () => backFromShared(context, AppRoutes.aiMessage),
                onOpenSettings: () => openShared(
                  context,
                  AppRoutes.aiMessage,
                  AppRoutes.aiSettings,
                ),
              );
            },
          ),
      ],
      if (companionEnabled) ...[
        GoRoute(
          path: AppRoutes.aiFollowUps,
          builder: (context, state) => ProactiveSettingsPage(
            key: ValueKey((routeSession, AppRoutes.aiFollowUps)),
            onBack: () => backFromShared(context, AppRoutes.aiFollowUps),
            onOpenSettings: () => openShared(
              context,
              AppRoutes.aiFollowUps,
              AppRoutes.aiSettings,
            ),
            pushControls: const ProactivePushControls(),
          ),
        ),
        GoRoute(
          path: AppRoutes.newAiFollowUp,
          builder: (context, state) {
            final extra = state.extra;
            if (extra is! FollowUpNavigation ||
                routeSession == null ||
                !identical(extra.session, routeSession)) {
              return const ConfigurationUnavailablePage();
            }
            return ProactiveFollowUpPage(
              key: ValueKey((routeSession, extra.source)),
              source: extra.source,
              onBack: () => backFromShared(context, AppRoutes.newAiFollowUp),
              onOpenSettings: () => openShared(
                context,
                AppRoutes.newAiFollowUp,
                AppRoutes.aiSettings,
              ),
            );
          },
        ),
      ],
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
          name: 'root-friends',
          builder: (context, state) => rootTab(
            context,
            '/friends',
            1,
            remoteGroup
                ? FriendModulePage(
                    initialDiscovery:
                        state.uri.queryParameters['view'] == 'discover',
                    openAttribution: openGroupAttribution,
                    recordBuilder: groupCheckInRecordBuilder,
                    participationBuilder: groupParticipationBuilder,
                    onOpenEvent: (id) => context.push<void>(eventPath(id)),
                  )
                : FriendPage(
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
          builder: (context, state) => EventDetailPage(
            eventId: state.pathParameters['eventId'] ?? '',
            adminCategoryBuilder: (event, refresh) => AdminEventCategoryEntry(
              eventId: event.eventId,
              title: event.title,
              onReturn: refresh,
            ),
          ),
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
          onCompleted: () => context.go(AppRoutes.setupProfile),
        ),
      ),
      GoRoute(
        path: AppRoutes.setupProfile,
        builder: (context, state) => RegistrationProfilePage(
          hasRecommendationStep: remoteGroup,
          onContinue: () async {
            final session = ref.read(authSessionProvider).asData?.value;
            if (remoteGroup) {
              await Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) =>
                      const RecommendationProfilePage(onboarding: true),
                ),
              );
            }
            if (context.mounted &&
                identical(
                  session,
                  ref.read(authSessionProvider).asData?.value,
                )) {
              context.go(AppRoutes.setupInterests);
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.setupInterests,
        builder: (context, state) => InterestEditorPage(
          setupStepCount: remoteGroup ? 3 : 2,
          onSaved: (_) => context.go(AppRoutes.home),
          onSkip: () => context.go(AppRoutes.home),
        ),
      ),
      GoRoute(
        path: AppRoutes.home,
        name: 'root-home',
        builder: (context, state) => HomeShellPage(
          greeting: remoteGroup ? const ConnectedHomeGreeting() : null,
          recommendationControls: remoteGroup ? const ActivityAreaBar() : null,
          onContinueDiscovery: () async {
            if (!canNavigateShared(context, AppRoutes.home)) return;
            await context.push<void>(
              '${AppRoutes.eventRecommendations}?from=2',
            );
          },
          daySection: historyPage != null
              ? HomeTodaySection(
                  onOpenCheckIn: (id) async {
                    if (!canNavigateShared(context, AppRoutes.home)) return;
                    await context.push<void>(AppRoutes.savedCheckIn(id));
                  },
                  onOpenHistory: () async {
                    if (!canNavigateShared(context, AppRoutes.home)) return;
                    await context.push<void>(AppRoutes.checkInHistory);
                  },
                )
              : null,
          socialSection: remoteGroup ? const GroupHomeSocial() : null,
          weatherSection: remoteGroup
              ? HomeWeatherCard(
                  openAttribution: openGroupAttribution,
                  onOpenSettings: () =>
                      openShared(context, AppRoutes.home, AppRoutes.settings),
                )
              : null,
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
          onStartCheckIn: () => context.push<void>(AppRoutes.checkIn),
          onBrowseActivities: activitiesEnabled
              ? () {
                  if (context.mounted && canNavigateActivity()) {
                    context.push<void>(AppRoutes.activities);
                  }
                }
              : null,
          onOpenFootprint: remoteGroup
              ? () => openShared(context, AppRoutes.home, AppRoutes.footprint)
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
          recommendationCardBuilder: participationEnabled
              ? (context, event, onOpen) =>
                    ConnectedRecommendationCard(event: event, onOpen: onOpen)
              : null,
          onOpenEvent: isolatedSlices
              ? (id) {
                  if (context.mounted &&
                      (!participationEnabled || canNavigateActivity())) {
                    context.push<void>(eventPath(id));
                  }
                }
              : null,
          // The visible recommendation section owns the fresh return read.
          onOpenProfile: () => context.push<void>(AppRoutes.profile),
          onEditInterests: () => context.push<bool>(AppRoutes.interests),
          onSeeAllEvents: () =>
              context.push<void>(AppRoutes.eventRecommendations),
        ),
      ),
      GoRoute(
        path: AppRoutes.profile,
        name: 'root-profile',
        builder: (context, state) => rootTab(
          context,
          AppRoutes.profile,
          4,
          OwnProfilePage(
            onManagePersonas: personaPages != null
                ? () => openPersona(context, AppRoutes.personas)
                : null,
            adminCatalogueEntry: InterestAdminEntry(
              onOpen: () => context.push<void>('/admin'),
            ),
            onOpenHistory: historyPage != null
                ? () => context.push<void>(AppRoutes.checkInHistory)
                : null,
            onOpenFootprint: remoteGroup
                ? () => context.push<void>(AppRoutes.footprint)
                : null,
            onOpenRecords: remoteGroup
                ? (username) => context.push<void>(
                    '/people/${Uri.encodeComponent(username)}',
                  )
                : null,
            participationSection: participationEnabled
                ? OwnParticipationSection(
                    onSelect: (id) {
                      if (context.mounted && canNavigateActivity()) {
                        context.push<void>(eventPath(id));
                      }
                    },
                  )
                : null,
            onEditProfile: () async {
              await context.push<void>(AppRoutes.profileEdit);
            },
            onOpenSettings: () async {
              await context.push<void>(AppRoutes.settings);
            },
            onOpenRecommendationProfile: remoteGroup
                ? () => Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => const RecommendationProfilePage(),
                    ),
                  )
                : null,
            onEditInterests: () async {
              await context.push<bool>(AppRoutes.interests);
            },
          ),
        ),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => AdminHomePage(
          open: (page) => context.push<void>(
            page == 'interests' ? AppRoutes.adminInterests : '/admin/$page',
          ),
        ),
      ),
      for (final page in ['status', 'categories', 'records'])
        GoRoute(
          path: '/admin/$page',
          builder: (context, state) => AdminPanelPage(
            page: page,
            openEvents: () => context.push<void>('/activities'),
          ),
        ),
      GoRoute(
        path: AppRoutes.adminInterests,
        builder: (context, state) => Consumer(
          builder: (context, widgetRef, _) {
            final session = widgetRef.watch(authSessionProvider).asData?.value;
            return AdminInterestCataloguePage(
              onBack: () {
                if (!context.mounted ||
                    session is! AuthSessionAuthenticated ||
                    !identical(
                      widgetRef.read(authSessionProvider).asData?.value,
                      session,
                    ) ||
                    widgetRef.read(routerGateProvider) !=
                        RouterGateState.authenticated ||
                    GoRouter.of(context).state.uri.path !=
                        AppRoutes.adminInterests) {
                  return;
                }
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go(AppRoutes.profile);
                }
              },
            );
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.profileEdit,
        builder: (context, state) => AccountPreferencesPage(
          view: PreferencesView.profile,
          recommendationSection: !remoteGroup
              ? null
              : ListTile(
                  title: Text(context.tr('Recommendation profile', '推荐资料')),
                  subtitle: Text(
                    context.tr(
                      'Home area, birthday and discovery',
                      '常用地区、生日与好友发现',
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => const RecommendationProfilePage(),
                    ),
                  ),
                ),
        ),
      ),
      GoRoute(
        path: AppRoutes.aiSettings,
        builder: (context, state) => AccountPreferencesPage(
          view: PreferencesView.settings,
          aiOnly: true,
          onOpenPersonas: () => context.push<void>(AppRoutes.personas),
        ),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => AccountPreferencesPage(
          view: PreferencesView.settings,
          languageSection: const AppLanguageControl(),
          onEditProfile: () async {
            await context.push<void>(AppRoutes.profileEdit);
          },
          onSignOut: () async {
            if (!ref.mounted) {
              return const Failure<void>(
                AppFailure(
                  kind: AppFailureKind.authRequired,
                  message: 'The signed-in session has changed.',
                ),
              );
            }
            final entry = ref.read(signOutEntryProvider.notifier);
            final auth = ref.read(authRepositoryProvider);
            final session = ref.read(authSessionProvider).asData?.value;
            if (companionEnabled &&
                (session is! AuthSessionAuthenticated ||
                    !identical(session, routeSession))) {
              return const Failure<void>(
                AppFailure(
                  kind: AppFailureKind.authRequired,
                  message: 'The signed-in session has changed.',
                ),
              );
            }
            if (companionEnabled &&
                ref.exists(proactiveNotificationControllerProvider)) {
              try {
                await ref
                    .read(proactiveNotificationControllerProvider.notifier)
                    .beforeSignOut()
                    .timeout(const Duration(seconds: 15));
              } catch (_) {
                // Logout remains available if device/server cleanup is unknown.
                // The controller retains its original session/physical guards.
              }
            }
            if (!ref.mounted ||
                !identical(
                  ref.read(authSessionProvider).asData?.value,
                  session,
                )) {
              return const Failure<void>(
                AppFailure(
                  kind: AppFailureKind.authRequired,
                  message: 'The signed-in session has changed.',
                ),
              );
            }
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
          onBrowseAll: () => context.push<void>(AppRoutes.activities),
          initialEventIndex: state.uri.queryParameters['from'] == '2' ? 2 : 0,
          recommendationCardBuilder: participationEnabled
              ? (context, event, onOpen) =>
                    ConnectedRecommendationCard(event: event, onOpen: onOpen)
              : null,
          onOpenEvent: isolatedSlices
              ? (id) {
                  if (context.mounted &&
                      (!participationEnabled || canNavigateActivity())) {
                    context.push<void>(eventPath(id));
                  }
                }
              : null,
        ),
      ),
      GoRoute(
        path: AppRoutes.checkIn,
        builder: (context, state) {
          final sourceId = state.uri.queryParameters['from'];
          if (historyPage != null && sourceId != null) {
            bool current() =>
                canNavigateShared(context, AppRoutes.checkIn) &&
                GoRouter.of(context).state.uri == state.uri &&
                ModalRoute.of(context)?.isCurrent == true;
            return CheckInFromRecordPage(
              key: ValueKey((routeSession, sourceId)),
              sourceCheckInId: sourceId,
              located: remoteGroup,
              socialStyle: socialPresentation,
              openAttribution: openGroupAttribution,
              onDiscard: () {
                if (!current()) return;
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go(
                    sourceId.isEmpty
                        ? AppRoutes.checkInHistory
                        : AppRoutes.savedCheckIn(sourceId),
                  );
                }
              },
              onReturnHome: () {
                if (current()) context.go(AppRoutes.home);
              },
              onOpenSaved: (id) {
                if (current()) {
                  context.pushReplacement(AppRoutes.savedCheckIn(id));
                }
              },
              onOpenHistory: () {
                if (current()) context.push<void>(AppRoutes.checkInHistory);
              },
            );
          }
          return CheckInComposerPage(
            key: ValueKey(routeSession),
            located: remoteGroup,
            onOpenSaved: (id) =>
                context.pushReplacement(AppRoutes.savedCheckIn(id)),
            onOpenHistory: historyPage != null
                ? () => context.push<void>(AppRoutes.checkInHistory)
                : null,
            openAttribution: openGroupAttribution,
            socialStyle: socialPresentation,
            onReturnHome: () => context.go(AppRoutes.home),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.interests,
        builder: (context, state) =>
            InterestEditorPage(onSaved: (_) => context.pop(true)),
      ),
      GoRoute(
        path: '/check-in/:checkInId',
        builder: (context, state) => SavedCheckInPage(
          key: ValueKey(routeSession),
          placeActions: remoteGroup,
          checkInId: state.pathParameters['checkInId'] ?? '',
          openAttribution: openGroupAttribution,
          onReturnHome: () => context.go(AppRoutes.home),
          onReferenceInAi: companionCheckInPage != null
              ? (id) {
                  if (id != state.pathParameters['checkInId'] ||
                      !canNavigateShared(context, state.uri.path) ||
                      ModalRoute.of(context)?.isCurrent != true) {
                    return;
                  }
                  context.push<void>(
                    AppRoutes.aiCheckIn,
                    extra: AiCheckInNavigation(
                      session: routeSession!,
                      checkInId: id,
                    ),
                  );
                }
              : null,
          onStartNewDraft: historyPage != null
              ? (id) {
                  final expectedId = state.pathParameters['checkInId'];
                  if (id != expectedId ||
                      !canNavigateShared(context, state.uri.path) ||
                      ModalRoute.of(context)?.isCurrent != true) {
                    return;
                  }
                  context.push<void>(AppRoutes.checkInFrom(id));
                }
              : null,
        ),
      ),
      GoRoute(
        path: AppRoutes.unavailable,
        builder: (context, state) => UnavailablePage(
          onRetry: () {
            if (ref.read(authSessionProvider).hasError) {
              // Retry observation; the SDK still supplies the actual identity.
              ref.invalidate(authSessionProvider);
              return;
            }
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
      AppRoutes.onboarding => AppRoutes.setupProfile,
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
