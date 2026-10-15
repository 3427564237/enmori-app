import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../app/router/app_router.dart';
import '../../app/router/activity_routes.dart';
import '../../app/platform/external_activity_opener.dart';
import '../../features/event_browse/event_browse_providers.dart';
import '../../features/account/account_preferences_providers.dart';
import '../../features/account/account_providers.dart';
import '../../features/account/presentation/account_preferences_controller.dart';
import '../../features/account/presentation/account_preferences_page.dart';
import '../../features/account/presentation/onboarding_page.dart';
import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/auth/presentation/registration_page.dart';
import '../../features/auth/presentation/sign_in_page.dart';
import '../../features/check_in/check_in_providers.dart';
import '../../features/check_in/presentation/check_in_history_controller.dart';
import '../../features/check_in/presentation/check_in_history_page.dart'
    as history;
import '../../features/check_in/presentation/check_in_page.dart';
import '../../features/event_detail/event_detail_providers.dart';
import '../../features/event_detail/presentation/event_detail_page.dart';
import '../../features/event_recommendations/event_recommendations_providers.dart';
import '../../features/event_recommendations/presentation/event_recommendations_page.dart';
import '../../features/friends/friend_providers.dart';
import '../../features/friends/presentation/friend_page.dart';
import '../../features/friends/presentation/my_friends_page.dart';
import '../../features/interests/interests_providers.dart';
import '../../features/interests/presentation/interest_editor_page.dart';
import '../../features/personas/persona_providers.dart';
import '../../features/personas/presentation/persona_editor_page.dart';
import '../../features/personas/presentation/persona_management_page.dart';
import '../../features/personas/presentation/persona_overview_page.dart';
import '../ai_conversation/synthetic_ai_transport.dart';
import '../ai_conversation/synthetic_auth_repository.dart';
import 'offline_social_pages.dart';
import 'offline_social_store.dart';
import 'offline_setup_auth_repository.dart';

/// Explicit offline product preview. Ordinary EnmoriApp/Bootstrap is untouched.
final class OfflineSocialApp extends StatefulWidget {
  const OfflineSocialApp({
    super.key,
    this.store,
    this.accountSetup = false,
    this.setupAuth,
  });
  final OfflineSocialStore? store;
  final bool accountSetup;
  final OfflineSetupAuthRepository? setupAuth;
  @override
  State<OfflineSocialApp> createState() => _OfflineSocialState();
}

final class _OfflineSocialState extends State<OfflineSocialApp> {
  late final OfflineSocialStore store;
  late final AuthRepository auth;
  @override
  void initState() {
    super.initState();
    store =
        widget.store ??
        OfflineSocialStore(onboardingCompleted: !widget.accountSetup);
    auth = widget.accountSetup
        ? widget.setupAuth ?? OfflineSetupAuthRepository()
        : SyntheticAiAuthRepository();
  }

  @override
  void dispose() {
    if (widget.store == null) store.dispose();
    if (auth case final SyntheticAiAuthRepository legacy) {
      unawaited(legacy.dispose());
    } else if (auth case final OfflineSetupAuthRepository setup) {
      if (widget.setupAuth == null) unawaited(setup.dispose());
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      backendBaseUriProvider.overrideWithValue(null),
      externalActivityOpenerProvider.overrideWithValue(
        const PlatformExternalActivityOpener(),
      ),
      isolatedSlicesEnabledProvider.overrideWithValue(true),
      accountRepositoryProvider.overrideWithValue(
        OfflineAccountRepository(store),
      ),
      accountPreferencesRepositoryProvider.overrideWithValue(
        OfflinePreferencesRepository(store),
      ),
      interestRepositoryProvider.overrideWithValue(
        OfflineInterestRepository(store),
      ),
      checkInRepositoryProvider.overrideWithValue(
        OfflineCheckInRepository(store),
      ),
      historyDevicePortProvider.overrideWithValue(const OfflineHistoryDevice()),
      friendRepositoryProvider.overrideWithValue(
        OfflineFriendRepository(store),
      ),
      eventDetailRepositoryProvider.overrideWithValue(
        OfflineEventRepository(store),
      ),
      eventRecommendationRepositoryProvider.overrideWithValue(
        OfflineEventRecommendations(store),
      ),
      personaRepositoryProvider.overrideWithValue(
        OfflinePersonaRepository(store),
      ),
      aiConversationRepositoryProvider.overrideWith((ref) {
        ref.watch(authSessionProvider);
        final transport = SyntheticAiTransport();
        ref.onDispose(transport.close);
        return AiWireRepository(transport);
      }),
      appRouterProvider.overrideWith(
        (ref) => _router(ref, store, auth, accountSetup: widget.accountSetup),
      ),
    ],
    child: _OfflineMaterialApp(accountSetup: widget.accountSetup),
  );
}

