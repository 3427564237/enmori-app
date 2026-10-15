import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../core/network/backend_api_client.dart';
import '../../features/account/account_preferences_providers.dart';
import '../../features/account/domain/account_preferences_repository.dart';
import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/data/http_ai_wire_transport.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/event_browse/domain/activity_repository.dart';
import '../../features/event_browse/event_browse_providers.dart';
import '../../features/personas/data/backend_persona_repository.dart';
import '../../features/personas/persona_providers.dart';
import '../../features/personas/presentation/persona_editor_page.dart';
import '../../features/personas/presentation/persona_management_page.dart';

/// Explicit isolated composition. The launcher supplies an observed Auth source
/// and owns its client; this widget never creates a session, token or fixture.
/// AI and Persona use the same injected Backend, Auth and caller-owned client.
/// The optional Persona callback overrides the isolated management navigation.
/// Persona retains BackendApiClient's HTTPS requirement, including when AI's
/// host-only HTTP loopback option is selected; no transport exception is added.
final class AiNetworkHarnessApp extends StatefulWidget {
  const AiNetworkHarnessApp({
    required this.baseUri,
    required this.auth,
    required this.client,
    required this.environmentLabel,
    required this.onOpenSettings,
    this.onOpenPersonas,
    this.navigatorKey,
    this.accountPreferencesRepository,
    this.activityRepository,
    this.activityOpener,
    this.onOpenActivities,
    super.key,
  }) : _isolatedLoopback = false;

  /// Host-only loopback is explicit. An Android alias is never inferred.
  const AiNetworkHarnessApp.isolatedLoopback({
    required this.baseUri,
    required this.auth,
    required this.client,
    required this.environmentLabel,
    required this.onOpenSettings,
    this.onOpenPersonas,
    this.navigatorKey,
    this.accountPreferencesRepository,
    this.activityRepository,
    this.activityOpener,
    this.onOpenActivities,
    super.key,
  }) : _isolatedLoopback = true;

  final Uri baseUri;
  final AuthRepository auth;
  final http.Client client;
  final String environmentLabel;
  final VoidCallback onOpenSettings;
  final VoidCallback? onOpenPersonas;
  final GlobalKey<NavigatorState>? navigatorKey;
  final AccountPreferencesRepository? accountPreferencesRepository;
  final ActivityRepository? activityRepository;
  final ExternalActivityOpener? activityOpener;
  final VoidCallback? onOpenActivities;
  final bool _isolatedLoopback;

  @override
  State<AiNetworkHarnessApp> createState() => _AiNetworkHarnessAppState();
}

final class _AiNetworkHarnessAppState extends State<AiNetworkHarnessApp> {
  late AiWireRepository _repository;
  late BackendPersonaRepository _personas;

  @override
  void initState() {
    super.initState();
    _compose();
  }

  @override
  void didUpdateWidget(AiNetworkHarnessApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.baseUri != oldWidget.baseUri ||
        widget.auth != oldWidget.auth ||
        widget.client != oldWidget.client ||
        widget._isolatedLoopback != oldWidget._isolatedLoopback) {
      _compose();
    }
  }

  void _compose() {
    final transport = widget._isolatedLoopback
        ? HttpAiWireTransport.isolatedLoopback(
            baseUri: widget.baseUri,
            client: widget.client,
          )
        : HttpAiWireTransport(baseUri: widget.baseUri, client: widget.client);
    _repository = AiWireRepository(transport);
    _personas = BackendPersonaRepository(
      BackendApiClient(
        widget.baseUri,
        widget.auth.getIdToken,
        httpClient: widget.client,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.environmentLabel.trim().isEmpty) {
      throw ArgumentError('Declare the selected isolated environment.');
    }
    return ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(widget.auth),
        if (widget.accountPreferencesRepository case final repository?)
          accountPreferencesRepositoryProvider.overrideWithValue(repository),
        aiConversationRepositoryProvider.overrideWithValue(_repository),
        personaRepositoryProvider.overrideWithValue(_personas),
        if (widget.activityRepository case final repository?)
          activityRepositoryProvider.overrideWithValue(repository),
        if (widget.activityOpener case final opener?)
          externalActivityOpenerProvider.overrideWithValue(opener),
      ],
      child: MaterialApp(
        navigatorKey: widget.navigatorKey,
        title: 'ENMORI controlled HTTP AI journey',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(useMaterial3: true),
        builder: (context, child) => Column(
          children: [
            Material(
              color: const Color(0xffffedbc),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Controlled HTTP AI journey',
                        key: Key('ai-network-harness-banner'),
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.environmentLabel),
                      const Text(
                        'Synthetic account and input only. Storage, Note, model '
                        'and cleanup evidence belong to the selected Backend.',
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(child: child!),
          ],
        ),
        home: _NetworkConversation(
          onOpenSettings: widget.onOpenSettings,
          onOpenPersonas: widget.onOpenPersonas,
          onOpenActivities: widget.onOpenActivities,
        ),
      ),
    );
  }
}

final class _NetworkConversation extends StatefulWidget {
  const _NetworkConversation({
    required this.onOpenSettings,
    this.onOpenPersonas,
    this.onOpenActivities,
  });

  final VoidCallback onOpenSettings;
  final VoidCallback? onOpenPersonas;
  final VoidCallback? onOpenActivities;

  @override
  State<_NetworkConversation> createState() => _NetworkConversationState();
}

final class _NetworkConversationState extends State<_NetworkConversation> {
  bool _open = true;

  void _openPersonas() {
    final navigator = Navigator.of(context);
    unawaited(
      navigator.push<void>(
        MaterialPageRoute(
          builder: (_) => PersonaManagementPage(
            onBack: navigator.pop,
            onCreate: () => _openEditor(navigator),
            onEdit: (id) => _openEditor(navigator, id: id),
          ),
        ),
      ),
    );
  }

  void _openEditor(NavigatorState navigator, {String? id}) {
    unawaited(
      navigator.push<void>(
        MaterialPageRoute(
          builder: (_) =>
              PersonaEditorPage(personaId: id, onBack: navigator.pop),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => _open
      ? AiConversationPage(
          socialStyle: true,
          onBack: () => setState(() => _open = false),
          onOpenSettings: widget.onOpenSettings,
          onOpenPersonas: widget.onOpenPersonas ?? _openPersonas,
          navigationBarBuilder: widget.onOpenActivities == null
              ? null
              : (navigate) => Consumer(
                  builder: (context, ref, _) =>
                      ref.watch(authSessionProvider).value
                          is AuthSessionAuthenticated
                      ? SafeArea(
                          child: TextButton.icon(
                            key: const Key('controlled-browse-activities'),
                            onPressed: () => navigate(widget.onOpenActivities!),
                            icon: const Icon(Icons.event_outlined),
                            label: const Text('Browse activities'),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
        )
      : Scaffold(
          body: Center(
            child: FilledButton(
              key: const Key('ai-network-reopen'),
              onPressed: () => setState(() => _open = true),
              child: const Text('Return to this controlled Conversation'),
            ),
          ),
        );
}
