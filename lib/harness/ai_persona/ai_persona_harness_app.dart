import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import '../../features/personas/persona_providers.dart';
import '../../features/personas/presentation/persona_editor_page.dart';
import '../../features/personas/presentation/persona_management_page.dart';
import '../ai_conversation/synthetic_ai_transport.dart';
import '../ai_conversation/synthetic_auth_repository.dart';
import 'synthetic_persona_repository.dart';

/// Actual feature pages/controllers with explicit memory-only test adapters.
/// Persona edits do not alter the scripted AI reply or prove its Q19 snapshot.
final class AiPersonaHarnessApp extends StatefulWidget {
  const AiPersonaHarnessApp({
    super.key,
    this.transport,
    this.personas,
    this.auth,
  });

  final SyntheticAiTransport? transport;
  final SyntheticPersonaRepository? personas;
  final SyntheticAiAuthRepository? auth;

  @override
  State<AiPersonaHarnessApp> createState() => _HarnessState();
}

final class _HarnessState extends State<AiPersonaHarnessApp> {
  late final SyntheticAiTransport _transport;
  late final SyntheticPersonaRepository _personas;
  late final SyntheticAiAuthRepository _auth;
  late final AiWireRepository _repository;
  bool _conversationOpen = true;

  @override
  void initState() {
    super.initState();
    _transport = widget.transport ?? SyntheticAiTransport();
    _personas = widget.personas ?? SyntheticPersonaRepository();
    _auth = widget.auth ?? SyntheticAiAuthRepository();
    _repository = AiWireRepository(_transport);
  }

  @override
  void dispose() {
    _transport.close();
    unawaited(_auth.dispose());
    super.dispose();
  }

  void _openPersonas(BuildContext context) {
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
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(_auth),
      aiConversationRepositoryProvider.overrideWithValue(_repository),
      personaRepositoryProvider.overrideWithValue(_personas),
    ],
    child: MaterialApp(
      title: 'ENMORI synthetic AI and Persona journey',
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
                      'Synthetic AI and Persona fixtures — no real storage or model',
                      key: Key('ai-persona-harness-banner'),
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      'Persona controls use memory only. AI replies are scripted; '
                      'this does not prove Persona request snapshots.',
                    ),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        OutlinedButton(
                          key: const Key('ai-persona-replace-session'),
                          onPressed: _auth.replaceSession,
                          child: const Text(
                            'Replace synthetic session (same UID)',
                          ),
                        ),
                        OutlinedButton(
                          key: const Key('ai-persona-logout'),
                          onPressed: () => unawaited(_auth.signOut()),
                          child: const Text('Synthetic logout'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(child: child!),
        ],
      ),
      home: Builder(
        builder: (context) => _conversationOpen
            ? buildAiConversationPage(
                context,
                onBack: () => setState(() => _conversationOpen = false),
                onOpenPersonas: () => _openPersonas(context),
                onOpenSettings: () {
                  unawaited(
                    Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(
                            title: const Text('Synthetic Settings handoff'),
                          ),
                          body: const Center(
                            child: Text(
                              'The real Settings destination is owned by LI.',
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              )
            : Scaffold(
                body: Center(
                  child: FilledButton(
                    key: const Key('ai-persona-reopen'),
                    onPressed: () => setState(() => _conversationOpen = true),
                    child: const Text('Return to this synthetic Conversation'),
                  ),
                ),
              ),
      ),
    ),
  );
}
