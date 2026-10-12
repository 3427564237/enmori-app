import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/providers.dart';
import '../../app/router/isolated_history_ai_pages.dart';
import '../../core/result/result.dart';
import '../../features/account/account_providers.dart';
import '../../features/account/domain/account_repository.dart';
import '../../features/ai_conversation/ai_conversation_providers.dart';
import '../../features/ai_conversation/data/ai_wire_repository.dart';
import '../../features/ai_conversation/presentation/ai_conversation_page.dart';
import '../../features/auth/auth_providers.dart';
import 'synthetic_ai_transport.dart';
import 'synthetic_auth_repository.dart';

/// Explicit synthetic entry for real Home/router and the accepted AI client.
/// No Bootstrap, Firebase initialization, Backend URL or real storage is used.
final class AiHomeRouterHarnessApp extends StatefulWidget {
  const AiHomeRouterHarnessApp({super.key, this.auth, this.transport});

  final SyntheticAiAuthRepository? auth;
  final SyntheticAiTransport? transport;

  @override
  State<AiHomeRouterHarnessApp> createState() => _HarnessState();
}

final class _HarnessState extends State<AiHomeRouterHarnessApp> {
  late final SyntheticAiAuthRepository _auth;
  late final SyntheticAiTransport _transport;
  late final AiWireRepository _repository;

  @override
  void initState() {
    super.initState();
    _auth = widget.auth ?? SyntheticAiAuthRepository();
    _transport = widget.transport ?? SyntheticAiTransport();
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
      // Explicitly ignore any ambient real Backend URL even for other routes.
      backendBaseUriProvider.overrideWithValue(null),
      isolatedSlicesEnabledProvider.overrideWithValue(true),
      onboardingStatusProvider.overrideWith(
        (ref, subject) async => Success(
          OnboardingCompleted(
            ProductAccount(
              username: 'synthetic-ai-owner',
              optionalProcessingConsent: OptionalProcessingConsent.rejected,
              checkInVisibility: CheckInVisibility.private,
              onboardingCompletedAt: DateTime.utc(2026, 10, 12),
            ),
          ),
        ),
      ),
      aiConversationRepositoryProvider.overrideWithValue(_repository),
      isolatedAiConversationPageProvider.overrideWithValue(
        const IsolatedAiConversationPage(build: buildAiConversationPage),
      ),
      // History remains independently absent until DU supplies its real page.
    ],
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: [
          Material(
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  children: [
                    const Text(
                      'Synthetic test transport — no real storage or model',
                      key: Key('ai-home-synthetic-warning'),
                    ),
                    Wrap(
                      children: [
                        TextButton(
                          key: const Key('ai-home-new-session'),
                          onPressed: _auth.replaceSession,
                          child: const Text('Replace synthetic session'),
                        ),
                        TextButton(
                          key: const Key('ai-home-logout'),
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
          const Expanded(child: EnmoriApp()),
        ],
      ),
    ),
  );
}
