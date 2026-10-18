import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
import '../features/interests/data/backend_interest_repository.dart';
import '../features/ai_conversation/ai_conversation_providers.dart';
import '../features/ai_conversation/data/ai_wire_repository.dart';
import '../features/ai_conversation/data/http_ai_wire_transport.dart';
import '../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../features/personas/persona_providers.dart';
import '../features/personas/data/backend_persona_repository.dart';
import '../features/personas/presentation/persona_overview_page.dart';
import '../features/personas/presentation/persona_management_page.dart';
import '../features/personas/presentation/persona_editor_page.dart';
import '../features/event_browse/event_browse_providers.dart';
import '../features/event_recommendations/event_recommendations_providers.dart';
import '../features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'platform/external_activity_opener.dart';
import 'providers.dart';
import 'social_demo_presentation.dart';
import 'router/app_router.dart';
import 'router/activity_routes.dart';
import 'router/isolated_history_ai_pages.dart';
import 'router/isolated_persona_pages.dart';

/// One caller-owned HTTPS/Auth connection. No credentials, local product store,
/// fake Repository or ordinary bootstrap enablement is supplied by this root.
final class ControlledDemoApp extends StatefulWidget {
  const ControlledDemoApp({
    required this.baseUri,
    required this.auth,
    required this.client,
    required this.onClose,
    this.dualAccounts = false,
    super.key,
  });
  final bool dualAccounts;
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
  }

  @override
  Widget build(BuildContext context) => ProviderScope(
    key: ObjectKey(_api),
    overrides: [
      authRepositoryProvider.overrideWithValue(widget.auth),
      backendBaseUriProvider.overrideWithValue(widget.baseUri),
      backendApiClientProvider.overrideWithValue(_api),
      isolatedSlicesEnabledProvider.overrideWithValue(true),
      socialDemoPresentationProvider.overrideWithValue(true),
      activityBrowseEnabledProvider.overrideWithValue(true),
      externalActivityOpenerProvider.overrideWithValue(
        const PlatformExternalActivityOpener(),
      ),
      accountRepositoryProvider.overrideWithValue(
        BackendAccountRepository(_api),
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
      checkInRepositoryProvider.overrideWithValue(
        BackendCheckInRepository(_api),
      ),
      personaRepositoryProvider.overrideWithValue(
        BackendPersonaRepository(_api),
      ),
      aiConversationRepositoryProvider.overrideWithValue(_ai),
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
          build: (context, {required onBack, required onOpenSettings}) {
            final session = ProviderScope.containerOf(
              context,
              listen: false,
            ).read(authSessionProvider).value;
            return AiConversationPage(
              socialStyle: true,
              navigationBarBuilder: (navigate) => SocialDemoNavigation(
                selectedIndex: 3,
                onSelected: (index) => navigate(() {
                  if (context.mounted) {
                    selectConnectedSocialTab(
                      context,
                      index,
                      session: session,
                      sourcePath: AppRoutes.aiAssistant,
                    );
                  }
                }),
              ),
              onBack: onBack,
              onOpenSettings: onOpenSettings,
              onOpenPersonas: () {
                if (context.mounted) context.push<void>(AppRoutes.personas);
              },
            );
          },
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
    // Registration/new identities are not authorized by this owned fixture.
    if (!dualAccounts &&
        ref.watch(authSessionProvider).value is! AuthSessionAuthenticated) {
      return MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Waiting for the controlled account. No public registration.',
                  ),
                  TextButton(
                    onPressed: () async {
                      await onClose();
                    },
                    child: const Text('Close connection'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return MaterialApp.router(
      title: 'ENMORI controlled demo',
      debugShowCheckedModeBanner: false,
      theme: socialDemoTheme(),
      routerConfig: ref.watch(appRouterProvider),
      builder: (context, child) => Column(
        children: [
          Material(
            color: const Color(0xffffedbc),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Text(
                  dualAccounts
                      ? 'Controlled demo • two test accounts; data clears when the host stops. '
                            'Activity and recommendations use Ticketmaster when enabled by the host. '
                            'External links open the organiser website.'
                      : 'Test account • data clears when the host stops. '
                            'AI uses only eligible Check-in Notes from this test account. Music and Friends are fixtures; '
                            'Activity needs host permission. Recommendations and participation are unavailable.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          ),
          Expanded(child: child!),
        ],
      ),
    );
  }
}
