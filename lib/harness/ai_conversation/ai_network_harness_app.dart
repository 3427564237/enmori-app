import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/data/http_ai_wire_transport.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/auth/domain/auth_repository.dart';

/// Explicit isolated composition. The launcher supplies an observed Auth source
/// and owns its client; this widget never creates a session, token or fixture.
/// Navigation callbacks and any Persona dependencies belong to the caller.
final class AiNetworkHarnessApp extends StatefulWidget {
  const AiNetworkHarnessApp({
    required this.baseUri,
    required this.auth,
    required this.client,
    required this.environmentLabel,
    required this.onOpenSettings,
    this.onOpenPersonas,
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
    super.key,
  }) : _isolatedLoopback = true;

  final Uri baseUri;
  final AuthRepository auth;
  final http.Client client;
  final String environmentLabel;
  final VoidCallback onOpenSettings;
  final VoidCallback? onOpenPersonas;
  final bool _isolatedLoopback;

  @override
  State<AiNetworkHarnessApp> createState() => _AiNetworkHarnessAppState();
}

final class _AiNetworkHarnessAppState extends State<AiNetworkHarnessApp> {
  late AiWireRepository _repository;

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
  }

  @override
  Widget build(BuildContext context) {
    if (widget.environmentLabel.trim().isEmpty) {
      throw ArgumentError('Declare the selected isolated environment.');
    }
    return ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(widget.auth),
        aiConversationRepositoryProvider.overrideWithValue(_repository),
      ],
      child: MaterialApp(
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
        ),
      ),
    );
  }
}

final class _NetworkConversation extends StatefulWidget {
  const _NetworkConversation({
    required this.onOpenSettings,
    this.onOpenPersonas,
  });

  final VoidCallback onOpenSettings;
  final VoidCallback? onOpenPersonas;

  @override
  State<_NetworkConversation> createState() => _NetworkConversationState();
}

final class _NetworkConversationState extends State<_NetworkConversation> {
  bool _open = true;

  @override
  Widget build(BuildContext context) => _open
      ? AiConversationPage(
          socialStyle: true,
          onBack: () => setState(() => _open = false),
          onOpenSettings: widget.onOpenSettings,
          onOpenPersonas: widget.onOpenPersonas,
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