GoRouter _router(
  Ref ref,
  OfflineSocialStore store,
  AuthRepository auth, {
  required bool accountSetup,
}) {
  final session = ref.watch(authSessionProvider).asData?.value;
  final refresh = RouterRefreshNotifier(ref);
  bool current() =>
      ref.mounted &&
      session is AuthSessionAuthenticated &&
      identical(ref.read(authSessionProvider).asData?.value, session) &&
      ref.read(routerGateProvider) == RouterGateState.authenticated;
  void back(BuildContext context) {
    if (!context.mounted || !current()) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.home);
    }
  }

  final router = GoRouter(
    initialLocation: accountSetup
        ? (store.onboardingCompleted ? AppRoutes.signIn : AppRoutes.register)
        : AppRoutes.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final gate = ref.read(routerGateProvider);
      if (gate == RouterGateState.resolving) {
        return state.uri.path == '/offline-startup' ? null : '/offline-startup';
      }
      if (accountSetup) {
        if (gate == RouterGateState.unauthenticated ||
            gate == RouterGateState.signInRequired) {
          return state.uri.path == AppRoutes.register ||
                  state.uri.path == AppRoutes.signIn
              ? null
              : AppRoutes.signIn;
        }
        if (gate == RouterGateState.onboardingRequired) {
          return state.uri.path == AppRoutes.onboarding
              ? null
              : AppRoutes.onboarding;
        }
        if (gate != RouterGateState.authenticated) {
          return state.uri.path == '/offline-unavailable'
              ? null
              : '/offline-unavailable';
        }
        if (state.uri.path == AppRoutes.register ||
            state.uri.path == AppRoutes.signIn ||
            state.uri.path == AppRoutes.onboarding ||
            state.uri.path.startsWith('/offline-')) {
          return AppRoutes.home;
        }
        return null;
      }
      if (gate != RouterGateState.authenticated) {
        return state.uri.path == '/offline-entry' ? null : '/offline-entry';
      }
      return state.uri.path.startsWith('/offline-') ? AppRoutes.home : null;
    },
    routes: [
      ...activityRoutes(current: current),
      GoRoute(
        path: '/offline-startup',
        builder: (_, _) =>
            const Scaffold(body: Center(child: CircularProgressIndicator())),
      ),
      GoRoute(
        path: '/offline-entry',
        builder: (_, _) => OfflineEntry(
          onEnter: () {
            if (auth case final SyntheticAiAuthRepository legacy) {
              legacy.replaceSession();
            }
          },
        ),
      ),
      if (accountSetup) ...[
        GoRoute(
          path: AppRoutes.register,
          // The waiting-for-session notice belongs to this entry route. It
          // must not cover the next page's choice/save/logout controls.
          builder: (context, _) => ScaffoldMessenger(
            child: RegistrationPage(
              onSignIn: () => context.go(AppRoutes.signIn),
            ),
          ),
        ),
        GoRoute(
          path: AppRoutes.signIn,
          builder: (context, _) => SignInPage(
            onCreateAccount: () => context.go(AppRoutes.register),
            // Command success cannot grant a session. The gate observes Auth.
            onSucceeded: () {},
          ),
        ),
        GoRoute(
          path: AppRoutes.onboarding,
          builder: (context, _) => OnboardingPage(
            onCompleted: () {
              if (context.mounted && current()) context.go(AppRoutes.home);
            },
          ),
        ),
        GoRoute(
          path: '/offline-unavailable',
          builder: (context, _) => Scaffold(
            appBar: AppBar(title: const Text('Sample account unavailable')),
            body: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const Text(
                  'The sample account could not be read. Retry or sign out.',
                ),
                FilledButton(
                  onPressed: () {
                    if (ref.read(currentAuthSubjectProvider)
                        case final subject?) {
                      ref.invalidate(onboardingStatusProvider(subject));
                    }
                  },
                  child: const Text('Retry'),
                ),
                TextButton(
                  onPressed: auth.signOut,
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ],
      for (final (path, tab) in [
        (AppRoutes.home, 0),
        ('/friends', 1),
        (AppRoutes.profile, 4),
      ])
        GoRoute(
          path: path,
          builder: (_, _) => OfflineSocialHub(store: store, tab: tab),
        ),
      GoRoute(
        path: '/friends/requests',
        builder: (context, _) => FriendPage(
          onOpenMyFriends: () => context.push<void>('/friends/list'),
        ),
      ),
      GoRoute(
        path: '/friends/list',
        builder: (context, _) => MyFriendsListPage(
          onOpenFriend: (username) {
            if (context.mounted &&
                current() &&
                GoRouter.of(context).state.uri.path == '/friends/list') {
              context.push<void>(offlineFriendProfilePath(username));
            }
          },
        ),
      ),
      GoRoute(
        path: '/friends/:username/profile',
        builder: (context, state) => OfflineFriendProfilePage(
          store: store,
          username: state.pathParameters['username'] ?? '',
          onBack: () => back(context),
        ),
      ),
      GoRoute(
        path: AppRoutes.profileEdit,
        builder: (_, _) =>
            const AccountPreferencesPage(view: PreferencesView.profile),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, _) => AccountPreferencesPage(
          view: PreferencesView.settings,
          onEditProfile: () async {
            await context.push<void>(AppRoutes.profileEdit);
          },
          onSignOut: auth.signOut,
        ),
      ),
      GoRoute(
        path: AppRoutes.interests,
        builder: (context, _) =>
            InterestEditorPage(onSaved: (_) => back(context)),
      ),
      GoRoute(
        path: AppRoutes.checkIn,
        builder: (context, _) => CheckInComposerPage(
          socialStyle: true,
          visibility: store.settings.checkInVisibility,
          onReturnHome: () => back(context),
        ),
      ),
      GoRoute(
        path: '/check-in/:checkInId',
        builder: (context, state) => SavedCheckInPage(
          checkInId: state.pathParameters['checkInId']!,
          onReturnHome: () => back(context),
        ),
      ),
      GoRoute(
        path: AppRoutes.checkInHistory,
        builder: (context, _) => history.CheckInHistoryPage(
          onBack: () => back(context),
          onOpenSavedCheckIn: (id) async {
            if (!current()) return;
            await context.push<void>(AppRoutes.savedCheckIn(id));
            if (context.mounted && current()) {
              await ref
                  .read(checkInHistoryControllerProvider.notifier)
                  .reload();
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.eventRecommendations,
        builder: (context, _) => EventRecommendationsPage(
          syntheticPreview: true,
          onOpenEvent: (id) =>
              context.push<void>('/events/${Uri.encodeComponent(id)}'),
        ),
      ),
      GoRoute(
        path: '/events/:eventId',
        builder: (_, state) => EventDetailPage(
          eventId: state.pathParameters['eventId']!,
          syntheticPreview: true,
        ),
      ),
      GoRoute(
        path: AppRoutes.aiAssistant,
        builder: (context, _) => AiConversationPage(
          socialStyle: true,
          navigationBarBuilder: (navigate) => OfflineSocialNavigation(
            selectedIndex: 3,
            onSelected: (index) => navigate(() {
              if (context.mounted && current()) selectSocialTab(context, index);
            }),
          ),
          onBack: () => back(context),
          onOpenSettings: () {
            if (current()) context.push<void>(AppRoutes.settings);
          },
          onOpenPersonas: () {
            if (context.mounted && current()) {
              context.push<void>(AppRoutes.managePersonas);
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.personas,
        builder: (context, _) => PersonaOverviewPage(
          onBack: () => back(context),
          onManage: () => context.push<void>(AppRoutes.managePersonas),
        ),
      ),
      GoRoute(
        path: AppRoutes.managePersonas,
        builder: (context, _) => PersonaManagementPage(
          onBack: () => back(context),
          onCreate: () => context.push<void>(AppRoutes.newPersona),
          onEdit: (id) => context.push<void>(AppRoutes.editPersona(id)),
        ),
      ),
      GoRoute(
        path: AppRoutes.newPersona,
        builder: (context, _) => PersonaEditorPage(onBack: () => back(context)),
      ),
      GoRoute(
        path: '/personas/:personaId/edit',
        builder: (context, state) => PersonaEditorPage(
          personaId: state.pathParameters['personaId']!,
          onBack: () => back(context),
        ),
      ),
    ],
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
}

final class _OfflineMaterialApp extends ConsumerWidget {
  const _OfflineMaterialApp({required this.accountSetup});
  final bool accountSetup;
  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'ENMORI Offline Social',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xfffafaf8),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xff4f46e5),
        surface: const Color(0xfffafaf8),
      ).copyWith(primary: const Color(0xff4f46e5), onPrimary: Colors.white),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xfffafaf8),
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xffe9e9e3)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(13),
          ),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: Color(0xffeeedff),
      ),
    ),
    routerConfig: ref.watch(appRouterProvider),
    builder: (context, child) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: const Color(0xffeeedff),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(
                accountSetup
                    ? 'OFFLINE SAMPLE · use invented email/password · no real account · restart clears changes'
                    : 'OFFLINE INTERNAL · sample data · restart clears changes',
                key: const Key('offline-social-warning'),
                style: Theme.of(context).textTheme.labelSmall
                    ?.copyWith(color: const Color(0xff4c43b8)),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
        Expanded(child: child!),
      ],
    ),
  );
}
