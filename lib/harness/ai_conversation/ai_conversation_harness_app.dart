import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import 'synthetic_ai_transport.dart';
import 'synthetic_auth_repository.dart';

/// Runs the actual feature, controller and wire mapping with synthetic inputs.
/// No Backend URL, Firebase initialization, durable store or model is present.
final class AiConversationHarnessApp extends StatefulWidget {
  const AiConversationHarnessApp({super.key, this.transport, this.auth});

  final SyntheticAiTransport? transport;
  final SyntheticAiAuthRepository? auth;

  @override
  State<AiConversationHarnessApp> createState() => _HarnessState();
}

final class _HarnessState extends State<AiConversationHarnessApp> {
  late final SyntheticAiTransport _transport;
  late final SyntheticAiAuthRepository _auth;
  late final AiWireRepository _repository;
  bool _showConversation = true;
  String? _handoff;

  @override
  void initState() {
    super.initState();
    _transport = widget.transport ?? SyntheticAiTransport();
    _auth = widget.auth ?? SyntheticAiAuthRepository();
    _repository = AiWireRepository(_transport);
  }

  @override
  void dispose() {
    _transport.close();
    unawaited(_auth.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(_auth),
      aiConversationRepositoryProvider.overrideWithValue(_repository),
    ],
    child: MaterialApp(
      title: 'ENMORI synthetic AI client harness',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true),
      home: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              Material(
                color: const Color(0xffffedbc),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Synthetic test transport — no real storage or model',
                        key: Key('ai-harness-banner'),
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      ExpansionTile(
                        key: const Key('ai-harness-controls'),
                        tilePadding: EdgeInsets.zero,
                        title: const Text('Synthetic test controls'),
                        children: [
                          Wrap(
                            spacing: 12,
                            runSpacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              SizedBox(
                                width: 250,
                                child:
                                    DropdownButtonFormField<
                                      SyntheticAiScenario
                                    >(
                                      key: const Key('ai-harness-scenario'),
                                      initialValue: _transport.scenario,
                                      isExpanded: true,
                                      decoration: const InputDecoration(
                                        labelText: 'Next synthetic attempt',
                                      ),
                                      items: [
                                        for (final scenario
                                            in SyntheticAiScenario.values)
                                          DropdownMenuItem(
                                            value: scenario,
                                            child: Text(scenario.label),
                                          ),
                                      ],
                                      onChanged: (value) {
                                        if (value != null) {
                                          setState(
                                            () => _transport.scenario = value,
                                          );
                                        }
                                      },
                                    ),
                              ),
                              OutlinedButton(
                                key: const Key('ai-harness-new-session'),
                                onPressed: _auth.replaceSession,
                                child: const Text(
                                  'Replace synthetic session (same UID)',
                                ),
                              ),
                              OutlinedButton(
                                key: const Key('ai-harness-logout'),
                                onPressed: () => unawaited(_auth.signOut()),
                                child: const Text('Synthetic logout'),
                              ),
                              OutlinedButton(
                                key: const Key('ai-harness-tombstone'),
                                onPressed: () {
                                  _transport.invalidateSyntheticReplies();
                                  setState(
                                    () => _handoff = 'Synthetic replies made unavailable. Use Reload to exercise a new authorized read fixture.',
                                  );
                                },
                                child: const Text(
                                  'Make synthetic replies unavailable',
                                ),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'These controls change fixtures only. They are not product recovery, consent or account actions.',
                            ),
                          ),
                        ],
                      ),
                      if (_handoff case final String text)
                        Text(text, key: const Key('ai-harness-handoff')),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: _showConversation
                    ? Builder(
                        builder: (context) => buildAiConversationPage(
                          context,
                          onBack: () => setState(() {
                            _showConversation = false;
                            _handoff = 'Synthetic Back callback received; Home is not connected.';
                          }),
                          onOpenSettings: () => setState(() {
                            _showConversation = false;
                            _handoff = 'Synthetic Settings callback received; real Settings is not connected.';
                          }),
                        ),
                      )
                    : Center(
                        child: FilledButton(
                          key: const Key('ai-harness-open'),
                          onPressed: () {
                            _auth.replaceSession();
                            setState(() {
                              _showConversation = true;
                              _handoff = null;
                            });
                          },
                          child: const Text('Open a new synthetic session'),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
