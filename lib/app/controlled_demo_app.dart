import '../features/account/own_avatar_providers.dart';
import '../features/account/data/backend_own_avatar_repository.dart';
import '../features/account/content_access.dart';
import '../features/ai_conversation/ai_selected_sources_providers.dart';
import 'ai_persona_context.dart';
import '../features/event_participation/data/backend_participation_repository.dart';
import '../features/event_participation/participation_providers.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import '../core/presentation/enmori_motion.dart';
import '../core/presentation/enmori_localizations.dart';
import '../features/language/language_providers.dart';

import 'package:http/http.dart' as http;

import '../core/network/backend_api_client.dart';
import '../core/result/result.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/account/account_providers.dart';
import '../features/account/account_preferences_providers.dart';
import '../features/account/data/backend_account_repository.dart';
import '../features/account/data/backend_account_preferences_repository.dart';
import '../features/check_in/check_in_providers.dart';
import '../features/check_in/data/backend_check_in_repository.dart';
import '../features/check_in/presentation/check_in_history_page.dart';
import '../features/interests/interests_providers.dart';
import '../features/interests/admin_interest_providers.dart';
import '../features/interests/data/backend_admin_interest_repository.dart';
import '../features/interests/data/backend_interest_repository.dart';
import '../features/ai_conversation/ai_conversation_providers.dart';
import '../features/ai_conversation/data/ai_wire_repository.dart';
import '../features/ai_conversation/data/http_ai_wire_transport.dart';
import '../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../features/ai_conversation/presentation/ai_consent_gate.dart';
import '../features/personas/persona_providers.dart';
import '../features/personas/data/backend_persona_repository.dart';
import '../features/personas/data/backend_persona_preview_repository.dart';
import '../features/personas/persona_preview_providers.dart';
import '../features/personas/presentation/persona_overview_page.dart';
import '../features/personas/presentation/persona_management_page.dart';
import '../features/personas/presentation/persona_editor_page.dart';
import '../features/event_browse/event_browse_providers.dart';
import '../features/event_detail/event_detail_providers.dart';
import '../features/event_recommendations/event_recommendations_providers.dart';
import '../features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'platform/external_activity_opener.dart';
import 'providers.dart';
import 'persona_preview_composition.dart';
import 'social_demo_presentation.dart';
import 'router/app_router.dart';
import 'router/activity_routes.dart';
import 'router/isolated_history_ai_pages.dart';
import 'router/isolated_persona_pages.dart';
import 'router/companion_navigation.dart';
import '../features/proactive/data/http_proactive_repository.dart';
import '../features/proactive/proactive_providers.dart';
import '../features/proactive/domain/proactive_messaging.dart';
import '../features/proactive/data/http_proactive_registration_repository.dart';
import '../features/proactive/proactive_notification_controller.dart';
import 'proactive_messaging_composition.dart';

/// One caller-owned HTTPS/Auth connection. No credentials, local product store,
/// fake Repository or ordinary bootstrap enablement is supplied by this root.
final class ControlledDemoApp extends StatefulWidget {
  const ControlledDemoApp({
    required this.baseUri,
    required this.auth,
    required this.client,
    required this.onClose,
    this.dualAccounts = false,
    this.eventParticipationEnabled = false,
    this.remoteGroupEnabled = false,
    this.companionFirstFlowEnabled = false,
    this.companionInstallationRef,
    this.companionMessagingPort,
    super.key,
  });
  final bool dualAccounts;
  final bool eventParticipationEnabled;
  final bool remoteGroupEnabled;
  final bool companionFirstFlowEnabled;
  final String? companionInstallationRef;
  final ProactiveMessagingPort? companionMessagingPort;
  final Uri baseUri;
  final AuthRepository auth;
  final http.Client client;
  final Future<Result<void>> Function() onClose;
  @override
  State<ControlledDemoApp> createState() => _ControlledDemoAppState();
}

