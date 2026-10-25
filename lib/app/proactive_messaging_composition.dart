import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/result/result.dart';
import '../features/ai_conversation/domain/ai_conversation.dart';
import '../features/ai_conversation/domain/ai_conversation_repository.dart';
import '../features/ai_conversation/domain/ai_owned_sources.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/proactive/domain/proactive_messaging.dart';
import '../features/proactive/proactive_notification_controller.dart';
import 'providers.dart';
import 'router/app_router.dart';
import 'router/companion_navigation.dart';

bool validCompanionInstallationRef(String value) => RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
).hasMatch(value);

/// Uses the existing strict owner resolver. A notification contributes only
/// an opaque reference; no text, read acknowledgement or generation is added.
ProactiveDeliveryResolver companionDeliveryResolver(
  AiOwnedSourcesRepository repository,
) => ({required token, required deliveryRef, required abort}) async {
  if (abort.isAborted) {
    return const Failure(
      AppFailure(
        kind: AppFailureKind.aiUnavailable,
        message: 'The notification target could not be verified.',
      ),
    );
  }
  final signal = AiAbortSignal();
  unawaited(abort.whenAborted.then((_) => signal.abort()));
  try {
    final result = await repository.resolveDelivery(
      token: token,
      abort: signal,
      deliveryRef: deliveryRef,
    );
    if (abort.isAborted) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.aiUnavailable,
          message: 'The notification target could not be verified.',
        ),
      );
    }
    return switch (result) {
      Success<AiMessageAnchor>(:final value) => Success(
        ProactiveMessageTarget(
          conversationId: value.locator.conversationId,
          messageId: value.locator.messageId,
        ),
      ),
      Failure<AiMessageAnchor>(:final failure) => Failure(failure),
    };
  } finally {
    signal.abort();
  }
};

void openCompanionMessage(
  Ref ref,
  AuthSessionAuthenticated session,
  ProactiveMessageTarget target,
) {
  if (!ref.mounted ||
      !ref.read(companionFirstFlowEnabledProvider) ||
      !identical(ref.read(authSessionProvider).asData?.value, session) ||
      ref.read(routerGateProvider) != RouterGateState.authenticated) {
    return;
  }
  ref
      .read(appRouterProvider)
      .push<void>(
        AppRoutes.aiMessage,
        extra: AiMessageNavigation(
          session: session,
          locator: AiMessageLocator(
            conversationId: target.conversationId,
            messageId: target.messageId,
          ),
        ),
      );
}

/// Mounted inside the app's lifecycle boundary. An unconfigured candidate has
/// no notification listener, SDK initialization or registration side effect.
final class CompanionNotificationBoundary extends ConsumerWidget {
  const CompanionNotificationBoundary({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final installation = ref.watch(proactiveMessagingInstallationRefProvider);
    if (ref.watch(companionFirstFlowEnabledProvider) &&
        ref.watch(proactiveMessagingEnabledProvider) &&
        installation != null &&
        validCompanionInstallationRef(installation) &&
        ref.watch(proactiveMessagingPortProvider) != null) {
      ref.watch(proactiveNotificationControllerProvider);
    }
    return child;
  }
}