final class _ControlledDemoAppState extends State<ControlledDemoApp> {
  late BackendApiClient _api;
  late AiWireRepository _ai;
  late BackendPersonaPreviewRepository _personaPreview;
  @override
  void initState() {
    super.initState();
    _compose();
  }

  @override
  void didUpdateWidget(ControlledDemoApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.baseUri != oldWidget.baseUri ||
        widget.auth != oldWidget.auth ||
        widget.client != oldWidget.client) {
      _compose();
    }
  }

  void _compose() {
    _api = BackendApiClient(
      widget.baseUri,
      widget.auth.getIdToken,
      httpClient: widget.client,
    );
    _ai = AiWireRepository(
      HttpAiWireTransport(baseUri: widget.baseUri, client: widget.client),
    );
    _personaPreview = BackendPersonaPreviewRepository(
      baseUri: widget.baseUri,
      tokenProvider: widget.auth.getIdToken,
      client: widget.client,
    );
  }

  Widget _buildAiPage(
    BuildContext context, {
    required String sourcePath,
    required VoidCallback onBack,
    required VoidCallback onOpenSettings,
    AiMessageLocator? initialMessage,
    String? initialCheckInId,
  }) {
    final session = ProviderScope.containerOf(
      context,
      listen: false,
    ).read(authSessionProvider).value;
    bool canOpenCompanion() {
      if (!context.mounted ||
          !widget.companionFirstFlowEnabled ||
          session is! AuthSessionAuthenticated) {
        return false;
      }
      final scope = ProviderScope.containerOf(context, listen: false);
      return identical(
            scope.read(authSessionProvider).asData?.value,
            session,
          ) &&
          scope.read(routerGateProvider) == RouterGateState.authenticated &&
          GoRouter.of(context).state.uri.path == sourcePath &&
          ModalRoute.of(context)?.isCurrent == true;
    }

    void selectTab(int index) {
      if (context.mounted) {
        selectConnectedSocialTab(
          context,
          index,
          session: session,
          sourcePath: sourcePath,
        );
      }
    }

    return AiConsentGate(
      onOpenSettings: onOpenSettings,
      navigationBar: SocialDemoNavigation(
        selectedIndex: 3,
        onSelected: selectTab,
      ),
      child: AiConversationPage(
        initialMessage: initialMessage,
        initialCheckInId: initialCheckInId,
        initialCheckInSessionKey: initialCheckInId == null
            ? null
            : ProviderScope.containerOf(
                context,
                listen: false,
              ).read(aiConversationControllerProvider).sessionKey,
        onOpenSourceTarget: widget.companionFirstFlowEnabled
            ? (target) {
                if (!canOpenCompanion()) return;
                if (target case AiCheckInTarget(:final checkInId)) {
                  context.push<void>(AppRoutes.savedCheckIn(checkInId));
                }
              }
            : null,
        personaContext: const AiPersonaContext(),
        socialStyle: true,
        navigationBarBuilder: (navigate) => SocialDemoNavigation(
          selectedIndex: 3,
          onSelected: (index) => navigate(() {
            if (context.mounted) {
              selectConnectedSocialTab(
                context,
                index,
                session: session,
                sourcePath: sourcePath,
              );
            }
          }),
        ),
        onBack: onBack,
        onOpenSettings: onOpenSettings,
        onFollowUpRequested: widget.companionFirstFlowEnabled
            ? (source) {
                if (!canOpenCompanion() ||
                    session is! AuthSessionAuthenticated) {
                  return;
                }
                context.push<void>(
                  AppRoutes.newAiFollowUp,
                  extra: FollowUpNavigation(session: session, source: source),
                );
              }
            : null,
        onOpenFollowUps: widget.companionFirstFlowEnabled
            ? () {
                if (canOpenCompanion()) {
                  context.push<void>(AppRoutes.aiFollowUps);
                }
              }
            : null,
        onOpenPersonas: () {
          if (context.mounted) context.push<void>(AppRoutes.personas);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) => ProviderScope(
    key: ObjectKey(_api),
    overrides: [
      authRepositoryProvider.overrideWithValue(widget.auth),
      backendBaseUriProvider.overrideWithValue(widget.baseUri),
      backendApiClientProvider.overrideWithValue(_api),
      isolatedSlicesEnabledProvider.overrideWithValue(
        !widget.remoteGroupEnabled,
      ),
      remoteGroupFeaturesEnabledProvider.overrideWithValue(
        widget.remoteGroupEnabled,
      ),
      socialDemoPresentationProvider.overrideWithValue(true),
      activityBrowseEnabledProvider.overrideWithValue(true),
      eventParticipationEnabledProvider.overrideWithValue(
        widget.eventParticipationEnabled,
      ),
      if (widget.eventParticipationEnabled)
        participationRepositoryProvider.overrideWithValue(
          BackendParticipationRepository(_api),
        ),
      if (widget.dualAccounts)
        eventDetailSourceActionsProvider.overrideWith(
          (ref) => ref.watch(activitySourceActionsProvider),
        ),
      externalActivityOpenerProvider.overrideWithValue(
        const PlatformExternalActivityOpener(),
      ),
      accountRepositoryProvider.overrideWithValue(
        BackendAccountRepository(_api),
      ),
      ownAvatarRepositoryProvider.overrideWithValue(
        BackendOwnAvatarRepository(_api),
      ),
      accountPreferencesRepositoryProvider.overrideWithValue(
        BackendAccountPreferencesRepository(_api),
      ),
      if (widget.dualAccounts)
        eventRecommendationRepositoryProvider.overrideWithValue(
          BackendEventRecommendationRepository(_api),
        ),
      interestRepositoryProvider.overrideWithValue(
        BackendInterestRepository(_api),
      ),
      adminInterestRepositoryProvider.overrideWithValue(
        BackendAdminInterestRepository(_api),
      ),
      checkInRepositoryProvider.overrideWithValue(
        BackendCheckInRepository(_api),
      ),
      personaRepositoryProvider.overrideWithValue(
        BackendPersonaRepository(_api),
      ),
      personaPreviewRepositoryProvider.overrideWithValue(_personaPreview),
      personaPreviewAccessProvider.overrideWith(
        (ref) => ref.watch(connectedPersonaPreviewAccessProvider),
      ),
      aiConversationRepositoryProvider.overrideWithValue(_ai),
      aiCompanionReferencesEnabledProvider.overrideWithValue(
        widget.companionFirstFlowEnabled,
      ),
      aiTodayReferencesEnabledProvider.overrideWithValue(
        widget.companionFirstFlowEnabled,
      ),
      aiTodayTimeZoneProvider.overrideWith(
        (ref) => ref.watch(followUpTimePortProvider).currentIanaZone,
      ),
      if (widget.companionFirstFlowEnabled)
        companionCheckInPageProvider.overrideWithValue(
          CompanionCheckInPage(
            build:
                (
                  context, {
                  required checkInId,
                  required onBack,
                  required onOpenSettings,
                }) => _buildAiPage(
                  context,
                  sourcePath: AppRoutes.aiCheckIn,
                  onBack: onBack,
                  onOpenSettings: onOpenSettings,
                  initialCheckInId: checkInId,
                ),
          ),
        ),
      if (widget.companionFirstFlowEnabled)
        companionMessagePageProvider.overrideWithValue(
          CompanionMessagePage(
            build:
                (
                  context, {
                  required locator,
                  required onBack,
                  required onOpenSettings,
                }) => _buildAiPage(
                  context,
                  sourcePath: AppRoutes.aiMessage,
                  onBack: onBack,
                  onOpenSettings: onOpenSettings,
                  initialMessage: locator,
                ),
          ),
        ),
      companionFirstFlowEnabledProvider.overrideWithValue(
        widget.companionFirstFlowEnabled,
      ),
      if (widget.companionFirstFlowEnabled)
        proactiveRepositoryProvider.overrideWithValue(
          HttpProactiveRepository(
            baseUri: widget.baseUri,
            client: widget.client,
          ),
        ),
      proactiveMessagingEnabledProvider.overrideWithValue(
        widget.companionFirstFlowEnabled,
      ),
      if (widget.companionFirstFlowEnabled) ...[
        proactiveMessagingInstallationRefProvider.overrideWithValue(
          widget.companionInstallationRef,
        ),
        proactiveMessagingPortProvider.overrideWithValue(
          widget.companionMessagingPort,
        ),
        proactiveRegistrationRepositoryProvider.overrideWithValue(
          HttpProactiveRegistrationRepository(
            baseUri: widget.baseUri,
            client: widget.client,
          ),
        ),
        proactiveDeliveryResolverProvider.overrideWithValue(
          companionDeliveryResolver(_ai),
        ),
        proactiveMessageTargetHandlerProvider.overrideWith(
          (ref) =>
              (session, target) => openCompanionMessage(ref, session, target),
        ),
      ],
      isolatedHistoryPageProvider.overrideWithValue(
        IsolatedHistoryPage(
          build: (context, {required onBack, required onOpenSavedCheckIn}) =>
              buildCheckInHistoryPage(
                context: context,
                onBack: onBack,
                onOpenSavedCheckIn: onOpenSavedCheckIn,
              ),
        ),
      ),
      isolatedAiConversationPageProvider.overrideWithValue(
        IsolatedAiConversationPage(
          build: (context, {required onBack, required onOpenSettings}) =>
              _buildAiPage(
                context,
                sourcePath: AppRoutes.aiAssistant,
                onBack: onBack,
                onOpenSettings: onOpenSettings,
              ),
        ),
      ),
      isolatedPersonaPagesProvider.overrideWithValue(
        IsolatedPersonaPages(
          overview: (context, {required onManage, required onBack}) =>
              PersonaOverviewPage(onManage: onManage, onBack: onBack),
          management:
              (
                context, {
                required onCreate,
                required onEdit,
                required onBack,
              }) => PersonaManagementPage(
                onCreate: onCreate,
                onEdit: onEdit,
                onBack: onBack,
              ),
          create: (context, {required onBack}) =>
              PersonaEditorPage(onBack: onBack),
          edit: (context, {required personaId, required onBack}) =>
              PersonaEditorPage(personaId: personaId, onBack: onBack),
        ),
      ),
    ],
    child: _ConnectedPages(
      onClose: widget.onClose,
      dualAccounts: widget.dualAccounts,
    ),
  );
}

final class _ConnectedPages extends ConsumerWidget {
  const _ConnectedPages({required this.onClose, required this.dualAccounts});
  final bool dualAccounts;
  final Future<Result<void>> Function() onClose;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Locale(ref.watch(appLanguageProvider).language.code);
    // Registration/new identities are not authorized by this owned fixture.
    if (!dualAccounts &&
        ref.watch(authSessionProvider).value is! AuthSessionAuthenticated) {
      return MaterialApp(
        locale: locale,
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: Builder(
          builder: (context) => Scaffold(
            body: SafeArea(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      context.tr(
                        'Waiting for the controlled account. No public registration.',
                        '正在等待受控账号，此入口不提供公开注册。',
                      ),
                    ),
                    TextButton(
                      onPressed: () async {
                        await onClose();
                      },
                      child: Text(context.tr('Close connection', '关闭连接')),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    return MaterialApp.router(
      title: 'ENMORI',
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      debugShowCheckedModeBanner: false,
      theme: socialDemoTheme(),
      builder: (context, child) => ContentAccessBoundary(
        child: CompanionNotificationBoundary(
          child: EnmoriMotionPreferences(child: child!),
        ),
      ),
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
